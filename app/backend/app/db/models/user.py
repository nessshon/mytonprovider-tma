from datetime import datetime

from sqlalchemy import JSON, BigInteger, Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models._base import BaseModel, UTCDateTime
from app.utils import utcnow


class UserModel(BaseModel):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)
    lang: Mapped[str] = mapped_column(String(8), nullable=False, default="en")
    theme: Mapped[str] = mapped_column(String(8), nullable=False, default="auto")
    explorer: Mapped[str] = mapped_column(String(16), nullable=False, default="tonviewer")

    favorites: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    alert_types: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    alert_thresholds: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    alerts_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)
