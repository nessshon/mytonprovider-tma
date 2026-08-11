import base64
from collections.abc import Sequence
from datetime import datetime
from typing import Any, NamedTuple

from aiogram.types import (
    InputRichMessage,
    RichBlockDetails,
    RichBlockPreformatted,
    RichBlockSectionHeading,
    RichBlockTable,
    RichBlockTableCell,
    RichBlockUnion,
    RichTextBold,
    RichTextUnion,
    RichTextUrl,
)
from sqlalchemy import Row

from app import config
from app.alerts import AlertColor
from app.bot.translator import t
from app.utils import format_amount, short_key, utcnow

APP_LOGO = "5345821286524301151"
BAG_LOGO = "5818955300463447293"
GRAM_LOGO = "5258138919291101825"
OPEN_APP = "5764638872000533034"
THRESHOLD_RED = "5240431636713065543"
THRESHOLD_GREEN = "5240378276039379068"
THRESHOLD_ORANGE = "5260463398541344412"

LIST_LIMIT = 12

COLOR_EMOJI = {
    AlertColor.RED: (THRESHOLD_RED, "\U0001f534"),
    AlertColor.GREEN: (THRESHOLD_GREEN, "\U0001f7e2"),
    AlertColor.ORANGE: (THRESHOLD_ORANGE, "\U0001f7e0"),
}

EXPLORERS = {
    "tonscan": "https://tonscan.org/tx/{tx_hash}",
    "tonviewer": "https://tonviewer.com/transaction/{tx_hash}",
}


def custom_emoji(emoji_id: str, fallback: str) -> str:
    return f'<tg-emoji emoji-id="{emoji_id}">{fallback}</tg-emoji>'


def provider_url(pubkey: str) -> str:
    return f"https://t.me/{config.BOT_USERNAME}?startapp={pubkey}"


def explorer_url(explorer: str, tx_hash: str) -> str:
    tx_hex = base64.b64decode(tx_hash).hex()
    return EXPLORERS.get(explorer, EXPLORERS["tonviewer"]).format(tx_hash=tx_hex)


def provider_link(pubkey: str) -> str:
    return f'<b><a href="{provider_url(pubkey)}">{short_key(pubkey)}</a></b>'


def bag_url(bag_id: str) -> str:
    return f"https://t.me/{config.BOT_USERNAME}?startapp=b_{bag_id.lower()}"


def bag_link(bag_id: str) -> str:
    return f'<b><a href="{bag_url(bag_id)}">{short_key(bag_id)}</a></b>'


def _gram(amount_nano: int) -> str:
    return f"+{format_amount(amount_nano / 1e9, digits=4)} GRAM"


def rich_cell(text: RichTextUnion, align: str = "center") -> RichBlockTableCell:
    return RichBlockTableCell(align=align, valign="middle", text=text)


def alert(lang: str, title: str, pubkey: str, color: AlertColor) -> str:
    emoji = custom_emoji(*COLOR_EMOJI[color])
    return f"{emoji} <b>{title}</b>\n\n<b>{t(lang, 'alert_provider')}</b> {provider_link(pubkey)}"


def bag(lang: str, pubkey: str, bag_id: str) -> str:
    emoji = custom_emoji(BAG_LOGO, "\U0001f4e6")
    return (
        f"{emoji} <b>{t(lang, 'bag_added_title')}:</b> {bag_link(bag_id)}\n"
        f"\n"
        f"<b>{t(lang, 'alert_provider')}</b> {provider_link(pubkey)}"
    )


def reward(lang: str, explorer: str, pubkey: str, amount_nano: int, tx_hash: str) -> str:
    emoji = custom_emoji(GRAM_LOGO, "\U0001f4b0")
    link = f'<a href="{explorer_url(explorer, tx_hash)}">{_gram(amount_nano)}</a>'
    return (
        f"{emoji} <b>{t(lang, 'reward_title')}: {link}</b>\n\n"
        f"<b>{t(lang, 'alert_provider')}</b> {provider_link(pubkey)}"
    )


def _grouped(lang: str, emoji: str, title: str, items: list[str], pubkey: str) -> str:
    lines = [f"• {item}" for item in items[:LIST_LIMIT]]
    if len(items) > LIST_LIMIT:
        lines.append(t(lang, "list_more").format(n=len(items) - LIST_LIMIT))
    body = "\n".join(lines)
    return f"{emoji} <b>{title}</b>\n\n{body}\n\n<b>{t(lang, 'alert_provider')}</b> {provider_link(pubkey)}"


def bags(lang: str, pubkey: str, bag_ids: list[str]) -> str:
    if len(bag_ids) == 1:
        return bag(lang, pubkey, bag_ids[0])
    emoji = custom_emoji(BAG_LOGO, "\U0001f4e6")
    title = t(lang, "bags_added_title").format(n=len(bag_ids))
    return _grouped(lang, emoji, title, [bag_link(bag_id) for bag_id in bag_ids], pubkey)


def rewards(lang: str, explorer: str, pubkey: str, items: list[tuple[int, str]]) -> str:
    if len(items) == 1:
        return reward(lang, explorer, pubkey, *items[0])
    emoji = custom_emoji(GRAM_LOGO, "\U0001f4b0")
    title = f"{t(lang, 'reward_title')}: {_gram(sum(amount_nano for amount_nano, _ in items))}"
    rows = [
        f'<b><a href="{explorer_url(explorer, tx_hash)}">{_gram(amount_nano)}</a></b>'
        for amount_nano, tx_hash in items
    ]
    return _grouped(lang, emoji, title, rows, pubkey)


def monthly(
    lang: str,
    pubkey: str,
    earned_nano: int,
    growth_gb: float | None,
    traffic_in_bytes: int,
    traffic_out_bytes: int,
) -> InputRichMessage:
    rows = [
        (t(lang, "monthly_earned"), f"{format_amount(earned_nano / 1e9, digits=4, sign=True)} GRAM"),
        (t(lang, "monthly_space"), f"{format_amount(growth_gb or 0, sign=True)} GB"),
        (t(lang, "monthly_traffic_in"), f"↓{format_amount(traffic_in_bytes / 1024**3)} GB"),
        (t(lang, "monthly_traffic_out"), f"↑{format_amount(traffic_out_bytes / 1024**3)} GB"),
    ]
    return InputRichMessage(
        blocks=[
            RichBlockTable(
                cells=[
                    [rich_cell(RichTextBold(text=t(lang, "monthly_title")))],
                    [rich_cell(RichTextBold(text=RichTextUrl(text=short_key(pubkey), url=provider_url(pubkey))))],
                ],
            ),
            RichBlockTable(
                is_bordered=True,
                is_striped=True,
                cells=[[rich_cell(label, "left"), rich_cell(value, "right")] for label, value in rows],
            ),
        ],
    )


class Stats(NamedTuple):
    providers: Row[Any]
    offline: Sequence[Row[Any]]
    silent: Sequence[Row[Any]]
    versions: Sequence[tuple[str, Sequence[Row[Any]]]]
    users: Row[Any]
    subscribers: int
    languages: Sequence[Row[Any]]
    contracts: Row[Any]
    snapshots: int
    db_size: int
    uptime: float


def _span(seconds: float) -> str:
    minutes = int(seconds // 60)
    if minutes < 60:
        return f"{minutes} мин"
    if minutes < 60 * 24:
        return f"{minutes // 60} ч"
    return f"{minutes // (60 * 24)} дн"


def _age(moment: datetime | None) -> str:
    return "" if moment is None else _span((utcnow() - moment).total_seconds())


def _heading(title: str) -> RichBlockSectionHeading:
    return RichBlockSectionHeading(text=RichTextBold(text=title), size=2)


def _table(rows: Sequence[tuple[str, RichTextUnion]], caption: str | None = None) -> RichBlockTable:
    return RichBlockTable(
        is_bordered=True,
        is_striped=True,
        caption=RichTextBold(text=caption) if caption else None,
        cells=[[rich_cell(label, "left"), rich_cell(value, "right")] for label, value in rows],
    )


def _details(summary: str, blocks: Sequence[RichBlockUnion]) -> RichBlockDetails:
    return RichBlockDetails(summary=RichTextBold(text=summary), blocks=list(blocks))


def _listing(lines: Sequence[str]) -> list[RichBlockUnion]:
    return [RichBlockPreformatted(text="\n".join(lines))]


def _spaced(value: int) -> str:
    return f"{value:,}".replace(",", " ")


def _version_blocks(versions: Sequence[tuple[str, Sequence[Row[Any]]]]) -> list[RichBlockUnion]:
    blocks: list[RichBlockUnion] = []
    for program, rows in versions:
        if not rows:
            continue
        grouped: dict[str, list[str]] = {}
        for row in rows:
            grouped.setdefault(row.githash, []).append(row.pubkey)
        blocks.append(RichBlockTable(cells=[[rich_cell(RichTextBold(text=program))]]))
        for githash, pubkeys in sorted(grouped.items(), key=lambda item: len(item[1]), reverse=True):
            blocks.append(
                RichBlockDetails(
                    summary=f"{githash[:9]} · {len(pubkeys)}",
                    blocks=_listing([short_key(pubkey) for pubkey in pubkeys]),
                )
            )
    return blocks


def _build_rows(uptime: float) -> list[tuple[str, RichTextUnion]]:
    if not (config.APP_REPO and config.APP_COMMIT):
        return [("Ветка", "неизвестно"), ("Коммит", "неизвестно"), ("Аптайм", _span(uptime))]
    owner_url, name = config.APP_REPO.rsplit("/", 1)
    return [
        ("Автор", RichTextUrl(text=owner_url.rsplit("/", 1)[-1], url=owner_url)),
        ("Репозиторий", RichTextUrl(text=name, url=config.APP_REPO)),
        ("Ветка", config.APP_BRANCH),
        ("Коммит", RichTextUrl(text=config.APP_COMMIT, url=f"{config.APP_REPO}/commit/{config.APP_COMMIT}")),
        ("Аптайм", _span(uptime)),
    ]


def stats(data: Stats) -> InputRichMessage:
    counters = data.providers
    blocks: list[RichBlockUnion] = [
        _heading("Провайдеры"),
        _table(
            [
                ("Провайдеров", str(counters.total)),
                ("Онлайн", f"{counters.online}/{counters.total}"),
                ("Телеметрия", f"{counters.telemetry}/{counters.total}"),
                ("Пароль задан", f"{counters.passworded}/{counters.total}"),
            ]
        ),
    ]
    version_blocks = _version_blocks(data.versions)
    if version_blocks:
        blocks.append(_details("Версии", version_blocks))
    for title, rows in (("Офлайн", data.offline), ("Нет телеметрии", data.silent)):
        if rows:
            blocks.append(
                _details(
                    f"{title} · {len(rows)}",
                    _listing([f"{short_key(row.pubkey)}  {_age(row.moment)}".rstrip() for row in rows]),
                )
            )

    blocks.append(_heading("Пользователи"))
    blocks.append(
        _table(
            [
                ("Пользователей", str(data.users.total)),
                ("Активные", str(data.users.total - data.users.blocked)),
                ("Заблокировали", str(data.users.blocked)),
                ("Следят за провайдером", f"{data.subscribers}/{data.users.total}"),
            ]
        )
    )
    if data.languages:
        blocks.append(_table([(row.lang, str(row.count)) for row in data.languages], "Языки"))

    blocks.append(_heading("Система"))
    blocks.append(
        _table(
            [
                ("Размер", f"{data.db_size / 1024**2:.0f} МБ"),
                ("Снимков телеметрии", _spaced(data.snapshots)),
                ("Контрактов бэгов", _spaced(data.contracts.total)),
                ("Уникальных бэгов", _spaced(data.contracts.bags)),
            ],
            "База",
        )
    )
    blocks.append(_table(_build_rows(data.uptime), "Сборка"))
    return InputRichMessage(blocks=blocks)
