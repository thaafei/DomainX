from __future__ import annotations

from typing import Dict, List, Optional

from .file_logger import FileLogger
from .types import LogConfig, LogEntry, LogFilter, LogLevel

_logger = FileLogger()

def initLogger(logConfig: LogConfig) -> bool:
    return _logger.init(logConfig)


def logEvent(message: str, level: LogLevel, context: Dict[str, str]) -> bool:
    return _logger.log_event(message, level, context)


def getRecentLogs(limit: int, flt: Optional[LogFilter] = None) -> List[LogEntry]:
    return _logger.get_recent_logs(limit, flt)


def archiveLogs() -> bool:
    return _logger.archive_logs()
