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

@main.command()
@click.argument('consumer', type=click.Path(exists=True))
@click.argument('provider', type=click.Path(exists=True))
def diff(consumer, provider):
    """Compare consumer and provider validation rules for contract drift."""
    click.echo(f"Diffing consumer ({consumer}) against provider ({provider})...")

@main.command()
@click.argument('schema_file', type=click.Path(exists=True))
@click.option('--target', help="Target URL of the microservice endpoint to fuzz.")
def fuzz(schema_file, target):
    """Generate and run adversarial test payloads to fuzz target API."""
    click.echo(f"Fuzzing schema: {schema_file}")
    if target:
        click.echo(f"Target endpoint: {target}")

if __name__ == '__main__':
    main()
