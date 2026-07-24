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
DEFAULT_ALERT_THRESHOLDS = {
    "cpu_high": 90,
    "ram_high": 90,
    "network_high": 90,
    "disk_load_high": 90,
    "disk_space_low": 90,
}


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
                    "alert_thresholds": dict(DEFAULT_ALERT_THRESHOLDS),
                }
            ]
        )
        return await self.session.get_one(UserModel, user_id)
