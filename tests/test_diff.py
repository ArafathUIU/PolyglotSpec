import pytest
from polyglotspec.diff import SchemaDiffEngine, format_diff

def test_diff_perfect_match():
    consumer = {
        "properties": {
            "username": {"type": "string", "minLength": 3},
            "age": {"type": "integer", "minimum": 18}
        },
        "required": ["username"]
    }
    provider = {
        "properties": {
            "username": {"type": "string", "minLength": 3},
            "age": {"type": "integer", "minimum": 18}
        },
        "required": ["username"]
    }
    
    engine = SchemaDiffEngine()
    mismatches = engine.diff(consumer, provider)
    
    assert len(mismatches) == 0

def test_diff_missing_required():
    consumer = {
        "properties": {
            "username": {"type": "string"}
        }
    }
    provider = {
        "properties": {
            "username": {"type": "string"},
            "email": {"type": "string"}
        },
        "required": ["username", "email"]
    }
    
    engine = SchemaDiffEngine()
    mismatches = engine.diff(consumer, provider)
    
    assert len(mismatches) == 2
    paths = [m.field_path for m in mismatches]
    assert "email" in paths
    assert "username" in paths
    assert all(m.severity == "breaking" for m in mismatches)

def test_diff_type_mismatch():
    consumer = {
        "properties": {
            "age": {"type": "string"}
        }
    }
    provider = {
        "properties": {
            "age": {"type": "integer"}
        }
    }
    
    engine = SchemaDiffEngine()
    mismatches = engine.diff(consumer, provider)
    
    assert len(mismatches) == 1
    assert mismatches[0].field_path == "age"
    assert mismatches[0].severity == "breaking"
    assert "Type mismatch" in mismatches[0].message

def test_diff_constraint_tightening():
    consumer = {
        "properties": {
            "username": {"type": "string", "maxLength": 100},
            "age": {"type": "integer", "minimum": 10}
        }
    }
    provider = {
        "properties": {
            "username": {"type": "string", "maxLength": 50},
            "age": {"type": "integer", "minimum": 18}
        }
    }
    
    engine = SchemaDiffEngine()
    mismatches = engine.diff(consumer, provider)
    
    assert len(mismatches) == 2
    paths = [m.field_path for m in mismatches]
    assert "username" in paths
    assert "age" in paths
    assert all(m.severity == "breaking" for m in mismatches)

def test_diff_removed_field():
    consumer = {
        "properties": {
            "username": {"type": "string"},
            "bio": {"type": "string"}
        }
    }
    provider = {
        "properties": {
            "username": {"type": "string"}
        }
    }
    
    engine = SchemaDiffEngine()
    mismatches = engine.diff(consumer, provider)
    
    assert len(mismatches) == 1
    assert mismatches[0].field_path == "bio"
    assert mismatches[0].severity == "warning"
    assert "removed" in mismatches[0].message

def test_format_diff():
    consumer = {
        "properties": {
            "username": {"type": "string"}
        }
    }
    provider = {
        "properties": {
            "username": {"type": "integer"}
        }
    }
    
    engine = SchemaDiffEngine()
    mismatches = engine.diff(consumer, provider)
    formatted = format_diff(mismatches)
    
    assert "Breaking" in formatted
    assert "username" in formatted
    
    # Check no drift formatted output
    assert "No contract drift" in format_diff([])
