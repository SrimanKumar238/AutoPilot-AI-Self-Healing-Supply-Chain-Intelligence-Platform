"""
Singleton Database Connection Manager.
Uses a metaclass-based singleton pattern to ensure a single engine/session factory
is created for the lifetime of the application.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool
from app.core.config import settings
import structlog

logger = structlog.get_logger(__name__)


class SingletonMeta(type):
    """Thread-safe metaclass-based Singleton."""
    _instances: dict = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class DatabaseManager(metaclass=SingletonMeta):
    """
    Singleton database manager.
    Holds the SQLAlchemy engine and session factory.
    """

    def __init__(self):
        self._engine = None
        self._session_factory = None
        self._initialize()

    def _initialize(self):
        logger.info("Initializing database connection", url=settings.DATABASE_URL.split("@")[-1])
        self._engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            echo=(settings.APP_ENV == "development"),
        )
        self._session_factory = sessionmaker(
            bind=self._engine,
            autocommit=False,
            autoflush=False,
        )
        logger.info("Database engine created successfully")

    @property
    def engine(self):
        return self._engine

    @property
    def session_factory(self):
        return self._session_factory


class Base(DeclarativeBase):
    pass


# Module-level singleton instance
db_manager = DatabaseManager()


def get_db():
    """FastAPI dependency – yields a database session."""
    session = db_manager.session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def create_tables():
    """Create all tables on startup."""
    from app.models import user, shipment, inventory, supplier, alert  # noqa
    Base.metadata.create_all(bind=db_manager.engine)
    logger.info("Database tables ensured")
