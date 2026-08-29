import pytest
import responses
from polyglotspec.fuzzer import AdversarialFuzzer

@pytest.fixture
def sample_schema():
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "Product",
        "type": "object",
        "properties": {
            "title": {"type": "string", "minLength": 3, "maxLength": 10},
            "price": {"type": "number", "minimum": 0},
            "email": {"type": "string", "format": "email"},
            "isActive": {"type": "boolean"},
            "tags": {"type": "array"}
        },
        "required": ["title", "price"]
    }

def test_baseline_payload_generation(sample_schema):
    fuzzer = AdversarialFuzzer(sample_schema)
    baseline = fuzzer.get_baseline_payload()
    
    assert baseline["title"] == "AAA" # minLength is 3
    assert baseline["price"] == 0
    assert baseline["isActive"] is True
    assert baseline["tags"] == []

def test_generate_deterministic_payloads(sample_schema):
    fuzzer = AdversarialFuzzer(sample_schema)
    payloads = fuzzer.generate_deterministic_payloads()
    
    scenarios = [p["scenario"] for p in payloads]
    
    # Assert baseline exists
    assert "Baseline valid payload" in scenarios
    
    # Assert required omitted exists
    assert "Omitted required field: title" in scenarios
    assert "Omitted required field: price" in scenarios
    
    # Assert string boundaries exists
    assert "Null byte injection in string field: title" in scenarios
    assert "String minLength underflow (2/3) in: title" in scenarios
    assert "String maxLength overflow (11/10) in: title" in scenarios
    
    # Assert numeric boundaries exists
    assert "Numeric minimum underflow in: price" in scenarios
    
    # Assert type mutations exist
    assert any("Type mutation" in s for s in scenarios)

def test_generate_fallback_semantic_payloads(sample_schema):
    fuzzer = AdversarialFuzzer(sample_schema)
    payloads = fuzzer._get_fallback_semantic_payloads()
    
    scenarios = [p["scenario"] for p in payloads]
    assert any("Semantic invalid email" in s for s in scenarios)
    assert any("Semantic negative amount" in s for s in scenarios)

@responses.activate
def test_run_fuzz_test_http_mapping(sample_schema):
    target_url = "http://mock-api.local/products"
    
    # Mock baseline accepted
    responses.add(
        responses.POST,
        target_url,
        json={"success": True},
        status=201
    )
    # Mock boundary rejected
    responses.add(
        responses.POST,
        target_url,
        json={"error": "validation failed"},
        status=422
    )
    
    fuzzer = AdversarialFuzzer(sample_schema)
    cases = [
        {"scenario": "Baseline valid payload", "payload": {"title": "AAA", "price": 0}},
        {"scenario": "String maxLength overflow", "payload": {"title": "A" * 11, "price": 0}}
    ]
    
    results = fuzzer.run_fuzz_test(target_url, cases)
    
    assert len(results) == 2
    assert results[0]["outcome"] == "passed"
    assert results[1]["outcome"] == "passed"

@responses.activate
def test_run_fuzz_test_leak_and_crash(sample_schema):
    target_url = "http://mock-api.local/products"
    
    # Mock boundary leak (accepted with 200!)
    responses.add(
        responses.POST,
        target_url,
        json={"success": True},
        status=200
    )
    # Mock crash
    responses.add(
        responses.POST,
        target_url,
        status=500
    )
    
    fuzzer = AdversarialFuzzer(sample_schema)
    cases = [
        {"scenario": "String maxLength overflow", "payload": {"title": "A" * 11, "price": 0}},
        {"scenario": "Numeric minimum underflow", "payload": {"title": "AAA", "price": -5}}
    ]
    
    # Run first case (will map to 200, which is a leak)
    results = fuzzer.run_fuzz_test(target_url, [cases[0]])
    assert results[0]["outcome"] == "leak"
    
    # Reset and run second case (will map to 500, which is a crash)
    responses.reset()
    responses.add(responses.POST, target_url, status=500)
    results = fuzzer.run_fuzz_test(target_url, [cases[1]])
    assert results[0]["outcome"] == "crash"
