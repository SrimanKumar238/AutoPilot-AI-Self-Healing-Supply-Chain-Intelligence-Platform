#!/usr/bin/env python3
"""
Seed Demo Data Script – AutoPilot AI Supply Chain Platform
Run this AFTER docker-compose up to populate demo data and trigger anomaly flow.

Usage:
  docker-compose exec backend python scripts/seed_demo_data.py
  OR locally: python scripts/seed_demo_data.py
"""
import os
import sys
import uuid
import random
from datetime import datetime, timezone, timedelta

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://autopilot:autopilot_pass@localhost:5432/supply_chain")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
Session = sessionmaker(bind=engine)
db = Session()

print("\n🌱 AutoPilot AI — Seeding Demo Data")
print("=" * 50)


def seed():
    from app.core.security import hash_password, encrypt_pii
    from app.models.user import User, UserRole
    from app.models.supplier import Supplier, SupplierRiskLevel
    from app.models.inventory import Inventory, InventoryStatus
    from app.models.shipment import Shipment, ShipmentStatus, ShipmentPriority
    from app.core.database import Base

    # Create tables
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created/verified")

    # ── 1. Admin user ──────────────────────────────────────────────────────────
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(
            username="admin",
            role=UserRole.admin,
            is_active=True,
            hashed_password=hash_password("Admin@123"),
        )
        admin._email_encrypted = encrypt_pii("admin@autopilot.ai")
        db.add(admin)
        db.flush()
        print("✅ Admin user created: admin / Admin@123")
    else:
        print("ℹ️  Admin user already exists")

    # Operator user
    op = db.query(User).filter(User.username == "operator1").first()
    if not op:
        op = User(
            username="operator1",
            role=UserRole.operator,
            is_active=True,
            hashed_password=hash_password("Operator@123"),
        )
        op._email_encrypted = encrypt_pii("operator@autopilot.ai")
        db.add(op)
        print("✅ Operator user: operator1 / Operator@123")

    db.commit()

    # ── 2. Suppliers ──────────────────────────────────────────────────────────
    suppliers_data = [
        ("SHAN-01", "Shanghai Electronics Co.", "China", "Asia", "Electronics", 0.88, 0.92, 0.87, 12, SupplierRiskLevel.low),
        ("TITAN-02", "TITAN Components GmbH", "Germany", "Europe", "Mechanical", 0.95, 0.98, 0.94, 18, SupplierRiskLevel.low),
        ("LOGIX-03", "LogiX Freight Solutions", "USA", "North America", "Logistics", 0.72, 0.80, 0.69, 5, SupplierRiskLevel.medium),
        ("INDO-04", "IndoParts Manufacturing", "India", "Asia", "Electronics", 0.65, 0.70, 0.61, 21, SupplierRiskLevel.high),
        ("BRAZ-05", "BrazilTech Industries", "Brazil", "South America", "Raw Materials", 0.55, 0.60, 0.51, 30, SupplierRiskLevel.critical),
        ("VIET-06", "VietNam Precision Parts", "Vietnam", "Asia", "Mechanical", 0.82, 0.85, 0.79, 14, SupplierRiskLevel.low),
        ("MEX-07", "MexiParts S.A.", "Mexico", "North America", "Automotive", 0.76, 0.78, 0.73, 9, SupplierRiskLevel.medium),
    ]

    supplier_ids = []
    for code, name, country, region, cat, rel, qual, otd, lead, risk in suppliers_data:
        s = db.query(Supplier).filter(Supplier.code == code).first()
        if not s:
            s = Supplier(
                code=code, name=name, country=country, region=region,
                category=cat, reliability_score=rel, quality_score=qual,
                on_time_delivery_rate=otd, avg_lead_time_days=lead, risk_level=risk,
                risk_score=round(1 - rel, 2), is_active=True, is_certified=(risk == SupplierRiskLevel.low),
                total_orders=random.randint(50, 500),
                contact_name=f"{name.split()[0]} Manager",
                contact_email=f"contact@{code.lower()}.com",
            )
            db.add(s)
            db.flush()
        supplier_ids.append(s.id)
    db.commit()
    print(f"✅ {len(suppliers_data)} suppliers seeded")

    # ── 3. Inventory ──────────────────────────────────────────────────────────
    inventory_data = [
        ("MCU-001", "Microcontroller Unit ATmega328", "Electronics", "WH-A1", 45, 200, 1000, 2000, InventoryStatus.critical, 25.50),
        ("PWR-002", "Power Supply Unit 500W", "Electronics", "WH-A2", 320, 100, 500, 1500, InventoryStatus.healthy, 45.00),
        ("SENS-003", "Temperature Sensor DS18B20", "Electronics", "WH-B1", 0, 150, 300, 1000, InventoryStatus.out_of_stock, 8.75),
        ("MECH-004", "Aluminum Bracket Assembly", "Mechanical", "WH-C1", 890, 200, 1000, 3000, InventoryStatus.healthy, 12.30),
        ("CABLE-005", "USB-C Power Cable 2m", "Accessories", "WH-A3", 68, 100, 500, 2000, InventoryStatus.low, 4.20),
        ("PCB-006", "Printed Circuit Board v2.1", "Electronics", "WH-B2", 12, 50, 200, 500, InventoryStatus.critical, 89.00),
        ("PACK-007", "Protective Foam Packaging", "Packaging", "WH-D1", 1500, 300, 2000, 5000, InventoryStatus.healthy, 1.50),
        ("MOTOR-008", "Stepper Motor NEMA17", "Mechanical", "WH-C2", 234, 100, 500, 1500, InventoryStatus.healthy, 22.00),
    ]

    for sku, name, cat, wh, qty, reorder, reorder_qty, max_s, status, cost in inventory_data:
        item = db.query(Inventory).filter(Inventory.sku == sku).first()
        if not item:
            item = Inventory(
                sku=sku, product_name=name, category=cat, warehouse_location=wh,
                quantity_on_hand=qty, reorder_point=reorder, reorder_quantity=reorder_qty,
                max_stock=max_s, status=status, unit_cost=cost, unit_price=cost * 1.4,
                lead_time_days=random.randint(5, 21),
                supplier_id=random.choice(supplier_ids),
            )
            db.add(item)
    db.commit()
    print(f"✅ {len(inventory_data)} inventory items seeded")

    # ── 4. Shipments ──────────────────────────────────────────────────────────
    statuses = [
        ShipmentStatus.in_transit, ShipmentStatus.delayed, ShipmentStatus.delivered,
        ShipmentStatus.at_customs, ShipmentStatus.pending,
    ]
    routes = [
        ("Shanghai, CN", "Los Angeles, CA"), ("Frankfurt, DE", "New York, NY"),
        ("Mumbai, IN", "Dubai, UAE"), ("Ho Chi Minh City, VN", "Singapore"),
        ("São Paulo, BR", "Miami, FL"), ("Guadalajara, MX", "Dallas, TX"),
        ("Seoul, KR", "Tokyo, JP"), ("Amsterdam, NL", "Toronto, CA"),
    ]
    carriers = ["COSCO Shipping", "Maersk Line", "FedEx Freight", "DHL Express", "UPS Supply Chain"]

    for i in range(35):
        route = random.choice(routes)
        status = random.choice(statuses)
        delay = random.uniform(2, 18) if status == ShipmentStatus.delayed else 0.0
        expected = datetime.now(timezone.utc) + timedelta(days=random.randint(-5, 14))
        s = Shipment(
            tracking_number=f"AP-{str(uuid.uuid4())[:4].upper()}{str(i).zfill(3)}",
            origin=route[0], destination=route[1],
            carrier=random.choice(carriers),
            status=status,
            priority=random.choice(list(ShipmentPriority)),
            weight_kg=round(random.uniform(10, 5000), 2),
            value_usd=round(random.uniform(1000, 500000), 2),
            expected_delivery=expected,
            delay_hours=round(delay, 1),
            current_location=route[0] if status != ShipmentStatus.delivered else route[1],
            supplier_id=random.choice(supplier_ids),
        )
        db.add(s)
    db.commit()
    print("✅ 35 shipments seeded (including delayed + at_customs for anomaly triggers)")

    print("\n🎉 Demo data seeding complete!")
    print("\n📋 Demo Login Credentials:")
    print("   Admin:    username=admin    / password=Admin@123")
    print("   Operator: username=operator1 / password=Operator@123")
    print("\n🔐 MFA: After login, check backend logs for OTP (demo mode)")
    print("   Or use the frontend demo mode which auto-fills OTP: 123456")
    print("\n🌐 Service URLs:")
    print("   Frontend:  http://localhost:3000")
    print("   API Docs:  http://localhost:8000/api/docs")
    print("   Grafana:   http://localhost:3001 (admin/admin)")
    print("   RabbitMQ:  http://localhost:15672 (admin/admin_pass)")


if __name__ == "__main__":
    try:
        seed()
    except Exception as e:
        print(f"\n❌ Seeding failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()
