import pytest
from polyglotspec.normalizer import CanonicalNormalizer

def test_normalize_python_output():
    parsed_python = {
        "User": {
            "fields": {
                "name": {
                    "type": "string",
                    "required": True,
                    "nullable": False,
                    "min_length": 3,
                    "max_length": 50
                },
                "age": {
                    "type": "integer",
                    "required": False,
                    "nullable": False,
                    "ge": 0,
                    "le": 120,
                    "default": 18
                },
                "score": {
                    "type": "number",
                    "required": False,
                    "nullable": True,
                    "gt": 0
                }
            },
            "raw_class": "User"
        }
    }
    
    normalizer = CanonicalNormalizer()
    schemas = normalizer.normalize(parsed_python)
    
    assert "User" in schemas
    schema = schemas["User"]
    
    assert schema["$schema"] == "https://json-schema.org/draft/2020-12/schema"
    assert schema["type"] == "object"
    
    properties = schema["properties"]
    assert properties["name"]["type"] == "string"
    assert properties["name"]["minLength"] == 3
    assert properties["name"]["maxLength"] == 50
    
    assert properties["age"]["type"] == "integer"
    assert properties["age"]["minimum"] == 0
    assert properties["age"]["maximum"] == 120
    assert properties["age"]["default"] == 18
    
    assert properties["score"]["type"] == ["number", "null"]
    assert properties["score"]["exclusiveMinimum"] == 0
    
    assert schema["required"] == ["name"]

def test_normalize_php_output():
    parsed_php = {
        "StorePostRequest": {
            "fields": {
                "title": {
                    "type": "string",
                    "required": True,
                    "nullable": False,
                    "max": 255
                },
                "age": {
                    "type": "integer",
                    "required": False,
                    "nullable": True,
                    "min": 18
                },
                "email": {
                    "type": "string",
                    "required": True,
                    "nullable": False,
                    "format": "email"
                }
            },
            "raw_class": "StorePostRequest"
        }
    }
    
    normalizer = CanonicalNormalizer()
    schemas = normalizer.normalize(parsed_php)
    
    assert "StorePostRequest" in schemas
    schema = schemas["StorePostRequest"]
    
    properties = schema["properties"]
    assert properties["title"]["type"] == "string"
    assert properties["title"]["maxLength"] == 255
    
    assert properties["age"]["type"] == ["integer", "null"]
    assert properties["age"]["minimum"] == 18
    
    assert properties["email"]["type"] == "string"
    assert properties["email"]["format"] == "email"
    
    assert sorted(schema["required"]) == sorted(["title", "email"])

def test_normalize_typescript_output():
    parsed_ts = {
        "UserSchema": {
            "fields": {
                "username": {
                    "type": "string",
                    "required": True,
                    "nullable": False,
                    "min": 3
                },
                "isAdmin": {
                    "type": "boolean",
                    "required": True,
                    "nullable": False,
                    "default": False
                }
            },
            "raw_class": "UserSchema"
        }
    }
    
    normalizer = CanonicalNormalizer()
    schemas = normalizer.normalize(parsed_ts)
    
    assert "UserSchema" in schemas
    schema = schemas["UserSchema"]
    
    properties = schema["properties"]
    assert properties["username"]["type"] == "string"
    assert properties["username"]["minLength"] == 3
    
    assert properties["isAdmin"]["type"] == "boolean"
    assert properties["isAdmin"]["default"] is False
    
    assert sorted(schema["required"]) == sorted(["username", "isAdmin"])
