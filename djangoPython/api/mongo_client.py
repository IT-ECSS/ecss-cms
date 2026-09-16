# Shared MongoDB client singleton for the Django backend.
#
# Every view/service used to call MongoClient(...) directly, creating a brand
# new client (pymongo default pool size 100) per request and almost never
# calling .close(). Under real traffic that rapidly eats into Atlas's
# free-tier connection limit, triggering the "nearing maximum connections
# threshold" alert. Use get_mongo_client() everywhere instead so the whole
# process shares ONE capped connection pool (mirrors the Node backend fix).
import os
from pymongo import MongoClient

try:
    from django.conf import settings
except Exception:
    settings = None

_MONGO_URI = (
    (getattr(settings, "MONGODB_URI", None) if settings else None)
    or os.environ.get("MONGODB_URI")
    or "mongodb+srv://it_db_user:PTcGw3Y6IL0gjkaV@ecss-company-management.t7nhtee.mongodb.net/?retryWrites=true&w=majority&appName=Company-Management-System"
)

_client = None


def get_mongo_client():
    """Returns the process-wide shared MongoClient, creating it on first use.

    Do NOT call .close() on the return value from request-handling code — it
    is shared across every view/request for the lifetime of the worker
    process.
    """
    global _client
    if _client is None:
        _client = MongoClient(
            _MONGO_URI,
            maxPoolSize=10,
            minPoolSize=0,
            maxIdleTimeMS=30000,
            serverSelectionTimeoutMS=30000,
        )
    return _client
