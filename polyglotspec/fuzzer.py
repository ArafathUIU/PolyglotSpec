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
                
        # Append type mutations
        payloads.extend(self._generate_type_mutations(baseline))
                
        return payloads

    def _generate_type_mutations(self, baseline: dict) -> list[dict]:
        mutations = []
        for field, prop in self.properties.items():
            t = prop.get("type", "string")
            if isinstance(t, list):
                t = [x for x in t if x != "null"][0]
            
            incompatible_values = []
            if t == "string":
                incompatible_values = [123, True, [], {}]
            elif t in ("integer", "number"):
                incompatible_values = ["not-a-number", True, [], {}]
            elif t == "boolean":
                incompatible_values = ["not-a-bool", 123, [], {}]
            elif t == "array":
                incompatible_values = ["not-an-array", 123, True, {}]
                
            for val in incompatible_values:
                mutated = baseline.copy()
                mutated[field] = val
                mutations.append({
                    "scenario": f"Type mutation ({type(val).__name__} instead of {t}) in: {field}",
                    "payload": mutated
                })
        return mutations

    def generate_semantic_payloads(self, slm_endpoint: str = None, api_key: str = None, model: str = "llama3") -> list[dict]:
        """Generates semantic payloads using templates/heuristics or SLM call."""
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        prompt_path = os.path.join(base_dir, "prompts", "fuzzer_slm.txt")
        
        if not os.path.exists(prompt_path):
            prompt_path = os.path.join(os.getcwd(), "prompts", "fuzzer_slm.txt")
            
        if os.path.exists(prompt_path):
            with open(prompt_path, "r", encoding="utf-8") as f:
                prompt_template = f.read()
        else:
            prompt_template = "System: Generate fuzz JSON array for schema: __SCHEMA_CONTENT__"
            
        formatted_prompt = prompt_template.replace("__SCHEMA_CONTENT__", json.dumps(self.schema, indent=2))
        
        if not slm_endpoint:
            return self._get_fallback_semantic_payloads()
            
        try:
            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
                
            payload = {
                "model": model,
                "prompt": formatted_prompt,
                "stream": False
            }
            if "v1/chat/completions" in slm_endpoint:
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a software fuzzer."},
                        {"role": "user", "content": formatted_prompt}
                    ]
                }
                
            response = requests.post(slm_endpoint, json=payload, headers=headers, timeout=30)
            if response.status_code == 200:
                res_data = response.json()
                text = ""
                if "response" in res_data:
                    text = res_data["response"]
                elif "choices" in res_data:
                    text = res_data["choices"][0]["message"]["content"]
                
                start_idx = text.find("[")
                end_idx = text.rfind("]")
                if start_idx != -1 and end_idx != -1:
                    json_str = text[start_idx:end_idx+1]
                    cases = json.loads(json_str)
                    return cases
        except Exception:
            pass
            
        return self._get_fallback_semantic_payloads()

    def _get_fallback_semantic_payloads(self) -> list[dict]:
        payloads = []
        baseline = self.get_baseline_payload()
        
        for field, prop in self.properties.items():
            field_lower = field.lower()
            t = prop.get("type", "string")
            if isinstance(t, list):
                t = [x for x in t if x != "null"][0]
                
            if t == "string":
                if "email" in field_lower:
                    for bad_email in ("not-an-email", "user@", "admin@.com"):
                        mutated = baseline.copy()
                        mutated[field] = bad_email
                        payloads.append({
                            "scenario": f"Semantic invalid email in: {field}",
                            "payload": mutated
                        })
                elif "url" in field_lower or "link" in field_lower:
                    for bad_url in ("invalid-url", "http://", "ftp://missing-tld"):
                        mutated = baseline.copy()
                        mutated[field] = bad_url
                        payloads.append({
                            "scenario": f"Semantic invalid URL in: {field}",
                            "payload": mutated
                        })
                elif "phone" in field_lower:
                    mutated = baseline.copy()
                    mutated[field] = "not-a-number-phone"
                    payloads.append({
                        "scenario": f"Semantic invalid phone in: {field}",
                        "payload": mutated
                    })
                elif "date" in field_lower:
                    mutated = baseline.copy()
                    mutated[field] = "2025-13-45"
                    payloads.append({
                        "scenario": f"Semantic invalid date format in: {field}",
                        "payload": mutated
                    })
            elif t in ("integer", "number"):
                if any(x in field_lower for x in ("price", "amount", "cost", "quantity", "stock")):
                    mutated = baseline.copy()
                    mutated[field] = -100
                    payloads.append({
                        "scenario": f"Semantic negative amount in numeric field: {field}",
                        "payload": mutated
                    })
        return payloads

    def run_fuzz_test(self, target_url: str, payloads: list[dict]) -> list[dict]:
        """Runs the fuzz payloads against the target URL and returns execution results."""
        if not target_url.lower().startswith(("http://", "https://")):
            raise ValueError(f"Invalid target URL scheme. Only HTTP and HTTPS protocols are supported: {target_url}")
            
        results = []
        for case in payloads:
            scenario = case["scenario"]
            payload = case["payload"]
            
            try:
                is_baseline = (scenario == "Baseline valid payload")
                response = requests.post(target_url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
                status = response.status_code
                
                if is_baseline:
                    if status in (200, 201, 202, 204):
                        outcome = "passed"
                        msg = "Valid baseline payload accepted as expected."
                    else:
                        outcome = "failed"
                        msg = f"Valid baseline payload was rejected with status {status}."
                else:
                    if status in (400, 422):
                        outcome = "passed"
                        msg = f"Rejected with expected status {status}."
                    elif status >= 500:
                        outcome = "crash"
                        msg = f"Server crashed with status {status}!"
                    else:
                        outcome = "leak"
                        msg = f"Vulnerability: Adversarial payload accepted with status {status}!"
                        
                results.append({
                    "scenario": scenario,
                    "payload": payload,
                    "status_code": status,
                    "outcome": outcome,
                    "message": msg
                })
            except requests.RequestException as e:
                results.append({
                    "scenario": scenario,
                    "payload": payload,
                    "status_code": None,
                    "outcome": "error",
                    "message": f"Network error: {str(e)}"
                })
                
        return results
