from sqlalchemy import BigInteger, Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models._base import BaseModel


class SubscriptionModel(BaseModel):
    __tablename__ = "subscriptions"

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    provider_pubkey: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("providers.pubkey", ondelete="CASCADE"),
        primary_key=True,
    )
    telemetry_pass: Mapped[str | None] = mapped_column(String(255))
    alerts_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
