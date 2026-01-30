from __future__ import annotations

import gzip
import json
import logging
import os
import shutil
import threading
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from typing import Any, Dict, List, Optional

from .constants import BACKUP_COUNT, DEFAULT_LOG_FILENAME, MAX_LOG_SIZE_MB
from .exceptions import ArchiveError, ConfigError, ReadError, WriteError
from .file_utils import candidate_log_files, read_last_n_lines
from .types import LogConfig, LogEntry, LogFilter, LogLevel


_LEVEL_MAP = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _normalize_level(level: Any) -> LogLevel:
    if isinstance(level, LogLevel):
        return level
    if isinstance(level, str):
        upper = level.strip().upper()
        if upper in LogLevel.__members__:
            return LogLevel[upper]
    raise ConfigError(f"Invalid log level: {level!r}")


def _entry_to_json(entry: LogEntry) -> str:
    return json.dumps(
        {
            "timestamp": entry.timestamp,
            "level": entry.level.value,
            "message": entry.message,
            "context": entry.context,
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )


def _parse_entry(line: str) -> Optional[LogEntry]:
    line = line.strip()
    if not line:
        return None
    try:
        obj = json.loads(line)
        return LogEntry(
            timestamp=str(obj.get("timestamp", "")),
            level=_normalize_level(obj.get("level", "INFO")),
            message=str(obj.get("message", "")),
            context={str(k): str(v) for k, v in (obj.get("context") or {}).items()},
        )
    except Exception:
        return None


def _meets_threshold(entry_level: LogLevel, configured_level: LogLevel) -> bool:
    return _LEVEL_MAP[entry_level.value] >= _LEVEL_MAP[configured_level.value]


def _passes_filter(entry: LogEntry, flt: Optional[LogFilter]) -> bool:
    if flt is None:
        return True

    if flt.minLevel is not None:
        if _LEVEL_MAP[entry.level.value] < _LEVEL_MAP[flt.minLevel.value]:
            return False

    if flt.containsText:
        needle = flt.containsText.lower()

        if needle in (entry.message or "").lower():
            return True

        ctx = " ".join([f"{k}={v}" for k, v in entry.context.items()]).lower()
        return needle in ctx

    return True


class FileLogger:
    """
    MIS updates applied:
    - default filename is app.log when fileName is None
    - logEvent returns successFlag = false when below threshold (not persisted)
    - archiveLogs compresses and rotates when size exceeded
    """

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._logger: Optional[logging.Logger] = None
        self._handler: Optional[RotatingFileHandler] = None
        self._log_level: LogLevel = LogLevel.INFO
        self._log_path: Optional[str] = None

    @property
    def initialized(self) -> bool:
        with self._lock:
            return self._logger is not None and self._handler is not None and self._log_path is not None

    def init(self, config: LogConfig) -> bool:
        """
        MIS: initLogger(logConfig)
        - transition: initializes logger with parameters in logConfig
        - output: successFlag = true if success
        - exception: ConfigError if invalid/missing keys
        """
        with self._lock:
            try:
                if config.storeType.strip().upper() != "FILE":
                    raise ConfigError("Only file-based logging (storeType=FILE) is supported for peer implementation.")

                self._log_level = _normalize_level(config.level)

                log_dir = (config.logDir or "").strip() or "./logs"
                file_name = (config.fileName or "").strip() or DEFAULT_LOG_FILENAME  # MIS: app.log default

                os.makedirs(log_dir, exist_ok=True)
                self._log_path = os.path.join(log_dir, file_name)

                logger = logging.getLogger("DomainX.M18")
                logger.setLevel(_LEVEL_MAP[self._log_level.value])
                logger.propagate = False

                for h in list(logger.handlers):
                    logger.removeHandler(h)
                    try:
                        h.close()
                    except Exception:
                        pass

                handler = RotatingFileHandler(
                    self._log_path,
                    maxBytes=MAX_LOG_SIZE_MB * 1024 * 1024,
                    backupCount=BACKUP_COUNT,
                    encoding="utf-8",
                )
                handler.setFormatter(logging.Formatter("%(message)s"))
                handler.setLevel(_LEVEL_MAP[self._log_level.value])
                logger.addHandler(handler)

                self._logger = logger
                self._handler = handler
                return True
            except ConfigError:
                raise
            except Exception as e:
                raise ConfigError(f"Failed to initialize logger: {e}") from e

    def _gzip_file(self, path: str) -> str:
        """
        Compress a rotated log file in-place:
          app.log.1 -> app.log.1.gz (then remove app.log.1)
        """
        gz_path = path + ".gz"
        with open(path, "rb") as f_in, gzip.open(gz_path, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)
        os.remove(path)
        return gz_path

    def log_event(self, message: str, level: LogLevel, context: Dict[str, str]) -> bool:
        """
        MIS: logEvent(message, level, context)
        - Create LogEntry using current clock for timestamp.
        - If level is below threshold: do not persist, return successFlag = false.
        - If storeType = FILE: append to logDir/fileName (default app.log).
        - exception: WriteError if log store cannot be written.
        """
        with self._lock:
            if not self.initialized:
                raise WriteError("Logger not initialized. Call initLogger(logConfig) first.")

            assert self._logger is not None
            lvl = _normalize_level(level)
            if not _meets_threshold(lvl, self._log_level):
                return False

            entry = LogEntry(
                timestamp=_utc_timestamp(),
                level=lvl,
                message=str(message),
                context={str(k): str(v) for k, v in (context or {}).items()},
            )

            try:
                self._logger.log(_LEVEL_MAP[lvl.value], _entry_to_json(entry))
                return True
            except Exception as e:
                raise WriteError(f"Failed to write log entry: {e}") from e

    def get_recent_logs(self, limit: int, flt: Optional[LogFilter] = None) -> List[LogEntry]:
        """
        MIS: getRecentLogs(limit, [filter])
        - transition: reads entries, applies filter, returns most recent limit entries.
        - output: list(LogEntry)
        - exception: ReadError if logs cannot be retrieved.
        """
        if limit <= 0:
            return []

        with self._lock:
            if not self.initialized:
                raise ReadError("Logger not initialized. Call initLogger(logConfig) first.")
            assert self._log_path is not None

            files = candidate_log_files(self._log_path)
            results: List[LogEntry] = []

            try:
                for fp in files:
                    tail_lines = read_last_n_lines(fp, n=min(max(limit * 5, limit), 5000))

                    for line in reversed(tail_lines):
                        entry = _parse_entry(line)
                        if entry is None:
                            continue
                        if not _passes_filter(entry, flt):
                            continue
                        results.append(entry)
                        if len(results) >= limit:
                            return results

                return results
            except ReadError:
                raise
            except Exception as e:
                raise ReadError(f"Failed to read recent logs: {e}") from e

    def archive_logs(self) -> bool:
        """
        MIS: archiveLogs()
        - transition: compresses and rotates existing log files once they exceed MAX_LOG_SIZE_MB.
        - output: successFlag = true if archiving succeeds.
        - exception: ArchiveError if file rotation fails.
        """
        with self._lock:
            if not self.initialized:
                raise ArchiveError("Logger not initialized. Call initLogger(logConfig) first.")
            assert self._handler is not None and self._log_path is not None

            try:
                if not os.path.exists(self._log_path):
                    return True

                size = os.path.getsize(self._log_path)
                if size <= MAX_LOG_SIZE_MB * 1024 * 1024:
                    return True

                self._handler.doRollover()

                rotated = f"{self._log_path}.1"
                if os.path.exists(rotated):
                    self._gzip_file(rotated)

                return True
            except Exception as e:
                raise ArchiveError(f"Failed to archive logs: {e}") from e
