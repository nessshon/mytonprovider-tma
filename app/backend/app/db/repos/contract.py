from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import ColumnElement, func, select

from app.db.models import ContractModel
from app.db.repos._base import BaseRepo


class ContractRepo(BaseRepo[ContractModel]):
    model = ContractModel

    async def keys(self) -> set[tuple[str, str]]:
        stmt = select(ContractModel.provider_pubkey, ContractModel.address)
        result = await self.session.execute(stmt)
        return {(row.provider_pubkey, row.address) for row in result}

    def _problem_where(self, pubkey: str, since: datetime) -> tuple[ColumnElement[bool], ...]:
        return (
            ContractModel.provider_pubkey == pubkey,
            ContractModel.reason != 0,
            ContractModel.reason_at > since,
        )

    async def problem_count(self, pubkey: str, since: datetime) -> int:
        stmt = select(func.count()).select_from(ContractModel).where(*self._problem_where(pubkey, since))
        return await self.session.scalar(stmt) or 0

    async def problems(
        self,
        pubkey: str,
        since: datetime,
        limit: int,
        offset: int,
    ) -> tuple[Sequence[ContractModel], int]:
        total = await self.problem_count(pubkey, since)
        stmt = (
            select(ContractModel)
            .where(*self._problem_where(pubkey, since))
            .order_by(ContractModel.reason_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all(), total
