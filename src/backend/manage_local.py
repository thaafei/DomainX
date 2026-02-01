import os
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_HOST = os.getenv("DJANGO_RUN_HOST", "0.0.0.0")
DEFAULT_PORT = os.getenv("DJANGO_RUN_PORT", "8000")


def run(cmd: list[str], env=None):
    print("\n➡️", " ".join(cmd))
    subprocess.check_call(cmd, cwd=str(BASE_DIR), env=env or os.environ.copy())


def load_env():
    try:
        from dotenv import load_dotenv
        load_dotenv(BASE_DIR / ".env", override=True)
    except Exception:
        pass


def main():
    load_env()

    if len(sys.argv) < 2:
        print("""
Usage:
  python manage_local.py migrate
  python manage_local.py runserver [host] [port]
  python manage_local.py worker
  python manage_local.py loaddata <fixture_name>
  python manage_local.py dev


- runserver defaults to 0.0.0.0:8000 (matches React proxy http://localhost:8000)
- set DJANGO_RUN_PORT to override
""".strip())
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "migrate":
        run([sys.executable, "manage.py", "migrate"])
        return

    if cmd == "runserver":
        host = sys.argv[2] if len(sys.argv) >= 3 else DEFAULT_HOST
        port = sys.argv[3] if len(sys.argv) >= 4 else DEFAULT_PORT
        run([sys.executable, "manage.py", "runserver", f"{host}:{port}"])
        return

    if cmd == "worker":
        if not os.getenv("CELERY_BROKER_URL"):
            print("CELERY_BROKER_URL is not set. Check backend/.env")
        run(["celery", "-A", "DomainX", "worker", "-l", "info", "-P", "solo"])
        return

    if cmd == "loaddata":
        if len(sys.argv) < 3:
            print("Usage: python manage_local.py loaddata <fixture_name>")
            sys.exit(1)
        fixture = sys.argv[2]
        run([sys.executable, "manage.py", "loaddata", fixture])
        return

    if cmd == "dev":
        run([sys.executable, "manage.py", "migrate"])
        run([sys.executable, "manage.py", "runserver", f"{DEFAULT_HOST}:{DEFAULT_PORT}"])
        return

    print(f"Unknown command: {cmd}")
    sys.exit(1)


if __name__ == "__main__":
    main()
