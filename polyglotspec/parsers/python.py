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

    def _extract_constraints(self, node: ast.AST) -> dict:
        constraints = {}
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "Field":
            if node.args:
                first_arg = node.args[0]
                if isinstance(first_arg, ast.Constant) and first_arg.value is not Ellipsis:
                    constraints["default"] = first_arg.value
                    constraints["required"] = False
                elif isinstance(first_arg, ast.Constant) and first_arg.value is Ellipsis:
                    constraints["required"] = True
            
            for kw in node.keywords:
                if kw.arg == "default":
                    if isinstance(kw.value, ast.Constant):
                        constraints["default"] = kw.value.value
                        if kw.value.value is not Ellipsis:
                            constraints["required"] = False
                elif kw.arg in ("min_length", "max_length", "gt", "ge", "lt", "le", "pattern", "regex", "multiple_of"):
                    if isinstance(kw.value, ast.Constant):
                        constraints[kw.arg] = kw.value.value
        return constraints

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
                
                field_info = {
                    "type": field_type,
                    "required": True,
                    "default": None
                }

                if child.value:
                    if isinstance(child.value, ast.Call) and isinstance(child.value.func, ast.Name) and child.value.func.id == "Field":
                        constraints = self._extract_constraints(child.value)
                        field_info.update(constraints)
                    else:
                        default_val = self._resolve_default(child.value)
                        field_info["default"] = default_val
                        field_info["required"] = False

                fields[field_name] = field_info

        self.models[node.name] = {
            "fields": fields,
            "raw_class": node.name
        }
