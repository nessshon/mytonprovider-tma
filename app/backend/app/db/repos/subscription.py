from collections.abc import Sequence

from sqlalchemy import Row, select

from app.db.models import ProviderModel, SubscriptionModel, UserModel
from app.db.repos._base import BaseRepo


class SubscriptionRepo(BaseRepo[SubscriptionModel]):
    model = SubscriptionModel

    async def all_by_user(self, user_id: int) -> Sequence[SubscriptionModel]:
        stmt = select(SubscriptionModel).where(SubscriptionModel.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def all_active(self) -> Sequence[Row[tuple[UserModel, ProviderModel, SubscriptionModel]]]:
        stmt = (
            select(UserModel, ProviderModel, SubscriptionModel)
            .join(SubscriptionModel, SubscriptionModel.user_id == UserModel.id)
            .join(ProviderModel, ProviderModel.pubkey == SubscriptionModel.provider_pubkey)
            .where(
                UserModel.alerts_enabled.is_(True),
                SubscriptionModel.alerts_enabled.is_(True),
                SubscriptionModel.telemetry_pass.is_not_distinct_from(ProviderModel.telemetry_pass),
            )
        )
        result = await self.session.execute(stmt)
        return result.all()
