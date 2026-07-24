import asyncio

import aiohttp
from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app import config
from app.api import auth
from app.db import get_session
from app.db.repos import UserRepo

router = APIRouter(prefix="/auth", tags=["auth"])


class TelegramRequest(BaseModel):
    init_data: str = Field(max_length=8192)


class WidgetRequest(BaseModel):
    id_token: str = Field(max_length=8192)


class CodeRequest(BaseModel):
    code: str = Field(max_length=512)
    redirect_uri: str = Field(max_length=2048)


class AuthResponse(BaseModel):
    token: str
    name: str | None = None
    username: str | None = None
    photo_url: str | None = None


@router.post("/telegram")
async def auth_telegram(body: TelegramRequest, session: AsyncSession = Depends(get_session)) -> AuthResponse:
    parsed = auth.verify_init_data(body.init_data)
    assert parsed.user is not None
    user = await UserRepo(session).get_or_create(parsed.user.id, parsed.user.language_code)
    await session.commit()
    return AuthResponse(token=auth.issue_session_token(user.id))


@router.post("/widget")
async def auth_widget(body: WidgetRequest, session: AsyncSession = Depends(get_session)) -> AuthResponse:
    claims = await run_in_threadpool(auth.verify_id_token, body.id_token)
    user = await UserRepo(session).get_or_create(auth.claims_user_id(claims), None)
    await session.commit()
    return AuthResponse(token=auth.issue_session_token(user.id))


@router.post("/code")
async def auth_code(body: CodeRequest, session: AsyncSession = Depends(get_session)) -> AuthResponse:
    timeout = aiohttp.ClientTimeout(total=15)
    try:
        async with (
            aiohttp.ClientSession(timeout=timeout) as http,
            http.post(
                auth.OIDC_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": body.code,
                    "redirect_uri": body.redirect_uri,
                    "client_id": str(config.TG_CLIENT_ID),
                    "client_secret": config.TG_CLIENT_SECRET,
                },
            ) as response,
        ):
            status = response.status
            payload = await response.json(content_type=None)
    except (aiohttp.ClientError, asyncio.TimeoutError, ValueError):
        auth.logger.warning("code exchange failed: request error")
        raise auth.unauthorized("Code exchange failed") from None
    error = payload.get("error") if isinstance(payload, dict) else None
    id_token = payload.get("id_token") if isinstance(payload, dict) else None
    if status != 200 or not isinstance(id_token, str):
        auth.logger.warning("code exchange failed: %s %s", status, error)
        raise auth.unauthorized("Code exchange failed")
    claims = await run_in_threadpool(auth.verify_id_token, id_token)
    user = await UserRepo(session).get_or_create(auth.claims_user_id(claims), None)
    await session.commit()
    return AuthResponse(
        token=auth.issue_session_token(user.id),
        name=auth.claims_str(claims, "name") or auth.claims_str(claims, "given_name"),
        username=auth.claims_str(claims, "preferred_username"),
        photo_url=auth.claims_str(claims, "picture"),
    )


@router.post("/refresh")
async def auth_refresh(user_id: int = Depends(auth.current_user_id)) -> AuthResponse:
    return AuthResponse(token=auth.issue_session_token(user_id))
