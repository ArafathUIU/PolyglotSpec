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
        # Stub for Commit 23
        return mismatches
