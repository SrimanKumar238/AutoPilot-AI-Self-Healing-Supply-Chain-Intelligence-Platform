"""
AutoPilot AI – FastAPI Application Entry Point
MVC architecture | JWT Auth | RBAC | Event-Driven | OpenTelemetry
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.database import create_tables, db_manager
from app.core.tracing import setup_tracing

from app.middlewares.logging_middleware import LoggingMiddleware

from app.controllers.auth_controller import router as auth_router
from app.controllers.shipment_controller import router as shipment_router
from app.controllers.inventory_controller import router as inventory_router
from app.controllers.supplier_controller import router as supplier_router
from app.controllers.alert_controller import router as alert_router
from app.controllers.dashboard_controller import router as dashboard_router, admin_router

import structlog

# ── Bootstrap ──────────────────────────────────────────────────────────────────
setup_logging()
logger = structlog.get_logger(__name__)

app = FastAPI(
    title="AutoPilot AI – Supply Chain Control Tower",
    description="Self-Healing Supply Chain Intelligence Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── Middleware ─────────────────────────────────────────────────────────────────
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Prometheus metrics ─────────────────────────────────────────────────────────
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# ── Routers ────────────────────────────────────────────────────────────────────
PREFIX = "/api/v1"
app.include_router(auth_router, prefix=PREFIX)
app.include_router(shipment_router, prefix=PREFIX)
app.include_router(inventory_router, prefix=PREFIX)
app.include_router(supplier_router, prefix=PREFIX)
app.include_router(alert_router, prefix=PREFIX)
app.include_router(dashboard_router, prefix=PREFIX)
app.include_router(admin_router, prefix=PREFIX)


# ── Startup / Shutdown ────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    logger.info("Starting AutoPilot AI backend", env=settings.APP_ENV)
    create_tables()
    setup_tracing(app=app, engine=db_manager.engine)
    logger.info("Backend ready")


@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down backend")


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/api/v1/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "autopilot-backend", "version": "1.0.0"}


@app.get("/", tags=["Root"])
def root():
    return {"message": "AutoPilot AI Supply Chain Control Tower API", "docs": "/api/docs"}
