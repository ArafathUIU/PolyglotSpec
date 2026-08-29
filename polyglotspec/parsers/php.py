import os
import re

class LaravelFormRequestParser:
    """Statically parses Laravel FormRequest validation rules from PHP source code."""

    def __init__(self):
        self.rules = {}

    def parse_file(self, filepath: str) -> dict:
        """Reads a PHP file and parses FormRequest rules."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            code = f.read()
        return self.parse(code)

    def tokenize_php(self, code: str) -> list[str]:
        """Tokenize PHP source code into a list of string tokens."""
        token_specification = [
            ('STRING', r'\'[^\'\\]*(?:\\.[^\'\\]*)*\'|"[^"\\]*(?:\\.[^"\\]*)*"'),
            ('ARROW', r'=>'),
            ('BRACKET', r'[\[\]\{\}\(\)]'),
            ('COMMA_SEMI', r'[,;]'),
            ('WORD', r'[a-zA-Z_\x80-\xff][a-zA-Z0-9_\x80-\xff]*'),
            ('SKIP', r'[ \t\n\r\f]+|//.*|/\*[\s\S]*?\*/'),
            ('MISC', r'.'),
        ]
        tok_regex = '|'.join('(?P<%s>%s)' % pair for pair in token_specification)
        tokens = []
        for mo in re.finditer(tok_regex, code):
            kind = mo.lastgroup
            value = mo.group()
            if kind == 'SKIP':
                continue
            tokens.append(value)
        return tokens

    def _parse_rule_list(self, val) -> dict:
        if isinstance(val, str):
            rules = val.split('|')
        elif isinstance(val, list):
            rules = val
        else:
            rules = []

        info = {
            "type": "any",
            "required": False,
            "nullable": False,
        }
        
        for rule in rules:
            if not isinstance(rule, str):
                continue
            rule = rule.strip()
            if not rule:
                continue
            
            parts = rule.split(':', 1)
            name = parts[0].lower()
            params = parts[1] if len(parts) > 1 else ""
            
            if name == 'required':
                info["required"] = True
            elif name == 'nullable':
                info["nullable"] = True
            elif name == 'string':
                info["type"] = "string"
            elif name in ('integer', 'int'):
                info["type"] = "integer"
            elif name in ('numeric', 'double', 'float'):
                info["type"] = "number"
            elif name == 'boolean':
                info["type"] = "boolean"
            elif name == 'array':
                info["type"] = "array"
            elif name == 'email':
                info["format"] = "email"
            elif name == 'max':
                if params.isdigit():
                    info["max"] = int(params)
            elif name == 'min':
                if params.isdigit():
                    info["min"] = int(params)
            elif name == 'between':
                bounds = params.split(',')
                if len(bounds) == 2 and bounds[0].isdigit() and bounds[1].isdigit():
                    info["min"] = int(bounds[0])
                    info["max"] = int(bounds[1])
                
        return info

    def parse(self, code: str) -> dict:
        """Parses PHP code string and returns extracted validation rules."""
        tokens = self.tokenize_php(code)
        raw_rules = {}
        
        # Find class name
        class_name = "FormRequest"
        for idx in range(len(tokens) - 1):
            if tokens[idx] == 'class':
                class_name = tokens[idx+1]
                break
        
        n = len(tokens)
        rules_idx = -1
        i = 0
        while i < n - 2:
            if tokens[i] == 'rules' and tokens[i+1] == '(' and tokens[i+2] == ')':
                rules_idx = i + 3
                break
            i += 1
        
        if rules_idx == -1:
            i = 0
            while i < n:
                if tokens[i] == 'rules':
                    rules_idx = i + 1
                    while rules_idx < n and tokens[rules_idx] != '{':
                        rules_idx += 1
                    break
                i += 1
                
        if rules_idx == -1 or rules_idx >= n:
            return {}

        depth = 0
        return_idx = -1
        i = rules_idx
        if tokens[i] == '{':
            depth = 1
            i += 1
        else:
            while i < n and tokens[i] != '{':
                i += 1
            if i < n:
                depth = 1
                i += 1
                
        while i < n and depth > 0:
            t = tokens[i]
            if t == '{':
                depth += 1
            elif t == '}':
                depth -= 1
                if depth == 0:
                    break
            elif t == 'return':
                return_idx = i
                break
            i += 1
            
        if return_idx == -1:
            return {}
            
        i = return_idx + 1
        while i < n and tokens[i] not in ('[', 'array'):
            i += 1
            
        if i >= n:
            return {}
            
        array_start_token = tokens[i]
        array_end_token = ']' if array_start_token == '[' else ')'
        
        if array_start_token == 'array':
            i += 1
            if i < n and tokens[i] == '(':
                i += 1
            else:
                return {}
        else:
            i += 1
            
        arr_depth = 1
        
        def parse_value_at(idx: int) -> tuple[any, int]:
            if idx >= len(tokens):
                return None, idx
            t = tokens[idx]
            if t.startswith("'") or t.startswith('"'):
                return t[1:-1], idx + 1
            elif t in ('[', 'array'):
                inner_start = t
                inner_end = ']' if inner_start == '[' else ')'
                if inner_start == 'array':
                    idx += 2
                else:
                    idx += 1
                
                elements = []
                inner_depth = 1
                while idx < len(tokens) and inner_depth > 0:
                    tk = tokens[idx]
                    if tk == inner_start or (inner_start == 'array' and tk == '('):
                        inner_depth += 1
                        idx += 1
                    elif tk == inner_end:
                        inner_depth -= 1
                        idx += 1
                    elif tk == ',':
                        idx += 1
                    else:
                        if tk.startswith("'") or tk.startswith('"'):
                            elements.append(tk[1:-1])
                        idx += 1
                return elements, idx
            return None, idx + 1

        while i < n and arr_depth > 0:
            t = tokens[i]
            if t == array_end_token:
                arr_depth -= 1
                i += 1
                break
            elif t == ',':
                i += 1
                continue
                
            if t.startswith("'") or t.startswith('"'):
                key = t[1:-1]
                i += 1
                if i < n and tokens[i] == '=>':
                    i += 1
                    val, next_i = parse_value_at(i)
                    raw_rules[key] = val
                    i = next_i
                else:
                    i += 1
            else:
                i += 1
                
        # Structure and process raw rules
        structured_fields = {}
        for key, val in raw_rules.items():
            structured_fields[key] = self._parse_rule_list(val)
            
        return {
            class_name: {
                "fields": structured_fields,
                "raw_class": class_name
            }
        }
