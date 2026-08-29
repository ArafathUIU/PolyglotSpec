import os
import json
import pytest
from click.testing import CliRunner
from polyglotspec.cli import main

@pytest.fixture
def temp_files(tmp_path):
    # 1. FastAPI (Python) Pydantic Model
    python_code = """
from pydantic import BaseModel, Field

class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    email: str = Field(..., pattern=r"^\\S+@\\S+\\.\\S+$")
    age: int = Field(18, ge=18)
"""
    python_file = tmp_path / "user_model.py"
    python_file.write_text(python_code, encoding="utf-8")

    # 2. Laravel (PHP) FormRequest with matching constraints (should not drift)
    laravel_code_ok = r"""
<?php
namespace App\Http\Requests;
class StoreUserRequest {
    public function rules() {
        return [
            'username' => 'required|string|min:3|max:20',
            'email' => 'required|string|email',
            'age' => 'integer|min:18'
        ];
    }
}
"""
    laravel_file_ok = tmp_path / "StoreUserRequestOk.php"
    laravel_file_ok.write_text(laravel_code_ok, encoding="utf-8")

    # 3. Laravel (PHP) FormRequest with drift (breaking changes: tightened username min length to 5, made age required)
    laravel_code_drift = r"""
<?php
namespace App\Http\Requests;
class StoreUserRequest {
    public function rules() {
        return [
            'username' => 'required|string|min:2|max:30', # Loosened min (provider expects >=3, so consumer sending length 2 will fail on provider!)
            'email' => 'required|string',
            'age' => 'required|integer|min:10' # Loosened min (provider expects >=18, so consumer sending 10 will fail!)
        ];
    }
}
"""
    laravel_file_drift = tmp_path / "StoreUserRequestDrift.php"
    laravel_file_drift.write_text(laravel_code_drift, encoding="utf-8")

    return {
        "python": str(python_file),
        "php_ok": str(laravel_file_ok),
        "php_drift": str(laravel_file_drift)
    }

def test_cli_check(temp_files):
    runner = CliRunner()
    result = runner.invoke(main, ["check", temp_files["python"]])
    
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert "CreateUserRequest" in data
    assert data["CreateUserRequest"]["properties"]["username"]["type"] == "string"

def test_cli_diff_no_drift(temp_files):
    runner = CliRunner()
    result = runner.invoke(main, ["diff", temp_files["php_ok"], temp_files["python"]])
    
    assert result.exit_code == 0
    assert "No contract drift detected" in result.output

def test_cli_diff_with_drift(temp_files):
    runner = CliRunner()
    result = runner.invoke(main, ["diff", temp_files["php_drift"], temp_files["python"]])
    
    # Drift has breaking changes, so command must exit with 1!
    assert result.exit_code == 1
    assert "Breaking" in result.output
    # Check specific breaking scenarios
    assert "minLength tightened" in result.output or "minimum tightened" in result.output

def test_cli_fuzz_generation(temp_files):
    runner = CliRunner()
    result = runner.invoke(main, ["fuzz", temp_files["python"]])
    
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert len(data) > 0
    # Must contain a baseline valid payload
    scenarios = [item["scenario"] for item in data]
    assert "Baseline valid payload" in scenarios
