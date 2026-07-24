from pathlib import Path

from environs import Env

env = Env()
env.read_env()

TIMEZONE = "Europe/Moscow"
BASE_DIR = Path(__file__).resolve().parent.parent
DEBUG = env.bool("DEBUG", False)

JWT_SECRET = env.str("JWT_SECRET")
WEBAPP_URL = env.str("WEBAPP_URL").rstrip("/")

TG_CLIENT_ID = env.int("TG_CLIENT_ID")
TG_CLIENT_SECRET = env.str("TG_CLIENT_SECRET")

BOT_TOKEN = env.str("BOT_TOKEN")
BOT_DEV_ID = env.int("BOT_DEV_ID", 0)
BOT_USERNAME = env.str("BOT_USERNAME")
BOT_WEBHOOK_SECRET = env.str("BOT_WEBHOOK_SECRET")

TONCENTER_API_URL = "https://toncenter.com/api/v3"
TONCENTER_API_KEY = env.str("TONCENTER_API_KEY")
TONCENTER_API_RPS = env.float("TONCENTER_API_RPS")

MYTONPROVIDER_API_URL = "https://mytonprovider.org/api/v1"
MYTONPROVIDER_API_KEY = env.str("MYTONPROVIDER_API_KEY")
MYTONPROVIDER_API_RPS = env.float("MYTONPROVIDER_API_RPS")

TELEMETRY_PASS_SALT = f"{MYTONPROVIDER_API_URL}/providers"
