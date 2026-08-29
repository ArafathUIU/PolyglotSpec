import click
import colorama
from polyglotspec import __version__

colorama.init(autoreset=True)

@click.group()
@click.version_option(version=__version__)
def main():
    """PolyglotSpec - Detect API contract drift across multi-language microservices."""
    pass

@main.command()
@click.argument('path', type=click.Path(exists=True))
def check(path):
    """Statically parse and output schema validation rules from a source file."""
    click.echo(f"Checking contract fields and rules in: {path}")

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
