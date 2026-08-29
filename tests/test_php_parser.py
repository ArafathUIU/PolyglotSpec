import pytest
from polyglotspec.parsers.php import LaravelFormRequestParser

def test_parse_basic_laravel_rules():
    code = r"""
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'body' => 'required',
            'age' => ['nullable', 'integer', 'min:18'],
            'score' => 'numeric|between:1,100',
            'email' => 'required|email',
        ];
    }
}
"""
    parser = LaravelFormRequestParser()
    models = parser.parse(code)
    
    assert "StorePostRequest" in models
    fields = models["StorePostRequest"]["fields"]
    
    assert fields["title"]["type"] == "string"
    assert fields["title"]["required"] is True
    assert fields["title"]["max"] == 255
    
    assert fields["body"]["required"] is True
    
    assert fields["age"]["type"] == "integer"
    assert fields["age"]["nullable"] is True
    assert fields["age"]["required"] is False
    assert fields["age"]["min"] == 18
    
    assert fields["score"]["type"] == "number"
    assert fields["score"]["min"] == 1
    assert fields["score"]["max"] == 100
    
    assert fields["email"]["format"] == "email"
    assert fields["email"]["required"] is True
