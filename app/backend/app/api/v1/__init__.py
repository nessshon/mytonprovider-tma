from fastapi import APIRouter

from . import auth, profile, provider, telegram

__all__ = ["router"]

router = APIRouter(prefix="/v1")
router.include_router(auth.router)
router.include_router(profile.router)
router.include_router(provider.router)
router.include_router(telegram.router)
