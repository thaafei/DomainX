import sys
from unittest.mock import patch, call, ANY
import pytest

import manage_local

def test_main_no_args_exits(capsys):
    with patch.object(sys, "argv", ["manage_local.py"]):
        with pytest.raises(SystemExit) as exc:
            manage_local.main()

    assert exc.value.code == 1

    captured = capsys.readouterr()
    assert "Usage:" in captured.out

def test_main_migrate_runs_manage_py():
    with patch.object(sys, "argv", ["manage_local.py", "migrate"]):
        with patch("manage_local.subprocess.check_call") as mock_call:
            manage_local.main()

    mock_call.assert_called_once_with(
        [sys.executable, "manage.py", "migrate"],
        cwd=str(manage_local.BASE_DIR),
        env=ANY,
    )

def test_main_runserver_runs_manage_py():
    with patch.object(sys, "argv", ["manage_local.py", "runserver"]):
        with patch("manage_local.subprocess.check_call") as mock_call:
            manage_local.main()

    mock_call.assert_called_once()
    args, _ = mock_call.call_args

    assert args[0] == [sys.executable, "manage.py", "runserver", "0.0.0.0:8000"]

def test_main_worker_runs_celery():
    with patch.object(sys, "argv", ["manage_local.py", "worker"]):
        with patch("manage_local.subprocess.check_call") as mock_call:
            manage_local.main()

    mock_call.assert_called_once_with(
        ["celery", "-A", "DomainX", "worker", "-l", "info", "-P", "solo"],
        cwd=str(manage_local.BASE_DIR),
        env=ANY,
    )


def test_main_unknown_command_exits(capsys):
    with patch.object(sys, "argv", ["manage_local.py", "wat"]):
        with pytest.raises(SystemExit) as exc:
            manage_local.main()

    assert exc.value.code == 1
    captured = capsys.readouterr()
    assert "Unknown command" in captured.out
