import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app import api, bot, config, workers
from app.http import mytonprovider, toncenter


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    await mytonprovider.create_session()
    await toncenter.create_session()
    await workers.start()
    await bot.start()
    try:
        yield
    finally:
        await bot.stop()
        await workers.stop()
        await toncenter.close_session()
        await mytonprovider.close_session()


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s:     %(name)s - %(message)s",
    )
    logging.getLogger("app").setLevel(logging.DEBUG if config.DEBUG else logging.INFO)
    for name in ("aiogram", "aiohttp", "aiosqlite", "sqlalchemy"):
        logging.getLogger(name).setLevel(logging.WARNING)
    static_dir = config.BASE_DIR / "static"
    static_dir.mkdir(parents=True, exist_ok=True)

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    app.include_router(api.router)
    app.mount("/", StaticFiles(directory=static_dir, html=True))

    uvicorn.run(app, host="0.0.0.0", port=8080)


if __name__ == "__main__":
    main()
