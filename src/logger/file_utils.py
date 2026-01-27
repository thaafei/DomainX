from __future__ import annotations

import gzip
import os
from typing import List

from .constants import BACKUP_COUNT, BLOCK_SIZE
from .exceptions import ReadError


def candidate_log_files(base_path: str) -> List[str]:
    """
    Include current log +rotated backups.
    Supports both uncompressed and compressed backups:
      app.log
      app.log.1 / app.log.1.gz
      app.log.2 / app.log.2.gz
      ...
    Returned in newest-first preference: base, .1, .2, ...
    """
    files: List[str] = []

    if os.path.exists(base_path):
        files.append(base_path)

    for i in range(1, BACKUP_COUNT + 1):
        p = f"{base_path}.{i}"
        pgz = f"{p}.gz"

        if os.path.exists(p):
            files.append(p)
        if os.path.exists(pgz):
            files.append(pgz)

    return files


def read_last_n_lines(path: str,n: int) -> List[str]:
    """
    Tail reader:
    - For normal files: efficient-ish backward read in blocks.
    - For .gz files: read text and take last n lines (backups are bounded by size/count).
    """
    if n <= 0:
        return []
    try:
        if path.endswith(".gz"):
            with gzip.open(path, "rt", encoding="utf-8",errors="replace") as f:
                lines = f.read().splitlines()

                return lines[-n:]

        with open(path, "rb") as f:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            data = b""
            lines: List[bytes] = []
            pos = size

            while pos > 0 and len(lines) <= n:
                step = min(BLOCK_SIZE, pos)
                pos -= step
                f.seek(pos)
                chunk = f.read(step)
                data = chunk + data
                lines = data.splitlines()

            return [ln.decode("utf-8", errors="replace") for ln in lines[-n:]]

    except Exception as e:
        raise ReadError(f"Failed to read log file {path}: {e}") from e
