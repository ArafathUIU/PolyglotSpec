import pytest
from polyglotspec.parsers.typescript import ZodSchemaParser

def test_parse_basic_zod_schema():
    code = """
import { z } from 'zod';

export const UserSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  age: z.number().int().min(18).optional(),
  isAdmin: z.boolean().default(false),
  "display-name": z.string().optional()
});
"""
    parser = ZodSchemaParser()
    schemas = parser.parse(code)
    
    assert "UserSchema" in schemas
    fields = schemas["UserSchema"]["fields"]
    
    assert fields["username"]["type"] == "string"
    assert fields["username"]["min"] == 3
    assert fields["username"]["max"] == 20
    assert fields["username"]["required"] is True
    
    assert fields["email"]["type"] == "string"
    assert fields["email"]["format"] == "email"
    
    assert fields["age"]["type"] == "integer"
    assert fields["age"]["min"] == 18
    assert fields["age"]["required"] is False
    
    assert fields["isAdmin"]["type"] == "boolean"
    assert fields["isAdmin"]["default"] is False
    assert fields["isAdmin"]["required"] is True
    
    assert fields["display-name"]["type"] == "string"
    assert fields["display-name"]["required"] is False
