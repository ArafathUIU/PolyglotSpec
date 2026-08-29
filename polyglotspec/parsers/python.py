import ast
import os

class PydanticParser:
    """Statically parses Pydantic models from Python source code using AST."""

    def __init__(self):
        self.models = {}

    def parse_file(self, filepath: str) -> dict:
        """Reads a file and parses its AST."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            code = f.read()
        return self.parse(code)

    def parse(self, code: str) -> dict:
        """Parses python code string and returns extracted models."""
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return {"error": f"Syntax error in Python file: {e}"}

        self.models = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                self._parse_class(node)
        return self.models

    def _inherits_from_basemodel(self, node: ast.ClassDef) -> bool:
        for base in node.bases:
            if isinstance(base, ast.Name) and base.id == "BaseModel":
                return True
            if isinstance(base, ast.Attribute) and base.attr == "BaseModel":
                return True
        return False

    def _resolve_type(self, node: ast.AST) -> str:
        if isinstance(node, ast.Name):
            name_map = {
                "str": "string",
                "int": "integer",
                "float": "number",
                "bool": "boolean",
            }
            return name_map.get(node.id, node.id)
        return "any"

    def _resolve_default(self, node: ast.AST):
        if isinstance(node, ast.Constant):
            return node.value
        return None

    def _parse_class(self, node: ast.ClassDef):
        if not self._inherits_from_basemodel(node):
            return

        fields = {}
        for child in node.body:
            if isinstance(child, ast.AnnAssign):
                if not isinstance(child.target, ast.Name):
                    continue
                field_name = child.target.id
                field_type = self._resolve_type(child.annotation)
                
                default_val = None
                required = True
                if child.value:
                    default_val = self._resolve_default(child.value)
                    required = False

                fields[field_name] = {
                    "type": field_type,
                    "required": required,
                    "default": default_val
                }

        self.models[node.name] = {
            "fields": fields,
            "raw_class": node.name
        }
