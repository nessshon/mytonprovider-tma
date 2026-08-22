import base64
import html
import time
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app import config

STARTED = time.monotonic()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def format_amount(value: float, digits: int = 2, sign: bool = False) -> str:
    spec = f"+.{digits}f" if sign else f".{digits}f"
    return f"{value:{spec}}".rstrip("0").rstrip(".")


SIZE_UNITS = ((1000**4, "TB"), (1000**3, "GB"), (1000**2, "MB"), (1000, "KB"))


def format_size(value: int, sign: bool = False) -> str:
    for scale, unit in SIZE_UNITS:
        if abs(value) >= scale:
            return f"{format_amount(value / scale, sign=sign)} {unit}"
    return f"{value:+d} B" if sign else f"{value} B"


ADDRESS_EXPLORERS = {
    "tonscan": "https://tonscan.org/address/{address}",
    "tonviewer": "https://tonviewer.com/{address}",
}


def address_url(explorer: str, address: str) -> str:
    return ADDRESS_EXPLORERS.get(explorer, ADDRESS_EXPLORERS["tonviewer"]).format(address=address)


def spaced(value: int) -> str:
    return f"{value:,}".replace(",", " ")


def short_key(key: str) -> str:
    return html.escape(f"{key[:7]}...{key[-7:]}".upper())


def short_address(address: str) -> str:
    return html.escape(f"{address[:6]}…{address[-6:]}")


def _crc16(data: bytes) -> bytes:
    crc = 0
    for byte in data:
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return crc.to_bytes(2, "big")


def user_friendly(address: str) -> str:
    try:
        raw = base64.b64decode(address.replace("-", "+").replace("_", "/"))
    except ValueError:
        return address
    if len(raw) != 36:
        return address
    body = bytes([(raw[0] & 0x80) | 0x51]) + raw[1:34]
    return base64.urlsafe_b64encode(body + _crc16(body)).decode()


def previous_month() -> tuple[datetime, datetime]:
    zone = ZoneInfo(config.TIMEZONE)
    month_start = utcnow().astimezone(zone).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    previous_start = (month_start - timedelta(days=1)).replace(day=1)
    return previous_start.astimezone(timezone.utc), month_start.astimezone(timezone.utc)
