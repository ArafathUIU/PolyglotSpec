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
            
        elif isinstance(node, ast.Subscript):
            wrapper = ""
            if isinstance(node.value, ast.Name):
                wrapper = node.value.id
            
            # Extract list or generic parameter
            slice_type = self._resolve_type(node.slice)
            
            if wrapper in ("Optional", "Union"):
                return slice_type
            elif wrapper in ("List", "list"):
                return f"array[{slice_type}]"
            elif wrapper == "Annotated":
                if isinstance(node.slice, ast.Tuple) and node.slice.elts:
                    return self._resolve_type(node.slice.elts[0])
                return slice_type
            
            return f"{wrapper}[{slice_type}]"
            
        elif isinstance(node, ast.Tuple):
            types = [self._resolve_type(elt) for elt in node.elts]
            # Filter out null/None if present in Union representation
            types = [t for t in types if t not in ("None", "null", "NoneType")]
            if len(types) == 1:
                return types[0]
            return "|".join(types)
            
        elif isinstance(node, ast.BinOp) and isinstance(node.op, ast.BitOr):
            left_type = self._resolve_type(node.left)
            right_type = self._resolve_type(node.right)
            types = [t for t in (left_type, right_type) if t not in ("None", "null", "NoneType")]
            if len(types) == 1:
                return types[0]
            return "|".join(types)
            
        elif isinstance(node, ast.Constant) and node.value is None:
            return "null"
            
        return "any"

    def _parse_type_and_nullable(self, node: ast.AST) -> tuple[str, bool]:
        is_nullable = False

        def check_nullable(t_node: ast.AST) -> bool:
            if isinstance(t_node, ast.BinOp) and isinstance(t_node.op, ast.BitOr):
                return check_nullable(t_node.left) or check_nullable(t_node.right)
            if isinstance(t_node, ast.Subscript) and isinstance(t_node.value, ast.Name):
                if t_node.value.id == "Optional":
                    return True
                if t_node.value.id == "Union":
                    if isinstance(t_node.slice, ast.Tuple):
                        return any(check_nullable(elt) for elt in t_node.slice.elts)
                    return check_nullable(t_node.slice)
                if t_node.value.id == "Annotated":
                    if isinstance(t_node.slice, ast.Tuple) and t_node.slice.elts:
                        return check_nullable(t_node.slice.elts[0])
                    return check_nullable(t_node.slice)
            if isinstance(t_node, ast.Constant) and t_node.value is None:
                return True
            if isinstance(t_node, ast.Name) and t_node.id in ("None", "NoneType"):
                return True
            return False

        is_nullable = check_nullable(node)
        resolved_type = self._resolve_type(node)
        return resolved_type, is_nullable

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
                field_type, is_nullable = self._parse_type_and_nullable(child.annotation)
                
                field_info = {
                    "type": field_type,
                    "required": not is_nullable,
                    "nullable": is_nullable,
                    "default": None
                }

                # Check if there are constraints from Annotated
                if isinstance(child.annotation, ast.Subscript) and isinstance(child.annotation.value, ast.Name) and child.annotation.value.id == "Annotated":
                    if isinstance(child.annotation.slice, ast.Tuple):
                        for elt in child.annotation.slice.elts:
                            if isinstance(elt, ast.Call) and isinstance(elt.func, ast.Name) and elt.func.id == "Field":
                                constraints = self._extract_constraints(elt)
                                field_info.update(constraints)

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
