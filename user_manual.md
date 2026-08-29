# PolyglotSpec User Manual 🛰️

Welcome to **PolyglotSpec**—the static API contract drift and boundary verification tool built for polyglot microservice architectures. This manual details how to install, configure, play in the browser sandbox, run command line analysis, and automate contract checks inside your CI/CD pipelines.

---

## Table of Contents
1. [Core Architecture Overview](#1-core-architecture-overview)
2. [Installation & Local Setup](#2-installation--local-setup)
3. [CLI Commands Reference](#3-cli-commands-reference)
4. [Visual Console Guide](#4-visual-console-guide)
5. [AI Copilot Resolution Advisor](#5-ai-copilot-resolution-advisor)
6. [CI/CD Integration & Automation](#6-cicd-integration--automation)

---

## 1. Core Architecture Overview

In multi-language backends (e.g. PHP/Laravel handling frontend routes and Python/FastAPI processing ML requests), validation contracts are often duplicated across languages. If a developer alters a validation parameter (e.g. changing string length or nullable constraints), it is highly likely that downstream client APIs will fail silently.

PolyglotSpec solves this statically by:
* **AST Scanners**: Inspecting validation declarations in single source code files without executing code or initializing runtime contexts.
* **Canonical IR**: Converting rule structures into standard JSON Schema (Draft 2020-12).
* **Drift Analyzer**: Scanning expectations and raising warning or breaking error events.
* **Adversarial Fuzzer**: Generating boundary tests based on JSON Schema constraints to target active API endpoints.

---

## 2. Installation & Local Setup

PolyglotSpec requires Python 3.10 or higher.

### A. Clone and Install CLI Package
Register the package inside your local workspace command line:
```bash
# Clone the repository
git clone https://github.com/ArafathUIU/PolyglotSpec.git
cd PolyglotSpec

# Install in editable mode
pip install -e .
```

### B. Development & Test Suite Setup
If you want to run the core Python AST unit test suites:
```bash
pip install -e ".[dev]"
pytest
```

---

## 3. CLI Commands Reference

PolyglotSpec registers the `polyglotspec` executable command globally in your environment shell.

### A. `polyglotspec check <FILE_PATH>`
Parses a local PHP/Laravel `FormRequest`, Python `Pydantic` Model, or TypeScript `Zod` validation schema, converting it to standard canonical JSON schema.
```bash
# Parse a Laravel PHP request validator
polyglotspec check samples/StorePostRequest.php

# Parse a Python FastAPI Pydantic schema
polyglotspec check samples/post_models.py
```

### B. `polyglotspec diff <CONSUMER_FILE> <PROVIDER_FILE>`
Compares consumer validation expectations against provider contract rules. 
* Exits with **status code `0`** if contracts are fully compatible.
* Exits with **status code `1`** (blocking pipeline merges) if any breaking drifts are found.

```bash
polyglotspec diff samples/StorePostRequest.php samples/post_models.py
```

### C. `polyglotspec fuzz <SCHEMA_FILE>`
Generates validation-breaking boundary test cases based on schema constraints.
```bash
# Output generated fuzzer test JSON payloads:
polyglotspec fuzz samples/post_models.py

# Fire fuzzer payloads against a target running endpoint:
polyglotspec fuzz samples/post_models.py --target http://localhost:8000/api/users
```

---

## 4. Visual Console Guide

PolyglotSpec contains a luxury, dark-themed local browser workspace dashboard. To launch the console locally:
```bash
cd dashboard
npm install
npm run dev
```
Open **`http://localhost:5173`** in your web browser.

### Console Pages:
* **Overview Dashboard**: Renders connected microservice metrics, alert levels, sync scores, and a live timeline tracking change history.
* **Diff Analyzer Playground**: Load presets, select language options, and modify consumer/provider JSON rules side-by-side to watch the drift outputs update in real-time.
* **Fuzz Simulator**: Execute dynamic type mutations, boundary overflows, and semantic edge cases against target ports directly from the browser window.
* **CI/CD Guide**: Toggle branches and path settings to generate deployment pipeline scripts.

---

## 5. AI Copilot Resolution Advisor

The Visual Diff Analyzer integrates a hybrid **AI Copilot** to explain and auto-resolve contract drifts:

1. **Ask AI Copilot**: Click the **"🪄 AI Copilot"** button on any mismatch card.
   * If **Ollama** is running locally (e.g. `http://localhost:11434`), the dashboard queries your local `llama3` instance to get a custom contract explanation.
   * If Ollama is offline, it falls back to the built-in static **Local AI Advisor** to explain the crash risk.
2. **Apply Alignment Fixes**: The panel renders **"Align Consumer"** and **"Align Provider"** actions. Click either button to automatically modify schema values inside your textareas to resolve the contract drift immediately.

---

## 6. CI/CD Integration & Automation

Copy and paste these scripts into your repository directory to fail pull requests when API validation rules drift:

### GitHub Actions Workflow
Save as `.github/workflows/api-drift.yml`:
```yaml
name: API Contract Drift Check

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  contract-check:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install PolyglotSpec
        run: |
          pip install git+https://github.com/ArafathUIU/PolyglotSpec.git

      - name: Detect Contract Drift
        run: |
          # Fails the build pipeline if breaking changes exist
          polyglotspec diff app/Http/Requests/StoreUserRequest.php app/models/user.py
```

### GitLab CI/CD Pipeline
Save inside your `.gitlab-ci.yml` configuration:
```yaml
stages:
  - test

contract-drift-check:
  stage: test
  image: python:3.11-slim
  before_script:
    - apt-get update && apt-get install -y git
    - pip install git+https://github.com/ArafathUIU/PolyglotSpec.git
  script:
    - polyglotspec diff app/Http/Requests/StoreUserRequest.php app/models/user.py
  only:
    - main
    - merge_requests
```

---
*For issues or contributions, check the core open-source codebase repository.*
