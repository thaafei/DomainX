This module provides a centralized, file-based logging service for recording, retrieving, and archiving system events, implemented according to MIS Section 6.18 (Logging Module).

It is designed as a standalone Python module and does not require Django or database integration.

```
logger/
├── api.py              # MIS-facing public API
├── file_logger.py      # Core logging implementation
├── file_utils.py       # File I/O helpers
├── types.py            # Data models
├── constants.py        # Configuration constants
├── exceptions.py       # Module-specific exceptions
└── __init__.py         # Public exports
```

GETTING STARTED

1) Import the module

```
from logger import (
    initLogger,
    logEvent,
    getRecentLogs,
    archiveLogs,
    LogConfig,
    LogLevel,
    LogFilter
)
```

2) Initialize the logger

```
config = LogConfig(
    level=LogLevel.INFO,
    logDir="./logs",     # Directory where logs are stored
    fileName=None        # Defaults to "app.log" if None
)

initLogger(config)
```

Note: If fileName is not provided, the logger defaults to app.log (as specified in the MIS).

3) Logging Events

```
success = logEvent(
    message="User login successful",
    level=LogLevel.INFO,
    context={"userId": "123", "ip": "127.0.0.1"}
)
```

4) Retrieving Logs

```
logs = getRecentLogs(limit=10)

```

5) Apply Filters

```
filter = LogFilter(
    minLevel=LogLevel.ERROR,
    containsText="database"
)

logs = getRecentLogs(20, filter)
```

6) Log Archiving

```
archiveLogs()
```

Note: When the active log file exceeds MAX_LOG_SIZE_MB:

    The log file is rotated

    Older logs are renamed (app.log.1, app.log.2, …)

    Rotated logs are compressed as .gz

    Archived logs are still searchable via getRecentLogs().

EXCEPTIONS

| Exception      | Description                                |
| -------------- | ------------------------------------------ |
| `ConfigError`  | Invalid or missing logger configuration    |
| `WriteError`   | Failure while writing logs                 |
| `ReadError`    | Failure while reading logs                 |
| `ArchiveError` | Failure during log rotation or compression |


This module implements the following exported access programs from MIS 6.18:

    initLogger(logConfig)

    logEvent(message, level, context)

    getRecentLogs(limit, [filter])

    archiveLogs()

    Internal helper functions and classes are encapsulated and not exposed.