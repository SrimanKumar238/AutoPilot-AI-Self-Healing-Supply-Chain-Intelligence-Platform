# 🚀 AutoPilot AI – Self-Healing Supply Chain Intelligence Platform
### Track 4: Real-Time Supply Chain Control Tower Agent | DeepFrog AI Solutions Pvt. Ltd.

---

## 📋 Problem Statement

Modern supply chains suffer from **reactive, siloed decision-making**. Disruptions—supplier delays, port congestion, inventory shortfalls, demand spikes—are often discovered too late, leading to cascading failures, revenue loss, and customer dissatisfaction.

**Root Problems:**
- No single pane of glass across the entire supply chain
- Manual anomaly detection – humans can't monitor hundreds of KPIs 24/7
- Slow incident response – days to reroute, reorder, or escalate
- No audit trail of what happened and why

---

## 💡 Solution

**AutoPilot AI** is an AI-powered, event-driven **Real-Time Supply Chain Control Tower** that:

1. **Monitors** shipments, inventory, suppliers, and demand in real-time
2. **Detects** anomalies automatically using AI agents (Worker 1)
3. **Heals itself** autonomously by executing smart recovery strategies (Worker 2)
4. **Provides full observability** through a unified dashboard + Grafana/Loki/Tempo stack

---

## 🏗️ Architecture

```
Frontend (React) ──── REST API ────► FastAPI Backend (MVC)
                                           │
                          ┌────────────────┼────────────────┐
                          ▼                ▼                ▼
                      PostgreSQL         Redis          RabbitMQ
                    (Encrypted PII)   (Idempotency)  (Event Broker)
                                                          │
                                   ┌──────────────────────┤
                                   ▼                      ▼
                           Worker 1 (Anomaly)    Worker 2 (Healing)
                           AI Detection          Auto-Resolution

                    ┌─────────────────────────────────────┐
                    │   Observability: Prometheus + Grafana │
                    │   + Loki (logs) + Tempo (traces)      │
                    └─────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite, Recharts, React Router, Zustand |
| **Backend** | Python FastAPI (MVC pattern), SQLAlchemy (Singleton DB) |
| **Workers** | Python async workers (aio-pika), RabbitMQ consumers |
| **Queue** | RabbitMQ (topic exchange, durable, dead-letter) |
| **Cache/Idempotency** | Redis (OTP TTL, token store, dedup keys) |
| **Database** | PostgreSQL 16 (PII encrypted with Fernet) |
| **Auth** | JWT (access 15min + refresh 7d), Email OTP MFA, Google OAuth, RBAC |
| **Observability** | Prometheus + Grafana + Loki + Tempo + Promtail |
| **Containerization** | Docker Compose (12 services, single `supply-chain-net` network) |

---

## 📁 Project Structure

```
autopilot-supply-chain/
├── docker-compose.yml           ← All 12 services, single network
├── .env.example                 ← Environment variables template
├── README.md
│
├── backend/                     ← FastAPI (MVC pattern)
│   ├── app/
│   │   ├── main.py              ← App entry point + middleware
│   │   ├── core/                ← Config, Singleton DB, Security, Logging, Tracing
│   │   ├── models/              ← SQLAlchemy models (M in MVC)
│   │   ├── schemas/             ← Pydantic schemas (PII-safe)
│   │   ├── services/            ← Business logic + event publisher
│   │   ├── controllers/         ← Route handlers (C in MVC)
│   │   └── middlewares/         ← JWT/RBAC + request logging
│   └── Dockerfile
│
├── workers/
│   ├── shared/                  ← Queue client (atomic) + idempotency
│   ├── worker1_anomaly/         ← AI Anomaly Detection Agent
│   └── worker2_healing/         ← Self-Healing Orchestrator Agent
│
├── frontend/                    ← React + Vite dashboard
│   └── src/
│       ├── pages/               ← Dashboard, Shipments, Inventory, Suppliers, Alerts, Admin
│       ├── components/          ← Layout, Sidebar
│       ├── services/            ← Axios API client (auto token refresh)
│       └── store/               ← Zustand auth store
│
└── observability/
    ├── prometheus/
    ├── grafana/
    ├── loki/
    ├── promtail/
    └── tempo/
```

---

## 🚀 How to Run

### Prerequisites
- Docker Desktop (with WSL2 on Windows)
- Docker Compose v2

### Steps

```bash
# 1. Clone and navigate to project
cd autopilot-supply-chain

# 2. Copy environment file and configure
cp .env.example .env
# Edit .env: set SMTP credentials, GOOGLE OAuth, FERNET_KEY

# 3. Start all services
docker-compose up --build -d

# 4. Verify all services are healthy
docker-compose ps

# 5. Access the platform
```

### Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend Dashboard** | http://localhost:3000 | Register account |
| **Backend API Docs** | http://localhost:8000/api/docs | — |
| **Grafana** | http://localhost:3001 | admin / admin |
| **RabbitMQ Management** | http://localhost:15672 | admin / admin_pass |
| **Prometheus** | http://localhost:9090 | — |

### Development (Frontend only)

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

---

## ✅ Requirements Coverage

### Maintainability ✅
- [x] Clean MVC project structure
- [x] README.md (Problem, Solution, Tech Stack, How to Run)
- [x] Model-View-Controller pattern (FastAPI: Models → Services → Controllers)
- [x] Singleton pattern for DB connection (`DatabaseManager` metaclass)
- [x] REST API with versioned routes (`/api/v1/...`)
- [x] Structured error logging with structlog (JSON → Loki)

### Scalability ✅
- [x] Event-Driven Architecture (RabbitMQ topic exchange)
- [x] Workers are separate Docker services (NOT async jobs in backend)
- [x] RabbitMQ queue with durable messages + dead-letter exchange
- [x] All services dockerized in single `docker-compose.yml`
- [x] Single `supply-chain-net` Docker network (DNS-based discovery)
- [x] 2 workers running in parallel (Worker 1 + Worker 2)
- [x] Atomic task pickup (`prefetch_count=1` + `basic_ack`)
- [x] Idempotency via Redis deduplication keys

### Platform Security ✅
- [x] Email/password login
- [x] MFA: 6-digit OTP via email (5-min TTL in Redis)
- [x] JWT access tokens (15min) + refresh tokens (7d)
- [x] Google OAuth2 login
- [x] RBAC: Admin | Operator | Viewer roles
- [x] PII (email, phone) NOT exposed in any API response
- [x] PII encrypted in DB using Fernet symmetric encryption

### Observability ✅
- [x] Prometheus metrics (all services scraped)
- [x] Grafana dashboards (pre-provisioned datasources)
- [x] Loki log aggregation (JSON structured logs via Promtail)
- [x] Tempo distributed tracing (OpenTelemetry → OTLP → Tempo)
- [x] Request tracing across backend + workers

---

## 🤖 AI Agent Details

### Worker 1: Anomaly Detection Agent
- Subscribes to: `shipment.*`, `inventory.low`, `supplier.*`
- Runs rule-based + statistical anomaly detection
- Detects: shipment delays, inventory shortfalls, supplier risk, customs holds
- Publishes `anomaly.detected` events with AI confidence scores

### Worker 2: Self-Healing Orchestrator
- Subscribes to: `anomaly.detected`
- Healing strategies:
  - **Shipment delay** → Rerouting + stakeholder notification + backup supplier
  - **Inventory low** → Auto purchase order + cross-warehouse reallocation
  - **Supplier risk** → Secondary supplier evaluation + risk review scheduling
  - **Route disruption** → Alternative route calculation + carrier notification
- Writes healing results to database with full audit trail
- Publishes `healing.completed` events

---

## 🔐 Security Design

- **PII fields** (email, phone) stored with Fernet (AES-128) encryption
- **Pydantic schemas** intentionally omit PII fields from all API responses
- **Masked email** shown in admin view (e.g., `jo***@company.com`)
- **RBAC** enforced via FastAPI dependencies on every protected route
- **JWT** with short-lived access tokens and revocable refresh tokens in Redis
- **OTP** expires in 5 minutes; stored only in Redis, never logged

---

## 📊 Screenshots

> Screenshots added after running the application.

---

## 👤 Author

Built for **DeepFrog AI Solutions Pvt. Ltd.** – Track 4: Real-Time Supply Chain Control Tower Agent  
AutoPilot AI Team | April 2026



<img width="1600" height="762" alt="WhatsApp Image 2026-04-16 at 6 00 22 PM" src="https://github.com/user-attachments/assets/89388b78-13b8-464f-9ca8-b43ca8722ae9" />
<img width="1600" height="763" alt="WhatsApp Image 2026-04-16 at 5 58 20 PM" src="https://github.com/user-attachments/assets/76417e08-d2cf-4562-8245-41552deccc79" />

