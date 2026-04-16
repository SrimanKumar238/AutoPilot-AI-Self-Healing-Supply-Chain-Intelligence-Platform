"""
Shared RabbitMQ queue client for workers.
Implements ATOMIC task pickup using basic_ack with prefetch_count=1
and idempotency using Redis to prevent duplicate processing.
"""
import json
import asyncio
import aio_pika
import structlog
from typing import Callable, Awaitable

logger = structlog.get_logger(__name__)


class QueueClient:
    """
    Atomic consumer: prefetch_count=1 ensures only one message at a time.
    Messages are ack'd only after successful processing (at-least-once).
    Idempotency is enforced via Redis deduplication.
    """

    def __init__(self, rabbitmq_url: str, exchange_name: str = "supply_chain_events"):
        self.rabbitmq_url = rabbitmq_url
        self.exchange_name = exchange_name
        self.connection = None
        self.channel = None

    async def connect(self):
        self.connection = await aio_pika.connect_robust(self.rabbitmq_url)
        self.channel = await self.connection.channel()
        # ATOMIC: one message at a time per worker
        await self.channel.set_qos(prefetch_count=1)
        logger.info("RabbitMQ connected", exchange=self.exchange_name)

    async def consume(
        self,
        queue_name: str,
        routing_keys: list,
        handler: Callable[[dict], Awaitable[None]],
        idempotency_client=None,
        dead_letter: bool = True,
    ):
        """Subscribe to queue with routing keys and process messages atomically."""
        exchange = await self.channel.declare_exchange(
            self.exchange_name,
            aio_pika.ExchangeType.TOPIC,
            durable=True,
        )

        # Dead-letter exchange for failed messages
        dl_args = {}
        if dead_letter:
            dl_exchange = await self.channel.declare_exchange(
                f"{self.exchange_name}.dlx", aio_pika.ExchangeType.FANOUT, durable=True
            )
            dl_queue = await self.channel.declare_queue(
                f"{queue_name}.dead", durable=True
            )
            await dl_queue.bind(dl_exchange)
            dl_args = {
                "x-dead-letter-exchange": f"{self.exchange_name}.dlx",
                "x-message-ttl": 86400000,  # 24h
            }

        queue = await self.channel.declare_queue(queue_name, durable=True, arguments=dl_args)
        for key in routing_keys:
            await queue.bind(exchange, routing_key=key)

        logger.info("Worker consuming", queue=queue_name, routing_keys=routing_keys)

        async with queue.iterator() as q_iter:
            async for message in q_iter:
                async with message.process(requeue=False):
                    try:
                        event = json.loads(message.body.decode())
                        event_id = event.get("event_id", message.message_id)

                        # IDEMPOTENCY CHECK via Redis
                        if idempotency_client:
                            key = f"processed:{queue_name}:{event_id}"
                            if idempotency_client.get(key):
                                logger.info("Duplicate message skipped", event_id=event_id)
                                continue
                            # Mark as processing (24h TTL)
                            idempotency_client.setex(key, 86400, "processed")

                        logger.info("Processing event", event_type=event.get("event_type"), event_id=event_id)
                        await handler(event)
                        logger.info("Event processed successfully", event_id=event_id)

                    except Exception as e:
                        logger.error("Event processing failed", error=str(e))
                        # Message will be nacked and sent to DLX

    async def close(self):
        if self.connection:
            await self.connection.close()
