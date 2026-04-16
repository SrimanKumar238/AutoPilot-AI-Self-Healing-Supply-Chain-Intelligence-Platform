"""OpenTelemetry distributed tracing setup – exports to Tempo via OTLP gRPC."""
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from app.core.config import settings
import structlog

logger = structlog.get_logger(__name__)


def setup_tracing(app=None, engine=None):
    """Initialize OpenTelemetry tracing with OTLP exporter to Tempo."""
    resource = Resource(attributes={SERVICE_NAME: settings.OTEL_SERVICE_NAME})
    provider = TracerProvider(resource=resource)

    try:
        otlp_exporter = OTLPSpanExporter(
            endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT,
            insecure=True,
        )
        provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
        logger.info("OTLP tracing configured", endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT)
    except Exception as e:
        logger.warning("OTLP exporter not available, tracing will be no-op", error=str(e))

    trace.set_tracer_provider(provider)

    if app:
        FastAPIInstrumentor.instrument_app(app)
    if engine:
        SQLAlchemyInstrumentor().instrument(engine=engine)

    return provider


def get_tracer(name: str = "autopilot"):
    return trace.get_tracer(name)
