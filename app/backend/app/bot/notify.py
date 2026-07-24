import html
import logging
import traceback

from aiogram.types import BufferedInputFile, InputRichMessage
from sqlalchemy.ext.asyncio import AsyncSession

from app import config
from app.alerts import AlertColor, AlertType
from app.bot import bot, render, sender
from app.bot.translator import t
from app.db.models import UserModel
from app.db.repos import SubscriptionRepo

logger = logging.getLogger(__name__)


async def detected(user: UserModel, alert_type: AlertType, pubkey: str, color: AlertColor) -> bool:
    title = t(user.lang, f"alert_detected_{alert_type.value}")
    return await _deliver(user, render.alert(user.lang, title, pubkey, color))


async def resolved(user: UserModel, alert_type: AlertType, pubkey: str) -> bool:
    title = t(user.lang, f"alert_resolved_{alert_type.value}")
    return await _deliver(user, render.alert(user.lang, title, pubkey, AlertColor.GREEN))


async def restarted(user: UserModel, service: str, pubkey: str) -> bool:
    title = t(user.lang, "alert_restarted").format(service=service)
    return await _deliver(user, render.alert(user.lang, title, pubkey, AlertColor.ORANGE))


async def bags_added(session: AsyncSession, pubkey: str, bag_ids: list[str]) -> None:
    for user in await _subscribers(session, pubkey, AlertType.BAG_ADDED):
        await _deliver(user, render.bags(user.lang, pubkey, bag_ids))


async def rewards_received(session: AsyncSession, pubkey: str, rewards: list[tuple[int, str]]) -> None:
    for user in await _subscribers(session, pubkey, AlertType.REWARD_RECEIVED):
        await _deliver(user, render.rewards(user.lang, user.explorer, pubkey, rewards))


async def monthly_report(
    user: UserModel,
    pubkey: str,
    earned_nano: int,
    growth_gb: float | None,
    traffic_in_bytes: int,
    traffic_out_bytes: int,
) -> bool:
    rich_message = render.monthly(user.lang, pubkey, earned_nano, growth_gb, traffic_in_bytes, traffic_out_bytes)
    return await _deliver_rich(user, rich_message)


async def report_error(source: str, error: BaseException) -> None:
    if not config.BOT_DEV_ID:
        return
    exc_type = type(error).__name__
    lines = str(error).strip().splitlines()
    exc_text = lines[0] if lines else exc_type
    header = f"<b>{html.escape(source)}</b>\n<b>{html.escape(exc_type)}</b>"
    caption = f"{header}: <code>{html.escape(exc_text[:900])}</code>"
    tb = "".join(traceback.format_exception(type(error), error, error.__traceback__))
    document = BufferedInputFile(tb.encode(), filename=f"error_{source}.txt")
    try:
        async with sender.lock:
            await bot.send_document(config.BOT_DEV_ID, document, caption=caption)
    except Exception as send_error:
        logger.warning("failed to report error to dev: %s", send_error)


async def _subscribers(session: AsyncSession, pubkey: str, alert_type: AlertType) -> list[UserModel]:
    return [
        row.UserModel
        for row in await SubscriptionRepo(session).all_active()
        if row.ProviderModel.pubkey == pubkey and alert_type.value in row.UserModel.alert_types
    ]


async def _deliver(user: UserModel, text: str) -> bool:
    if not user.alerts_enabled:
        return False
    return _apply_result(user, await sender.send_message(user.id, text))


async def _deliver_rich(user: UserModel, rich_message: InputRichMessage) -> bool:
    if not user.alerts_enabled:
        return False
    return _apply_result(user, await sender.send_rich_message(user.id, rich_message))


def _apply_result(user: UserModel, result: str) -> bool:
    if result == "forbidden":
        user.alerts_enabled = False
        logger.info("user %s blocked the bot, alerts disabled", user.id)
    return result == "ok"
