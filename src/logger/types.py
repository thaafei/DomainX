from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Optional


class LogLevel(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


@dataclass(frozen=True)
class LogEntry:
    timestamp: str
    level: LogLevel
    message: str
    context: Dict[str, str]


@dataclass(frozen=True)
class LogFilter:
    minLevel: Optional[LogLevel] = None
    containsText: Optional[str] = None


@dataclass(frozen=True)
class LogConfig:
    storeType: str = "FILE"   # "FILE" | "DB" (DB out of scope)
    level: LogLevel = LogLevel.INFO
    fileName: Optional[str] = None
    logDir: str = "./logs"
