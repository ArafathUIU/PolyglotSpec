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
                # Walk inside the { ... }
                start_idx = i + 5 # the '{'
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
                
                self.schemas[schema_name] = {
                    "raw_tokens": body_tokens,
                    "fields": {}
                }
                i = idx
            else:
                i += 1
                
        return self.schemas
