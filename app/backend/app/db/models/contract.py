from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models._base import BaseModel, UTCDateTime


class ContractModel(BaseModel):
    __tablename__ = "contracts"

    provider_pubkey: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("providers.pubkey", ondelete="CASCADE"),
        primary_key=True,
    )
    address: Mapped[str] = mapped_column(String(64), primary_key=True)
    bag_id: Mapped[str] = mapped_column(String(64), nullable=False)
    owner_address: Mapped[str | None] = mapped_column(String(64))
    size: Mapped[int | None] = mapped_column(BigInteger)
    reason: Mapped[int | None] = mapped_column(Integer)
    reason_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
