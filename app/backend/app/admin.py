import logging
import secrets
from urllib.parse import urlencode

from fastapi.concurrency import run_in_threadpool
from starlette.datastructures import URL
from starlette.exceptions import HTTPException
from starlette.middleware import Middleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from starlette.responses import RedirectResponse, Response
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_403_FORBIDDEN
from starlette_admin.auth import AdminUser, OAuthProvider
from starlette_admin.contrib.sqla import Admin, ModelView

from app import config
from app.api import auth
from app.db import session_factory
from app.db.models import (
    AlertModel,
    ContractModel,
    ProviderHistoryModel,
    ProviderModel,
    SubscriptionModel,
    UserModel,
)

ALLOWED_IDS = frozenset(config.BOT_DEV_IDS + config.BOT_ADMIN_IDS)

logger = logging.getLogger(__name__)


def _external_url(path: str, query: str) -> str:
    url = f"{config.WEBAPP_URL}{path}"
    return f"{url}?{query}" if query else url


class TelegramAuthProvider(OAuthProvider):
    async def redirect_to_provider(self, request: Request, callback_url: str) -> Response:
        state = secrets.token_urlsafe(32)
        request.session["state"] = state
        url = URL(callback_url)
        params = urlencode(
            {
                "response_type": "code",
                "client_id": str(config.TG_CLIENT_ID),
                "redirect_uri": _external_url(url.path, url.query),
                "scope": "openid profile",
                "state": state,
            }
        )
        return RedirectResponse(f"{auth.OIDC_AUTH_URL}?{params}")

    async def handle_callback(self, request: Request) -> None:
        state = request.session.pop("state", None)
        code = request.query_params.get("code")
        if not code or not state or state != request.query_params.get("state"):
            raise HTTPException(HTTP_400_BAD_REQUEST, "Invalid login state")
        url = request.url.remove_query_params(["code", "state"])
        id_token = await auth.exchange_code(code, _external_url(url.path, url.query))
        claims = await run_in_threadpool(auth.verify_id_token, id_token)
        user_id = auth.claims_user_id(claims)
        if user_id not in ALLOWED_IDS:
            logger.warning("access denied for %s", user_id)
            raise HTTPException(HTTP_403_FORBIDDEN, "Access denied")
        logger.info("logged in: %s", user_id)
        request.session["user_id"] = user_id
        request.session["username"] = auth.claims_str(claims, "preferred_username") or auth.claims_str(claims, "name")
        request.session["photo_url"] = auth.claims_str(claims, "picture")

    async def authenticate(self, request: Request) -> AdminUser | None:
        user_id = request.session.get("user_id")
        if user_id not in ALLOWED_IDS:
            return None
        username = request.session.get("username")
        return AdminUser(username=username or str(user_id), photo_url=request.session.get("photo_url"))

    async def logout(self, request: Request) -> Response | None:
        request.session.clear()
        return None


admin = Admin(
    session_factory,
    title="MyTONProvider",
    auth_provider=TelegramAuthProvider(),
    secret_key=config.JWT_SECRET,
    middlewares=[
        Middleware(
            SessionMiddleware,
            secret_key=config.JWT_SECRET,
            path="/admin",
            max_age=int(auth.SESSION_TTL.total_seconds()),
            https_only=not config.DEBUG,
        )
    ],
)

for model in (ProviderModel, ProviderHistoryModel, UserModel, SubscriptionModel, AlertModel, ContractModel):
    admin.add_view(ModelView(model))
