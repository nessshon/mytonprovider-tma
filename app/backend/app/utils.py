import html
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app import config


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def format_amount(value: float, digits: int = 2, sign: bool = False) -> str:
    spec = f"+.{digits}f" if sign else f".{digits}f"
    return f"{value:{spec}}".rstrip("0").rstrip(".")


def short_key(key: str) -> str:
    return html.escape(f"{key[:7]}...{key[-7:]}".upper())


def previous_month() -> tuple[datetime, datetime]:
    zone = ZoneInfo(config.TIMEZONE)
    month_start = utcnow().astimezone(zone).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    previous_start = (month_start - timedelta(days=1)).replace(day=1)
    return previous_start.astimezone(timezone.utc), month_start.astimezone(timezone.utc)
