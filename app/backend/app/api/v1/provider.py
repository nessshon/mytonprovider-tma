from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal, TypeAlias

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.alerts.rules import disk_space_percent, evaluate, net_load_percent
from app.api.auth import current_user_id
from app.db import get_session
from app.db.models import ProviderModel, UserModel
from app.db.repos import ContractRepo, ProviderHistoryRepo, ProviderRepo, SubscriptionRepo, UserRepo
from app.utils import previous_month, utcnow

router = APIRouter(prefix="/provider", tags=["provider"])

Period: TypeAlias = Literal["hour", "day", "week", "month"]

PERIODS = {
    "hour": timedelta(hours=1),
    "day": timedelta(days=1),
    "week": timedelta(days=7),
    "month": timedelta(days=30),
}

CHART_BUCKET_SEC = {
    "hour": 60,
    "day": 30 * 60,
    "week": 3 * 60 * 60,
    "month": 12 * 60 * 60,
}


class TriggerOut(BaseModel):
    key: str
    color: str


class LoadOut(BaseModel):
    cpu: float | None
    ram: float | None
    net_mbps: float | None
    net_pct: float | None
    disk: float | None
    disk_space: float | None


class SummaryOut(BaseModel):
    earned: int | None
    traffic_in: int | None
    traffic_out: int | None
    storage_growth_gb: float | None


class AllTimeOut(BaseModel):
    earned: int | None
    traffic: int | None
    stored_gb: float | None


class ProviderResponse(BaseModel):
    balance: int | None
    balance_updated_at: int | None
    earned: int | None
    wallet_address: str | None
    telemetry_updated_at: int | None
    load: LoadOut
    triggers: list[TriggerOut]
    monthly: SummaryOut
    all_time: AllTimeOut
    problem_bags: int


class ChartPoint(BaseModel):
    t: int
    cpu: float | None
    ram: float | None
    net_mbps: float | None
    disk: float | None


class StatsResponse(BaseModel):
    summary: SummaryOut
    points: list[ChartPoint]


class ProblemBagOut(BaseModel):
    bag_id: str
    address: str
    owner_address: str | None
    size: int | None
    reason: int
    reason_at: int


class ProblemBagsResponse(BaseModel):
    items: list[ProblemBagOut]
    total: int


BAGS_PAGE_SIZE = 8
BAGS_FRESH = timedelta(hours=24)


@dataclass
class OwnerAccess:
    user: UserModel
    provider: ProviderModel


async def require_access(
    pubkey: str,
    user_id: int = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
) -> OwnerAccess:
    key = pubkey.lower()
    subscription = await SubscriptionRepo(session).get(user_id, key)
    if subscription is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not subscribed")
    user = await UserRepo(session).get(user_id)
    provider = await ProviderRepo(session).get(key)
    if user is None or provider is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Provider data not found")
    if subscription.telemetry_pass != provider.telemetry_pass:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Password changed")
    return OwnerAccess(user=user, provider=provider)


async def period_summary(
    session: AsyncSession,
    pubkey: str,
    start: datetime,
    end: datetime | None = None,
) -> SummaryOut:
    first, last = await ProviderHistoryRepo(session).bounds(pubkey, start, end)
    if first is None or last is None or first.archived_at == last.archived_at:
        return SummaryOut(earned=None, traffic_in=None, traffic_out=None, storage_growth_gb=None)
    growth = None
    if first.disk_used is not None and last.disk_used is not None:
        growth = round((last.disk_used - first.disk_used) / 1024**3, 2)
    return SummaryOut(
        earned=max(0, last.earned - first.earned),
        traffic_in=max(0, last.traffic_in - first.traffic_in),
        traffic_out=max(0, last.traffic_out - first.traffic_out),
        storage_growth_gb=growth,
    )


@router.get("/{pubkey}")
async def provider(
    access: OwnerAccess = Depends(require_access),
    session: AsyncSession = Depends(get_session),
) -> ProviderResponse:
    row = access.provider
    month_start, month_end = previous_month()
    monthly = await period_summary(session, row.pubkey, month_start, month_end)
    problem_bags = await ContractRepo(session).problem_count(row.pubkey, utcnow() - BAGS_FRESH)
    telemetry_updated_at = int(row.telemetry_at.timestamp()) if row.telemetry_at else None
    balance_updated_at = int(row.balance_at.timestamp()) if row.balance_at else None
    return ProviderResponse(
        balance=row.balance,
        balance_updated_at=balance_updated_at,
        earned=row.earned,
        wallet_address=row.wallet_address,
        telemetry_updated_at=telemetry_updated_at,
        load=LoadOut(
            cpu=row.cpu_load_percent,
            ram=row.ram_load_percent,
            net_mbps=row.net_mbps,
            net_pct=net_load_percent(row),
            disk=row.disk_load_percent,
            disk_space=disk_space_percent(row),
        ),
        triggers=[
            TriggerOut(key=rule.type.value, color=rule.color.value)
            for rule in evaluate(row, access.user.alert_thresholds)
        ],
        monthly=monthly,
        all_time=AllTimeOut(
            earned=row.earned,
            traffic=row.traffic_in + row.traffic_out,
            stored_gb=round(row.disk_used / 1024**3, 2) if row.disk_used is not None else None,
        ),
        problem_bags=problem_bags,
    )


@router.get("/{pubkey}/stats")
async def provider_stats(
    period: Period = Query("day"),
    access: OwnerAccess = Depends(require_access),
    session: AsyncSession = Depends(get_session),
) -> StatsResponse:
    key = access.provider.pubkey
    since = utcnow() - PERIODS[period]
    summary = await period_summary(session, key, since)
    rows = await ProviderHistoryRepo(session).charts(key, since, CHART_BUCKET_SEC[period])
    points = [
        ChartPoint(
            t=int(row.archived_at.timestamp()),
            cpu=row.cpu_load_percent,
            ram=row.ram_load_percent,
            net_mbps=row.net_mbps,
            disk=row.disk_load_percent,
        )
        for row in rows
    ]
    return StatsResponse(summary=summary, points=points)


@router.get("/{pubkey}/bags/problems")
async def provider_bag_problems(
    offset: int = Query(0, ge=0),
    access: OwnerAccess = Depends(require_access),
    session: AsyncSession = Depends(get_session),
) -> ProblemBagsResponse:
    since = utcnow() - BAGS_FRESH
    rows, total = await ContractRepo(session).problems(access.provider.pubkey, since, BAGS_PAGE_SIZE, offset)
    items = [
        ProblemBagOut(
            bag_id=row.bag_id,
            address=row.address,
            owner_address=row.owner_address,
            size=row.size,
            reason=row.reason,
            reason_at=int(row.reason_at.timestamp()),
        )
        for row in rows
        if row.reason is not None and row.reason_at is not None
    ]
    return ProblemBagsResponse(items=items, total=total)
