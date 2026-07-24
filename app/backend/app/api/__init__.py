from fastapi import APIRouter

from . import v1

__all__ = ["router"]

router = APIRouter(prefix="/api")
router.include_router(v1.router)
