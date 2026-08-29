import json
import random
import requests

class AdversarialFuzzer:
    """Generates boundary and semantic edge-case payloads to fuzz API contracts."""

    def __init__(self, schema: dict):
        self.schema = schema
        self.properties = schema.get("properties", {})
        self.required = schema.get("required", [])

    def get_baseline_payload(self) -> dict:
        """Returns a valid payload matching all basic type and constraint rules."""
        payload = {}
        for name, prop in self.properties.items():
            payload[name] = self._get_default_valid_value(prop)
        return payload

    def _get_default_valid_value(self, prop: dict):
        if "default" in prop and prop["default"] is not None:
            return prop["default"]
            
        t = prop.get("type", "string")
        if isinstance(t, list):
            t = [x for x in t if x != "null"][0]
            
        if t == "string":
            min_len = prop.get("minLength", 1)
            return "A" * min_len
        elif t in ("integer", "number"):
            min_val = prop.get("minimum", 0)
            return min_val
        elif t == "boolean":
            return True
        elif t == "array":
            return []
        return None

    def generate_deterministic_payloads(self) -> list[dict]:
        """Generates list of payloads based on type boundaries and mutations."""
        payloads = []
        baseline = self.get_baseline_payload()
        
        # Scenario 1: Baseline valid payload
        payloads.append({
            "scenario": "Baseline valid payload",
            "payload": baseline.copy()
        })
        
        # Scenario 2: Omit required fields
        for field in self.required:
            if field in baseline:
                mutated = baseline.copy()
                del mutated[field]
                payloads.append({
                    "scenario": f"Omitted required field: {field}",
                    "payload": mutated
                })
                
        # Scenario 3: String boundary checks
        for field, prop in self.properties.items():
            t = prop.get("type", "string")
            if isinstance(t, list):
                t = [x for x in t if x != "null"][0]
                
            if t == "string":
                # Null byte injection
                mutated = baseline.copy()
                mutated[field] = "test\x00user"
                payloads.append({
                    "scenario": f"Null byte injection in string field: {field}",
                    "payload": mutated
                })
                
                # minLength underflow
                min_len = prop.get("minLength")
                if min_len is not None and min_len > 0:
                    mutated = baseline.copy()
                    mutated[field] = "A" * (min_len - 1)
                    payloads.append({
                        "scenario": f"String minLength underflow ({min_len - 1}/{min_len}) in: {field}",
                        "payload": mutated
                    })
                    
                # maxLength overflow
                max_len = prop.get("maxLength")
                if max_len is not None:
                    mutated = baseline.copy()
                    mutated[field] = "A" * (max_len + 1)
                    payloads.append({
                        "scenario": f"String maxLength overflow ({max_len + 1}/{max_len}) in: {field}",
                        "payload": mutated
                    })
            
            # Scenario 4: Numeric boundary checks
            elif t in ("integer", "number"):
                # minimum underflow
                min_val = prop.get("minimum")
                if min_val is not None:
                    mutated = baseline.copy()
                    mutated[field] = min_val - (1 if t == "integer" else 0.1)
                    payloads.append({
                        "scenario": f"Numeric minimum underflow in: {field}",
                        "payload": mutated
                    })
                    
                # maximum overflow
                max_val = prop.get("maximum")
                if max_val is not None:
                    mutated = baseline.copy()
                    mutated[field] = max_val + (1 if t == "integer" else 0.1)
                    payloads.append({
                        "scenario": f"Numeric maximum overflow in: {field}",
                        "payload": mutated
                    })
                    
                # Large number overflow
                mutated = baseline.copy()
                mutated[field] = 999999999999999999
                payloads.append({
                    "scenario": f"Numeric huge overflow in: {field}",
                    "payload": mutated
                })
                
        return payloads

    def generate_semantic_payloads(self, slm_endpoint: str = None) -> list[dict]:
        """Generates semantic payloads using templates/heuristics or SLM call."""
        # Stub for Commit 29
        return []
