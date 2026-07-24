import asyncio
import logging

from app.bot import notify


class BaseWorker:
    interval: int
    delay: int = 0

    async def run(self) -> None:
        raise NotImplementedError

    @classmethod
    async def loop(cls) -> None:
        logger = logging.getLogger(cls.__module__)
        worker = cls()
        await asyncio.sleep(cls.delay)
        last_error = None
        while True:
            try:
                await worker.run()
                last_error = None
            except asyncio.CancelledError:
                raise
            except Exception as error:
                logger.exception("run failed")
                signature = f"{type(error).__name__}: {error}"
                if signature != last_error:
                    last_error = signature
                    await notify.report_error(cls.__name__, error)
            await asyncio.sleep(cls.interval)
