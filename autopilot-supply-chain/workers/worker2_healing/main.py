"""
Worker 2: Self-Healing Orchestrator Agent
Consumes ANOMALY_DETECTED events and executes autonomous healing strategies.
Writes healing results back to the database and publishes completion events.
"""
import asyncio
import os
import sys
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any

import aio_pika
import redis
import structlog
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, "/app")
from shared.queue_client import QueueClient
from shared.idempotency import IdempotencyGuard

logger = structlog.get_logger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://admin:admin_pass@rabbitmq:5672/")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://autopilot:autopilot_pass@postgres:5432/supply_chain")
WORKER_ID = os.getenv("WORKER_ID", "healing-worker-1")


def get_db_session():
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    return Session()


class SelfHealingOrchestrator:
    """
    Autonomous self-healing strategies for each anomaly type.
    Production implementation would call external APIs, ERP systems, etc.
    """

    def heal_shipment_delay(self, payload: Dict, db) -> Dict:
        shipment_id = payload.get("shipment_id")
        delay = payload.get("delay_hours", 0)
        actions_taken = []

        # Strategy 1: Flag for priority rerouting
        actions_taken.append(f"Flagged shipment {shipment_id} for priority rerouting")

        # Strategy 2: Auto-notify stakeholders (simulate)
        actions_taken.append("Stakeholder notifications dispatched via email")

        # Strategy 3: If severe delay, trigger backup supplier
        if delay and float(delay) > 24:
            actions_taken.append("Backup supplier order triggered for affected SKUs")

        # Strategy 4: Update ETA in system
        actions_taken.append("ETA updated across downstream systems")

        return {
            "strategy": "shipment_delay_mitigation",
            "actions": actions_taken,
            "status": "completed",
            "estimated_recovery_hours": max(2, float(delay or 0) * 0.3),
        }

    def heal_inventory_low(self, payload: Dict, db) -> Dict:
        inventory_id = payload.get("inventory_id")
        sku = payload.get("sku", "N/A")
        status = payload.get("status", "low")
        actions_taken = []

        # Strategy 1: Auto-generate purchase order
        po_number = f"PO-AUTO-{str(uuid.uuid4())[:6].upper()}"
        actions_taken.append(f"Auto-generated purchase order {po_number} for SKU {sku}")

        # Strategy 2: Check alternate suppliers
        actions_taken.append("Checked 3 alternate suppliers for availability")

        # Strategy 3: Reserve available inventory from other warehouses
        actions_taken.append("Cross-warehouse inventory reallocation initiated")

        if status == "out_of_stock":
            actions_taken.append("Customer order holds placed pending restock")
            actions_taken.append("Expedited shipping requested from primary supplier")

        return {
            "strategy": "inventory_reorder",
            "purchase_order": po_number,
            "actions": actions_taken,
            "status": "completed",
        }

    def heal_supplier_risk(self, payload: Dict, db) -> Dict:
        return {
            "strategy": "supplier_risk_mitigation",
            "actions": [
                "Supplier risk score updated",
                "Secondary supplier evaluation initiated",
                "Risk review scheduled for next business day",
            ],
            "status": "completed",
        }

    def heal_route_disruption(self, payload: Dict, db) -> Dict:
        return {
            "strategy": "route_optimization",
            "actions": [
                "Alternative route calculated via inland transport",
                "Carrier notified of route change",
                "Delivery window updated",
            ],
            "status": "completed",
        }

    def heal(self, alert_type: str, payload: Dict, db) -> Dict:
        strategies = {
            "shipment_delay": self.heal_shipment_delay,
            "inventory_low": self.heal_inventory_low,
            "supplier_risk": self.heal_supplier_risk,
            "route_disruption": self.heal_route_disruption,
        }
        strategy_fn = strategies.get(alert_type, lambda p, d: {"strategy": "generic", "status": "acknowledged"})
        return strategy_fn(payload, db)


orchestrator = SelfHealingOrchestrator()


async def write_alert_to_db(payload: Dict, healing_result: Dict):
    """Persist alert and healing result to the database."""
    try:
        db = get_db_session()
        # Dynamic import to avoid circular deps
        import importlib.util, sys
        # Write alert record
        from sqlalchemy import text
        idempotency_key = payload.get("idempotency_key", str(uuid.uuid4()))

        db.execute(text("""
            INSERT INTO alerts (
                id, idempotency_key, alert_type, severity, status,
                title, description, ai_confidence,
                shipment_id, inventory_id, supplier_id,
                healing_action, healing_result, healed_at, auto_healed,
                detected_at, created_at
            ) VALUES (
                gen_random_uuid(), :ikey, :atype, :severity, 'resolved',
                :title, :description, :confidence,
                :shipment_id, :inventory_id, :supplier_id,
                :healing_action, :healing_result::jsonb, NOW(), true,
                NOW(), NOW()
            )
            ON CONFLICT (idempotency_key) DO NOTHING
        """), {
            "ikey": idempotency_key,
            "atype": payload.get("alert_type", "shipment_delay"),
            "severity": payload.get("severity", "warning"),
            "title": payload.get("title", "Anomaly Detected"),
            "description": payload.get("description", "AI detected anomaly"),
            "confidence": payload.get("ai_confidence", 0.0),
            "shipment_id": payload.get("shipment_id"),
            "inventory_id": payload.get("inventory_id"),
            "supplier_id": payload.get("supplier_id"),
            "healing_action": healing_result.get("strategy", ""),
            "healing_result": json.dumps(healing_result),
        })
        db.commit()
        db.close()
        logger.info("Alert and healing result persisted to DB")
    except Exception as e:
        logger.error("DB write failed", error=str(e))


async def publish_healing_complete(payload: Dict, healing_result: Dict, correlation_id: str):
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        exchange = await channel.declare_exchange(
            "supply_chain_events", aio_pika.ExchangeType.TOPIC, durable=True
        )
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": "healing_completed",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "correlation_id": correlation_id,
            "payload": {
                "alert_type": payload.get("alert_type"),
                "healing_result": healing_result,
                "worker_id": WORKER_ID,
            },
        }
        await exchange.publish(
            aio_pika.Message(
                body=json.dumps(event).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            ),
            routing_key="healing.completed",
        )
        logger.info("Healing completed event published", strategy=healing_result.get("strategy"))


async def handle_anomaly(event: Dict[str, Any]):
    """Main anomaly handler – execute healing strategy."""
    payload = event.get("payload", {})
    alert_type = payload.get("alert_type", "unknown")
    correlation_id = event.get("correlation_id", str(uuid.uuid4()))

    logger.warning(
        "Executing self-healing",
        alert_type=alert_type,
        severity=payload.get("severity"),
        confidence=payload.get("ai_confidence"),
        worker=WORKER_ID,
    )

    # Get DB session for healing operations
    healing_result = orchestrator.heal(alert_type, payload, None)

    logger.info("Healing strategy executed", strategy=healing_result.get("strategy"),
                actions=len(healing_result.get("actions", [])))

    # Persist alert + healing result
    await write_alert_to_db(payload, healing_result)

    # Publish completion event
    await publish_healing_complete(payload, healing_result, correlation_id)


async def main():
    logger.info("Starting Self-Healing Orchestrator Worker", worker_id=WORKER_ID)

    r = redis.from_url(REDIS_URL)
    client = QueueClient(RABBITMQ_URL)

    for attempt in range(10):
        try:
            await client.connect()
            break
        except Exception as e:
            logger.warning(f"Connection attempt {attempt+1} failed, retrying...", error=str(e))
            await asyncio.sleep(5)

    await client.consume(
        queue_name="self-healing-queue",
        routing_keys=["anomaly.detected"],
        handler=handle_anomaly,
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
