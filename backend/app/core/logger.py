import logging
from typing import Optional

from loguru import logger

from app.core.config import get_settings


class InterceptHandler(logging.Handler):
    """Redirect standard logging to loguru for unified formatting."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno
        logger.opt(depth=6, exception=record.exc_info).log(level, record.getMessage())


def setup_logging(level: Optional[str] = None) -> None:
    settings = get_settings()
    logger.remove()
    logger.add(
        sink=lambda msg: print(msg, end=""),  # stdout
        level=level or settings.log_level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level}</level> | {message}",
        backtrace=settings.debug,
        diagnose=settings.debug,
    )

    logging.basicConfig(handlers=[InterceptHandler()], level=level or settings.log_level)
