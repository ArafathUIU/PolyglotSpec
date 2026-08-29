import click
import colorama
from polyglotspec import __version__

colorama.init(autoreset=True)

@click.group()
@click.version_option(version=__version__)
def main():
    """PolyglotSpec - Detect API contract drift across multi-language microservices."""
    pass

import os
import json

def get_parser_for_file(filepath: str):
    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".py":
        from polyglotspec.parsers.python import PydanticParser
        return PydanticParser()
    elif ext == ".php":
        from polyglotspec.parsers.php import LaravelFormRequestParser
        return LaravelFormRequestParser()
    elif ext in (".ts", ".tsx", ".js", ".jsx"):
        from polyglotspec.parsers.typescript import ZodSchemaParser
        return ZodSchemaParser()
    else:
        raise ValueError(f"Unsupported file extension: {ext}")

@main.command()
@click.argument('path', type=click.Path(exists=True))
def check(path):
    """Statically parse and output schema validation rules from a source file."""
    try:
        parser = get_parser_for_file(path)
        parsed = parser.parse_file(path)
        
        from polyglotspec.normalizer import CanonicalNormalizer
        normalizer = CanonicalNormalizer()
        schemas = normalizer.normalize(parsed)
        
        click.echo(json.dumps(schemas, indent=2))
    except Exception as e:
        click.echo(f"Error checking file: {e}", err=True)
        raise click.Abort()

import sys

def load_schema_from_file(filepath: str) -> dict:
    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".json":
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        if "properties" in data:
            return {"Default": data}
        return data
    else:
        parser = get_parser_for_file(filepath)
        parsed = parser.parse_file(filepath)
        from polyglotspec.normalizer import CanonicalNormalizer
        normalizer = CanonicalNormalizer()
        return normalizer.normalize(parsed)

@main.command()
@click.argument('consumer', type=click.Path(exists=True))
@click.argument('provider', type=click.Path(exists=True))
def diff(consumer, provider):
    """Compare consumer and provider validation rules for contract drift."""
    try:
        consumer_schemas = load_schema_from_file(consumer)
        provider_schemas = load_schema_from_file(provider)
        
        from polyglotspec.diff import SchemaDiffEngine, format_diff
        engine = SchemaDiffEngine()
        
        # If there is only one schema in each, we can map them directly even if names differ
        if len(consumer_schemas) == 1 and len(provider_schemas) == 1:
            c_schema = list(consumer_schemas.values())[0]
            p_schema = list(provider_schemas.values())[0]
            mismatches = engine.diff(c_schema, p_schema)
            click.echo(format_diff(mismatches))
            has_breaking = any(m.severity == "breaking" for m in mismatches)
            if has_breaking:
                sys.exit(1)
            return
            
        # Otherwise, match schemas by model/class name
        all_mismatches = []
        for name, c_schema in consumer_schemas.items():
            if name in provider_schemas:
                p_schema = provider_schemas[name]
                click.echo(f"\nComparing model: {name}")
                mismatches = engine.diff(c_schema, p_schema)
                click.echo(format_diff(mismatches))
                all_mismatches.extend(mismatches)
            else:
                click.echo(f"\nConsumer schema {name} not found in provider schemas.")
                
        has_breaking = any(m.severity == "breaking" for m in all_mismatches)
        if has_breaking:
            sys.exit(1)
            
    except Exception as e:
        click.echo(f"Error comparing schemas: {e}", err=True)
        sys.exit(1)

@main.command()
@click.argument('schema_file', type=click.Path(exists=True))
@click.option('--target', help="Target URL of the microservice endpoint to fuzz.")
@click.option('--slm-endpoint', help="Optional SLM HTTP endpoint for semantic fuzzing.")
@click.option('--model', default="llama3", help="Model name to use for SLM endpoint.")
def fuzz(schema_file, target, slm_endpoint, model):
    """Generate and run adversarial test payloads to fuzz target API."""
    try:
        schemas = load_schema_from_file(schema_file)
        if not schemas:
            click.echo("No schemas found in file.", err=True)
            sys.exit(1)
            
        schema_name, schema = list(schemas.items())[0]
        
        from polyglotspec.fuzzer import AdversarialFuzzer
        fuzzer = AdversarialFuzzer(schema)
        
        deterministic = fuzzer.generate_deterministic_payloads()
        semantic = fuzzer.generate_semantic_payloads(slm_endpoint=slm_endpoint, model=model)
        all_cases = deterministic + semantic
        
        if not target:
            click.echo(json.dumps(all_cases, indent=2))
            return
            
        click.echo(f"Fuzzing target endpoint: {target} with {len(all_cases)} test cases...")
        results = fuzzer.run_fuzz_test(target, all_cases)
        
        from colorama import Fore, Style
        has_issue = False
        for res in results:
            scenario = res["scenario"]
            outcome = res["outcome"]
            status = res["status_code"]
            msg = res["message"]
            
            if outcome == "passed":
                click.echo(f"{Fore.GREEN}✔ PASS{Style.RESET_ALL} [{scenario}]: {msg}")
            elif outcome == "leak":
                click.echo(f"{Fore.YELLOW}⚠️ LEAK{Style.RESET_ALL} [{scenario}]: {msg}")
                has_issue = True
            elif outcome == "crash":
                click.echo(f"{Fore.RED}💥 CRASH{Style.RESET_ALL} [{scenario}]: {msg}")
                has_issue = True
            else:
                click.echo(f"{Fore.RED}❌ ERROR{Style.RESET_ALL} [{scenario}]: {msg}")
                has_issue = True
                
        if has_issue:
            sys.exit(1)
            
    except Exception as e:
        click.echo(f"Error executing fuzz test: {e}", err=True)
        sys.exit(1)

if __name__ == '__main__':
    main()
