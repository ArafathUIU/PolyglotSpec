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

    def diff(self, consumer: dict, provider: dict) -> list[Mismatch]:
        """Compares two JSON Schemas and returns a list of mismatches."""
        mismatches = []
        
        consumer_props = consumer.get("properties", {})
        provider_props = provider.get("properties", {})
        consumer_required = consumer.get("required", [])
        provider_required = provider.get("required", [])
        
        # Check required fields
        # If provider requires a field that consumer does not send or mark as required, it is breaking
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
                
        return mismatches
