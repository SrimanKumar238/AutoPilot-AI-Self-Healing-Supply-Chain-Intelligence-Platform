"""Idempotency helpers – Redis-based deduplication for worker tasks."""
import redis
import structlog

logger = structlog.get_logger(__name__)


class IdempotencyGuard:
    """Prevents duplicate processing using Redis TTL keys."""

    def __init__(self, redis_url: str, default_ttl: int = 86400):
        self.client = redis.from_url(redis_url, decode_responses=True)
        self.default_ttl = default_ttl

    def is_processed(self, scope: str, event_id: str) -> bool:
        key = f"idempotent:{scope}:{event_id}"
        return bool(self.client.get(key))

    def mark_processed(self, scope: str, event_id: str, ttl: int = None):
        key = f"idempotent:{scope}:{event_id}"
        self.client.setex(key, ttl or self.default_ttl, "done")

    def check_and_mark(self, scope: str, event_id: str) -> bool:
        """Returns True if already processed (should skip). Marks if new."""
        if self.is_processed(scope, event_id):
            logger.info("Idempotency: skipping duplicate", scope=scope, event_id=event_id)
            return True
        self.mark_processed(scope, event_id)
        return False
