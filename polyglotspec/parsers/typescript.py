import os
import re

class ZodSchemaParser:
    """Statically parses TypeScript Zod schemas from source code."""

    def __init__(self):
        self.schemas = {}

    def parse_file(self, filepath: str) -> dict:
        """Reads a TS/JS file and parses Zod schemas."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            code = f.read()
        return self.parse(code)

    def tokenize_ts(self, code: str) -> list[str]:
        """Tokenize TS/JS source code into a list of string tokens."""
        token_specification = [
            ('STRING', r'\'[^\'\\]*(?:\\.[^\'\\]*)*\'|"[^"\\]*(?:\\.[^"\\]*)*"|`[^`\\]*(?:\\.[^`\\]*)*`'),
            ('DOT', r'\.'),
            ('COLON', r':'),
            ('ASSIGN', r'='),
            ('BRACKET', r'[\[\]\{\}\(\)]'),
            ('COMMA_SEMI', r'[,;]'),
            ('WORD', r'[a-zA-Z_$][a-zA-Z0-9_$]*'),
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

    def parse(self, code: str) -> dict:
        """Parses TS/JS code string and returns extracted Zod schemas."""
        tokens = self.tokenize_ts(code)
        self.schemas = {}
        
        n = len(tokens)
        i = 0
        while i < n - 6:
            # Look for: NAME = z . object ( {
            if (tokens[i] == '=' and 
                tokens[i+1] == 'z' and 
                tokens[i+2] == '.' and 
                tokens[i+3] == 'object' and 
                tokens[i+4] == '(' and 
                tokens[i+5] == '{'):
                
                schema_name = tokens[i-1]
                start_idx = i + 5
                idx = start_idx + 1
                depth = 1
                body_tokens = []
                while idx < n and depth > 0:
                    t = tokens[idx]
                    if t == '{':
                        depth += 1
                    elif t == '}':
                        depth -= 1
                        if depth == 0:
                            idx += 1
                            break
                    body_tokens.append(t)
                    idx += 1
                
                # Split body_tokens into chunks by commas at depth 0
                field_chunks = []
                current_chunk = []
                bracket_depth = 0
                for t in body_tokens:
                    if t in ('(', '{', '['):
                        bracket_depth += 1
                        current_chunk.append(t)
                    elif t in (')', '}', ']'):
                        bracket_depth -= 1
                        current_chunk.append(t)
                    elif t == ',' and bracket_depth == 0:
                        if current_chunk:
                            field_chunks.append(current_chunk)
                            current_chunk = []
                    else:
                        current_chunk.append(t)
                if current_chunk:
                    field_chunks.append(current_chunk)
                
                fields = {}
                for chunk in field_chunks:
                    if len(chunk) >= 3 and chunk[1] == ':':
                        name_token = chunk[0]
                        # Strip quotes if string
                        if name_token.startswith("'") or name_token.startswith('"'):
                            field_name = name_token[1:-1]
                        else:
                            field_name = name_token
                            
                        # Parse chain starting from index 2
                        chain = chunk[2:]
                        fields[field_name] = self._parse_field_chain(chain)
                
                self.schemas[schema_name] = {
                    "fields": fields,
                    "raw_class": schema_name
                }
                i = idx
            else:
                i += 1
                
        return self.schemas

    def _parse_field_chain(self, chain_tokens: list[str]) -> dict:
        info = {
            "type": "any",
            "required": True,
            "nullable": False,
            "default": None,
        }
        
        # Identify base type
        if len(chain_tokens) >= 3 and chain_tokens[0] == 'z' and chain_tokens[1] == '.':
            type_token = chain_tokens[2]
            if type_token == 'string':
                info["type"] = "string"
            elif type_token == 'number':
                info["type"] = "number" # Default to number
            elif type_token == 'boolean':
                info["type"] = "boolean"
            elif type_token == 'array':
                info["type"] = "array"
        
        # Traverse methods
        idx = 3
        m = len(chain_tokens)
        while idx < m:
            if chain_tokens[idx] == '.' and idx + 1 < m:
                method_name = chain_tokens[idx+1]
                idx += 2
                if idx < m and chain_tokens[idx] == '(':
                    idx += 1
                    p_depth = 1
                    args = []
                    while idx < m and p_depth > 0:
                        tok = chain_tokens[idx]
                        if tok == '(':
                            p_depth += 1
                        elif tok == ')':
                            p_depth -= 1
                            if p_depth == 0:
                                idx += 1
                                break
                        args.append(tok)
                        idx += 1
                    
                    if method_name == 'optional':
                        info["required"] = False
                    elif method_name == 'nullable':
                        info["nullable"] = True
                    elif method_name == 'min' and args:
                        val = args[0]
                        if val.isdigit():
                            info["min"] = int(val)
                    elif method_name == 'max' and args:
                        val = args[0]
                        if val.isdigit():
                            info["max"] = int(val)
                    elif method_name == 'email':
                        info["format"] = "email"
                    elif method_name == 'int':
                        info["type"] = "integer"
                    elif method_name == 'default' and args:
                        val = args[0]
                        if val.startswith("'") or val.startswith('"'):
                            info["default"] = val[1:-1]
                        elif val in ('true', 'false'):
                            info["default"] = (val == 'true')
                        elif val.isdigit():
                            info["default"] = int(val)
                else:
                    if method_name == 'optional':
                        info["required"] = False
                    elif method_name == 'nullable':
                        info["nullable"] = True
            else:
                idx += 1
                
        return info
