import os
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

def run(cmd: list[str], env=None):
    print("\n➡️", " ".join(cmd))
    subprocess.check_call(cmd, cwd=str(BASE_DIR), env=env or os.environ.copy())

def main():
    try:
        from dotenv import load_dotenv
        load_dotenv(BASE_DIR / ".env")
    except Exception:
        pass

    if len(sys.argv) < 2:
        print("""
Usage:
  python manage_local.py migrate
  python manage_local.py runserver
  python manage_local.py worker
  python manage_local.py dev

dev = migrate + runserver (worker runs in separate terminal)
""".strip())
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "migrate":
        run([sys.executable, "manage.py", "migrate"])
        return

    if cmd == "runserver":
        run([sys.executable, "manage.py", "runserver"])
        return

    if cmd == "worker":
        run(["celery", "-A", "DomainX", "worker", "-l", "info", "-P", "solo"])
        return

    if cmd == "dev":
        run([sys.executable, "manage.py", "migrate"])
        run([sys.executable, "manage.py", "runserver"])
        return

    print(f"Unknown command: {cmd}")
    sys.exit(1)

if __name__ == "__main__":
    main()
