"""
RabbitMQ event publisher – publishes supply chain events to the event broker.
Workers subscribe to this exchange to process events asynchronously.
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import aio_pika
import structlog
from app.core.config import settings

logger = structlog.get_logger(__name__)

EXCHANGE_NAME = "supply_chain_events"

# Routing keys
ROUTING = {
    "shipment_created": "shipment.created",
    "shipment_updated": "shipment.updated",
    "shipment_delayed": "shipment.delayed",
    "inventory_updated": "inventory.updated",
    "inventory_low": "inventory.low",
    "supplier_updated": "supplier.updated",
    "anomaly_detected": "anomaly.detected",
    "healing_triggered": "healing.triggered",
    "healing_completed": "healing.completed",
}


async def get_connection():
    return await aio_pika.connect_robust(settings.RABBITMQ_URL)


async def publish_event(
    event_type: str,
    payload: Dict[str, Any],
    correlation_id: Optional[str] = None,
):
    """Publish an event to the supply_chain_events exchange."""
    routing_key = ROUTING.get(event_type, event_type)
    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": event_type,
        "routing_key": routing_key,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "correlation_id": correlation_id or str(uuid.uuid4()),
        "payload": payload,
    }

    try:
        connection = await get_connection()
        async with connection:
            channel = await connection.channel()
            exchange = await channel.declare_exchange(
                EXCHANGE_NAME,
                aio_pika.ExchangeType.TOPIC,
                durable=True,
            )
            message = aio_pika.Message(
                body=json.dumps(event).encode(),
                content_type="application/json",
                message_id=event["event_id"],
                correlation_id=correlation_id,
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            )
            await exchange.publish(message, routing_key=routing_key)
            logger.info(
                "Event published",
                event_type=event_type,
                routing_key=routing_key,
                event_id=event["event_id"],
            )
    except Exception as e:
        logger.error("Failed to publish event", event_type=event_type, error=str(e))


# Sync wrapper for use in synchronous FastAPI route handlers
def publish_event_sync(event_type: str, payload: Dict[str, Any], correlation_id: Optional[str] = None):
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, publish_event(event_type, payload, correlation_id))
                future.result(timeout=5)
        else:
            loop.run_until_complete(publish_event(event_type, payload, correlation_id))
    except Exception as e:
        logger.error("Sync event publish failed", error=str(e))
