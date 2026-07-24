from collections.abc import Sequence
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import Float, Row, bindparam, select, text

from app.db.models import ProviderHistoryModel, ProviderModel, UTCDateTime
from app.db.repos._base import BaseRepo
from app.utils import utcnow


class ProviderRepo(BaseRepo[ProviderModel]):
    model = ProviderModel


class ProviderHistoryRepo(BaseRepo[ProviderHistoryModel]):
    model = ProviderHistoryModel

    async def bounds(
        self,
        pubkey: str,
        start: datetime,
        end: datetime | None = None,
    ) -> tuple[ProviderHistoryModel | None, ProviderHistoryModel | None]:
        stmt = select(ProviderHistoryModel).where(
            ProviderHistoryModel.pubkey == pubkey,
            ProviderHistoryModel.archived_at >= start,
        )
        if end is not None:
            stmt = stmt.where(ProviderHistoryModel.archived_at < end)
        first = await self.session.execute(stmt.order_by(ProviderHistoryModel.archived_at.asc()).limit(1))
        last = await self.session.execute(stmt.order_by(ProviderHistoryModel.archived_at.desc()).limit(1))
        return first.scalar_one_or_none(), last.scalar_one_or_none()

    async def previous(self, pubkey: str) -> ProviderHistoryModel | None:
        stmt = (
            select(ProviderHistoryModel)
            .where(ProviderHistoryModel.pubkey == pubkey)
            .order_by(ProviderHistoryModel.archived_at.desc())
            .offset(1)
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def charts(self, pubkey: str, since: datetime, bucket_sec: int) -> Sequence[Row[Any]]:
        stmt = (
            text("""
        SELECT archived_at, cpu_load_percent, ram_load_percent, net_mbps, disk_load_percent
        FROM (
          SELECT
            archived_at, cpu_load_percent, ram_load_percent, net_mbps, disk_load_percent,
            ROW_NUMBER() OVER (
              PARTITION BY CAST(strftime('%s', archived_at) AS INTEGER) / :bucket
              ORDER BY archived_at DESC
            ) AS row_number
          FROM providers_history
          WHERE pubkey = :pubkey AND archived_at >= :since
        )
        WHERE row_number = 1
        ORDER BY archived_at
        """)
            .bindparams(bindparam("since", type_=UTCDateTime()))
            .columns(
                archived_at=UTCDateTime(),
                cpu_load_percent=Float(),
                ram_load_percent=Float(),
                net_mbps=Float(),
                disk_load_percent=Float(),
            )
        )
        params = {"pubkey": pubkey, "since": since, "bucket": bucket_sec}
        result = await self.session.execute(stmt, params)
        return result.all()

    async def rollup(self) -> int:
        tiers = (
            (timedelta(hours=1), 30 * 60),
            (timedelta(days=1), 3 * 60 * 60),
            (timedelta(days=7), 12 * 60 * 60),
            (timedelta(days=30), 24 * 60 * 60),
            (timedelta(days=90), 30 * 24 * 60 * 60),
        )
        stmt = text("""
        DELETE FROM providers_history
        WHERE (pubkey, archived_at) IN (
          SELECT pubkey, archived_at
          FROM (
            SELECT
              pubkey, archived_at,
              ROW_NUMBER() OVER (
                PARTITION BY pubkey, CAST(strftime('%s', archived_at) AS INTEGER) / :bucket
                ORDER BY archived_at DESC
              ) AS row_number
            FROM providers_history
            WHERE archived_at < :cutoff
          )
          WHERE row_number > 1
        )""").bindparams(bindparam("cutoff", type_=UTCDateTime()))
        connection = await self.session.connection()
        removed = 0
        for age, bucket_sec in tiers:
            params = {"cutoff": utcnow() - age, "bucket": bucket_sec}
            result = await connection.execute(stmt, params)
            removed += result.rowcount
        return removed
