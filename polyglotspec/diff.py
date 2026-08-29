class Mismatch:
    """Represents a contract mismatch between consumer and provider schemas."""
    
    def __init__(self, field_path: str, message: str, severity: str):
        self.field_path = field_path  # e.g., "user_id" or "profile.name"
        self.message = message
        self.severity = severity      # "breaking" or "warning"

    def __repr__(self):
        return f"[{self.severity.upper()}] {self.field_path}: {self.message}"

class SchemaDiffEngine:
    """Compares consumer and provider schemas to detect breaking changes and drift."""

    def __init__(self):
        pass

    def _is_type_compatible(self, c_type, p_type) -> bool:
        c_list = c_type if isinstance(c_type, list) else [c_type]
        p_list = p_type if isinstance(p_type, list) else [p_type]
        
        for t_c in c_list:
            compatible = False
            for t_p in p_list:
                if t_c == t_p:
                    compatible = True
                    break
                if t_c == "integer" and t_p == "number":
                    compatible = True
                    break
                if t_c == "any" or t_p == "any":
                    compatible = True
                    break
            if not compatible:
                return False
        return True

    def diff(self, consumer: dict, provider: dict) -> list[Mismatch]:
        """Compares two JSON Schemas and returns a list of mismatches."""
        mismatches = []
        
        consumer_props = consumer.get("properties", {})
        provider_props = provider.get("properties", {})
        consumer_required = consumer.get("required", [])
        provider_required = provider.get("required", [])
        
        # Check required fields
        for field in provider_required:
            if field not in consumer_props:
                mismatches.append(Mismatch(
                    field_path=field,
                    message="Provider made field mandatory, but Consumer does not send it.",
                    severity="breaking"
                ))
            elif field not in consumer_required:
                mismatches.append(Mismatch(
                    field_path=field,
                    message="Provider made field mandatory, but Consumer sends it as optional.",
                    severity="breaking"
                ))
                
        # Check type compatibility
        for field, c_info in consumer_props.items():
            if field in provider_props:
                p_info = provider_props[field]
                c_type = c_info.get("type", "any")
                p_type = p_info.get("type", "any")
                
                if not self._is_type_compatible(c_type, p_type):
                    mismatches.append(Mismatch(
                        field_path=field,
                        message=f"Type mismatch: Consumer sends '{c_type}', but Provider expects '{p_type}'.",
                        severity="breaking"
                    ))
                elif c_type == "array" and p_type == "array":
                    c_item = c_info.get("items", {}).get("type", "any")
                    p_item = p_info.get("items", {}).get("type", "any")
                    if not self._is_type_compatible(c_item, p_item):
                        mismatches.append(Mismatch(
                            field_path=f"{field}[]",
                            message=f"Array item type mismatch: Consumer sends array of '{c_item}', but Provider expects '{p_item}'.",
                            severity="breaking"
                        ))
                        
        return mismatches
