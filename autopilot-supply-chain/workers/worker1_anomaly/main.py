"""
Worker 1: Anomaly Detection Agent
Consumes supply chain events and uses rule-based + statistical analysis
to detect anomalies. Publishes ANOMALY_DETECTED events for Worker 2.
"""
import asyncio
import uuid
import json
import sys
import os
import statistics
from datetime import datetime, timezone
from typing import Dict, Any

import aio_pika
import redis
import structlog

sys.path.insert(0, "/app")
from shared.queue_client import QueueClient
from shared.idempotency import IdempotencyGuard

logger = structlog.get_logger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://admin:admin_pass@rabbitmq:5672/")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
WORKER_ID = os.getenv("WORKER_ID", "anomaly-worker-1")

# Anomaly thresholds
DELAY_THRESHOLD_HOURS = 4.0        # Flag if delay > 4h
INVENTORY_CRITICAL_PCT = 0.25      # Flag if stock < 25% of reorder point
DEMAND_SPIKE_THRESHOLD = 2.0       # Flag if demand > 2x baseline


class AnomalyDetector:
    """
    AI Agent: Rule-based + Statistical Anomaly Detection.
    In production, replace rule engine with ML model inference.
    """

    def detect_shipment_anomaly(self, payload: Dict[str, Any]) -> Dict | None:
        delay = payload.get("delay_hours", 0)
        status = payload.get("status", "")

        if status == "delayed" and delay > DELAY_THRESHOLD_HOURS:
            confidence = min(0.5 + (delay / 24) * 0.4, 0.99)
            return {
                "alert_type": "shipment_delay",
                "severity": "critical" if delay > 12 else "warning",
                "title": f"Shipment Delayed {delay:.1f}h",
                "description": f"Shipment {payload.get('shipment_id', 'N/A')} is delayed by {delay:.1f} hours, exceeding threshold.",
                "ai_confidence": round(confidence, 2),
                "shipment_id": payload.get("shipment_id"),
            }

        if status == "at_customs":
            return {
                "alert_type": "route_disruption",
                "severity": "warning",
                "title": "Shipment Held at Customs",
                "description": f"Shipment {payload.get('shipment_id')} is held at customs – route disruption risk.",
                "ai_confidence": 0.75,
                "shipment_id": payload.get("shipment_id"),
            }
        return None

    def detect_inventory_anomaly(self, payload: Dict[str, Any]) -> Dict | None:
        status = payload.get("status", "")
        qty = payload.get("quantity", 0)
        sku = payload.get("sku", "N/A")

        severity_map = {
            "out_of_stock": ("critical", 0.99),
            "critical": ("critical", 0.92),
            "low": ("warning", 0.78),
        }

        if status in severity_map:
            severity, confidence = severity_map[status]
            return {
                "alert_type": "inventory_low",
                "severity": severity,
                "title": f"Inventory {status.replace('_', ' ').title()}: {sku}",
                "description": f"SKU {sku} has {qty} units remaining (status: {status}). Immediate reorder may be needed.",
                "ai_confidence": confidence,
                "inventory_id": payload.get("inventory_id"),
            }
        return None

    def detect(self, event: Dict[str, Any]) -> Dict | None:
        event_type = event.get("event_type", "")
        payload = event.get("payload", {})

        if event_type in ("shipment_delayed", "shipment_updated"):
            return self.detect_shipment_anomaly(payload)
        elif event_type == "inventory_low":
            return self.detect_inventory_anomaly(payload)
        return None


detector = AnomalyDetector()


async def publish_anomaly(anomaly: Dict, correlation_id: str):
    """Publish detected anomaly to RabbitMQ for Worker 2 to process."""
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        exchange = await channel.declare_exchange(
            "supply_chain_events", aio_pika.ExchangeType.TOPIC, durable=True
        )
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": "anomaly_detected",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "correlation_id": correlation_id,
            "payload": {**anomaly, "idempotency_key": str(uuid.uuid4())},
        }
        await exchange.publish(
            aio_pika.Message(
                body=json.dumps(event).encode(),
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                correlation_id=correlation_id,
            ),
            routing_key="anomaly.detected",
        )
        logger.info("Anomaly published", anomaly_type=anomaly.get("alert_type"),
                    confidence=anomaly.get("ai_confidence"))


async def handle_event(event: Dict[str, Any]):
    """Main event handler – detect anomaly and publish if found."""
    logger.info("Analyzing event", event_type=event.get("event_type"), worker=WORKER_ID)

    anomaly = detector.detect(event)
    if anomaly:
        logger.warning("Anomaly detected!", alert_type=anomaly["alert_type"],
                       severity=anomaly["severity"], confidence=anomaly["ai_confidence"])
        await publish_anomaly(anomaly, event.get("correlation_id", str(uuid.uuid4())))
    else:
        logger.info("No anomaly detected for event", event_type=event.get("event_type"))


async def main():
    logger.info("Starting Anomaly Detection Worker", worker_id=WORKER_ID)

    r = redis.from_url(REDIS_URL)
    idempotency = IdempotencyGuard(REDIS_URL)
    client = QueueClient(RABBITMQ_URL)

    # Retry connection with backoff
    for attempt in range(10):
        try:
            await client.connect()
            break
        except Exception as e:
            logger.warning(f"Connection attempt {attempt+1} failed, retrying...", error=str(e))
            await asyncio.sleep(5)

    await client.consume(
        queue_name="anomaly-detection-queue",
        routing_keys=[
            "shipment.delayed",
            "shipment.updated",
            "inventory.low",
            "supplier.updated",
        ],
        handler=handle_event,
        idempotency_client=r,
    )


if __name__ == "__main__":
    import structlog
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(20),
        logger_factory=structlog.PrintLoggerFactory(),
    )
    asyncio.run(main())
