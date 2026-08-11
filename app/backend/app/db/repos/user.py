from collections.abc import Sequence
from typing import Any

from sqlalchemy import Row, func, select

from app.alerts import DEFAULT_THRESHOLDS
from app.db.models import UserModel
from app.db.repos._base import BaseRepo

DEFAULT_ALERT_TYPES = [
    "telemetry_lost",
    "not_online",
    "service_restarted",
    "reward_received",
    "monthly_report",
    "bag_added",
    "cpu_high",
    "ram_high",
    "network_high",
    "disk_load_high",
    "disk_space_low",
]


class UserRepo(BaseRepo[UserModel]):
    model = UserModel

    async def get_or_create(self, user_id: int, lang: str | None) -> UserModel:
        model = await self.get(user_id)
        if model is not None:
            return model
        await self.insert(
            [
                {
                    "id": user_id,
                    "lang": lang or "en",
                    "alert_types": list(DEFAULT_ALERT_TYPES),
                    "alert_thresholds": dict(DEFAULT_THRESHOLDS),
                }
            ]
        )
        return await self.session.get_one(UserModel, user_id)

    async def counters(self) -> Row[Any]:
        stmt = select(
            func.count().label("total"),
            func.count().filter(UserModel.blocked_at.is_not(None)).label("blocked"),
        ).select_from(UserModel)
        result = await self.session.execute(stmt)
        return result.one()

    async def languages(self) -> Sequence[Row[Any]]:
        stmt = (
            select(UserModel.lang, func.count().label("count")).group_by(UserModel.lang).order_by(func.count().desc())
        )
        result = await self.session.execute(stmt)
        return result.all()
