"""
Logging Module (M18)

Handles application logging - writes to rotating log files with support for filtering and retrieval of recent entries.
"""

import os
import json
import logging
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler

# Constants
DEFAULT_LEVEL = "INFO"
MAX_LOG_SIZE_MB = 10
BACKUP_COUNT = 5

# Log directory can be set via environment variable
LOG_DIR = os.environ.get("LOG_DIR", os.path.join(os.getcwd(), "logs"))

# Module state
_active_logger = None
_log_level = logging.INFO
_log_file_path = None
_store_type = "FILE"

# Exceptions
class LoggingError(Exception):
    """Base exception for this module"""
    pass

class ConfigError(LoggingError):
    """Raised when logger configuration fails"""
    pass

class WriteError(LoggingError):
    """Raised when we can't write to the log"""
    pass

class ReadError(LoggingError):
    """Raised when we can't read the log file"""
    pass

class ArchiveError(LoggingError):
    """Raised when log rotation fails"""
    pass

class ISO8601Formatter(logging.Formatter):
    """Formats timestamps as ISO 8601 (e.g. 2025-11-11T09:30:00.123Z)"""
    
    def formatTime(self, record, datefmt=None):
        dt = datetime.fromtimestamp(record.created, tz=timezone.utc)
        return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

def initLogger(logConfig):
    """Initialize the logger with the given config dict."""
    global _active_logger, _log_level, _log_file_path, _store_type
    
    try:
        _store_type = logConfig.get('storeType', 'FILE')
        level_str = logConfig.get('level', DEFAULT_LEVEL)
        file_name = logConfig.get('fileName') or 'app.log'
        
        _log_level = getattr(logging, level_str.upper(), logging.INFO)
        
        # Create log directory if needed
        if not os.path.exists(LOG_DIR):
            os.makedirs(LOG_DIR)
        
        _log_file_path = os.path.join(LOG_DIR, file_name)
        
        _active_logger = logging.getLogger("DomainXLogger")
        _active_logger.setLevel(_log_level)
        
        # Clear old handlers on reinit
        if _active_logger.hasHandlers():
            _active_logger.handlers.clear()
        
        if _store_type == 'FILE':
            handler = RotatingFileHandler(
                _log_file_path,
                maxBytes=MAX_LOG_SIZE_MB * 1024 * 1024,
                backupCount=BACKUP_COUNT
            )
            handler.setFormatter(ISO8601Formatter('%(asctime)s | %(levelname)s | %(message)s'))
            _active_logger.addHandler(handler)
        
        return True
    except Exception as e:
        raise ConfigError(f"Failed to initialize logger: {str(e)}")


def logEvent(message, level, context=None):
    """Log an event."""
    global _active_logger, _log_level
    
    try:
        # Auto-init if needed
        if _active_logger is None:
            initLogger({'level': DEFAULT_LEVEL, 'storeType': 'FILE'})
        
        numeric_level = getattr(logging, level.upper(), logging.INFO)
        
        # Skip if below threshold
        if numeric_level < _log_level:
            return False
        
        payload = {
            "message": message,
            "context": context or {}
        }
        _active_logger.log(numeric_level, json.dumps(payload))
        return True
    except Exception as e:
        raise WriteError(f"Failed to write log entry: {str(e)}")


def getRecentLogs(limit, log_filter=None):
    """Get recent log entries, newest first."""
    if _active_logger is None or _log_file_path is None:
        return []
    
    if not os.path.exists(_log_file_path):
        return []
    
    entries = []
    try:
        with open(_log_file_path, 'r') as f:
            lines = f.readlines()
        
        # Process newest first
        for line in reversed(lines):
            if len(entries) >= limit:
                break
            
            line = line.strip()
            if not line:
                continue
            
            parts = line.split(' | ')
            if len(parts) < 3:
                continue
            
            timestamp = parts[0]
            level_name = parts[1]
            content = parts[2]
            
            # Parse the JSON payload
            try:
                data = json.loads(content)
                message = data.get("message", "")
                context = data.get("context", {})
            except json.JSONDecodeError:
                message = content
                context = {}
            
            # Apply filters
            if log_filter:
                min_level_str = log_filter.get("minLevel")
                if min_level_str:
                    min_value = getattr(logging, min_level_str.upper(), 0)
                    curr_value = getattr(logging, level_name.upper(), 0)
                    if curr_value < min_value:
                        continue
                
                contains_text = log_filter.get("containsText")
                if contains_text and contains_text.lower() not in message.lower():
                    continue
            
            entries.append({
                "timestamp": timestamp,
                "level": level_name,
                "message": message,
                "context": context
            })
        
        return entries
    except Exception as e:
        raise ReadError(f"Failed to read log entries: {str(e)}")


def archiveLogs():
    """Force log rotation."""
    if _active_logger is None:
        raise ArchiveError("Logger not initialized. Call initLogger() first.")
    
    try:
        for handler in _active_logger.handlers:
            if isinstance(handler, RotatingFileHandler):
                handler.doRollover()
        
        return True
    except Exception as e:
        raise ArchiveError(f"Failed to archive logs: {str(e)}")