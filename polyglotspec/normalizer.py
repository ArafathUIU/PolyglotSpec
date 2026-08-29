class CanonicalNormalizer:
    """Converts framework-specific validation structures into JSON Schema Draft 2020-12."""

    def __init__(self):
        pass

    def normalize(self, parsed_data: dict) -> dict:
        """Normalizes parsed models/schemas into Draft 2020-12 JSON Schema."""
        normalized_schemas = {}
        for class_name, model_info in parsed_data.items():
            normalized_schemas[class_name] = self._normalize_model(class_name, model_info)
        return normalized_schemas

    def _normalize_model(self, class_name: str, model_info: dict) -> dict:
        schema = {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "title": class_name,
            "type": "object",
            "properties": {},
            "required": []
        }
        
        fields = model_info.get("fields", {})
        for field_name, info in fields.items():
            prop = {}
            
            # Resolve type
            base_type = info.get("type", "any")
            is_nullable = info.get("nullable", False)
            
            # Handle array types like array[integer]
            if base_type.startswith("array[") and base_type.endswith("]"):
                inner_type = base_type[6:-1]
                prop["type"] = "array"
                prop["items"] = {"type": inner_type}
            else:
                if base_type != "any":
                    prop["type"] = base_type
            
            # Handle nullable in Draft 2020-12
            if is_nullable and "type" in prop:
                if isinstance(prop["type"], str):
                    prop["type"] = [prop["type"], "null"]
            
            # Map Pydantic (Python) constraints
            if "min_length" in info:
                prop["minLength"] = info["min_length"]
            if "max_length" in info:
                prop["maxLength"] = info["max_length"]
            if "ge" in info:
                prop["minimum"] = info["ge"]
            if "gt" in info:
                prop["exclusiveMinimum"] = info["gt"]
            if "le" in info:
                prop["maximum"] = info["le"]
            if "lt" in info:
                prop["exclusiveMaximum"] = info["lt"]
                
            # Map PHP / TS Zod constraints (min/max depends on type)
            if "min" in info:
                val = info["min"]
                if base_type == "string":
                    prop["minLength"] = val
                elif base_type in ("integer", "number"):
                    prop["minimum"] = val
            if "max" in info:
                val = info["max"]
                if base_type == "string":
                    prop["maxLength"] = val
                elif base_type in ("integer", "number"):
                    prop["maximum"] = val
            if "format" in info:
                prop["format"] = info["format"]
                
            if "default" in info and info["default"] is not None:
                prop["default"] = info["default"]
                
            schema["properties"][field_name] = prop
            
            if info.get("required", False):
                schema["required"].append(field_name)
                
        # If no required fields, we can remove the required key to make it clean JSON Schema
        if not schema["required"]:
            del schema["required"]
            
        return schema
