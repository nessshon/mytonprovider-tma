import base64

from aiogram.types import (
    InputRichMessage,
    RichBlockTable,
    RichBlockTableCell,
    RichTextBold,
    RichTextUnion,
    RichTextUrl,
)

from app import config
from app.alerts import AlertColor
from app.bot.translator import t
from app.utils import format_amount, short_key

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


def bag_link(bag_id: str) -> str:
    url = f"https://mytonstorage.org/api/v1/gateway/{bag_id}"
    return f'<b><a href="{url}">{short_key(bag_id)}</a></b>'


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
