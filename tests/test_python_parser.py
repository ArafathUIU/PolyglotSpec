import pytest
from polyglotspec.parsers.python import PydanticParser

def test_parse_basic_fields():
    code = """
from pydantic import BaseModel

class User(BaseModel):
    name: str
    age: int
    score: float
    is_active: bool
"""
    parser = PydanticParser()
    models = parser.parse(code)
    
    assert "User" in models
    fields = models["User"]["fields"]
    
    assert fields["name"]["type"] == "string"
    assert fields["name"]["required"] is True
    
    assert fields["age"]["type"] == "integer"
    
    assert fields["score"]["type"] == "number"
    
    assert fields["is_active"]["type"] == "boolean"

def test_parse_constraints():
    code = """
from pydantic import BaseModel, Field

class Product(BaseModel):
    title: str = Field(..., min_length=3, max_length=50)
    price: float = Field(0.0, gt=0)
    stock: int = Field(default=10, ge=0, le=100)
"""
    parser = PydanticParser()
    models = parser.parse(code)
    
    assert "Product" in models
    fields = models["Product"]["fields"]
    
    assert fields["title"]["type"] == "string"
    assert fields["title"]["min_length"] == 3
    assert fields["title"]["max_length"] == 50
    assert fields["title"]["required"] is True
    
    assert fields["price"]["type"] == "number"
    assert fields["price"]["gt"] == 0
    assert fields["price"]["default"] == 0.0
    assert fields["price"]["required"] is False
    
    assert fields["stock"]["type"] == "integer"
    assert fields["stock"]["ge"] == 0
    assert fields["stock"]["le"] == 100
    assert fields["stock"]["default"] == 10
    assert fields["stock"]["required"] is False

def test_parse_optional_and_union():
    code = """
from pydantic import BaseModel
from typing import Optional, Union

class Profile(BaseModel):
    bio: Optional[str]
    nickname: str | None = None
    role_id: Union[int, str]
"""
    parser = PydanticParser()
    models = parser.parse(code)
    
    assert "Profile" in models
    fields = models["Profile"]["fields"]
    
    assert fields["bio"]["type"] == "string"
    assert fields["bio"]["nullable"] is True
    assert fields["bio"]["required"] is False
    
    assert fields["nickname"]["type"] == "string"
    assert fields["nickname"]["nullable"] is True
    assert fields["nickname"]["required"] is False
    assert fields["nickname"]["default"] is None
    
    assert fields["role_id"]["type"] == "integer|string"
    assert fields["role_id"]["nullable"] is False

def test_parse_annotated_fields():
    code = """
from pydantic import BaseModel, Field
from typing import Annotated

class Document(BaseModel):
    title: Annotated[str, Field(max_length=100)] = "Untitled"
"""
    parser = PydanticParser()
    models = parser.parse(code)
    
    assert "Document" in models
    fields = models["Document"]["fields"]
    
    assert fields["title"]["type"] == "string"
    assert fields["title"]["max_length"] == 100
    assert fields["title"]["default"] == "Untitled"
    assert fields["title"]["required"] is False

def test_ignore_non_basemodel():
    code = """
class RegularClass:
    name: str = "test"
"""
    parser = PydanticParser()
    models = parser.parse(code)
    assert "RegularClass" not in models
