"""
Astra AI - Database Manager
Handles SQLite database connections, sessions, and lifecycle.
"""

import os
from pathlib import Path
from typing import AsyncGenerator, Generator, Optional
from contextlib import asynccontextmanager, contextmanager

from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool
from loguru import logger

from ..config import settings
from .models import Base


class DatabaseManager:
    """
    Singleton database manager handling synchronous and async connections.
    Uses SQLite with WAL mode for better concurrent performance.
    """

    _instance: Optional["DatabaseManager"] = None
    _engine = None
    _async_engine = None
    _session_factory = None
    _async_session_factory = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, database_url: Optional[str] = None):
        if not self._initialized:
            self.database_url = database_url or settings.get_database_url()
            self._setup_engines()
            self._initialized = True

    def _setup_engines(self):
        """Create synchronous and asynchronous database engines."""
        db_path = self.database_url.replace("sqlite+aiosqlite:///", "")
        sync_url = f"sqlite:///{db_path}"

        # Sync engine with WAL mode
        self._engine = create_engine(
            sync_url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            echo=settings.DEBUG,
        )

        # Enable WAL mode for better concurrent performance
        @event.listens_for(self._engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA cache_size=-64000")  # 64MB cache
            cursor.execute("PRAGMA busy_timeout=5000")
            cursor.execute("PRAGMA temp_store=MEMORY")
            cursor.close()

        self._session_factory = sessionmaker(
            bind=self._engine,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
        )

        # Async engine
        self._async_engine = create_async_engine(
            self.database_url,
            echo=settings.DEBUG,
            poolclass=NullPool,
            connect_args={
                "timeout": settings.DATABASE_TIMEOUT,
            },
        )

        self._async_session_factory = async_sessionmaker(
            bind=self._async_engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

    def init_tables(self):
        """Create all database tables."""
        Base.metadata.create_all(bind=self._engine)
        logger.info("Database tables created successfully")

    async def async_init_tables(self):
        """Create all database tables asynchronously."""
        async with self._async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully (async)")

    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """Get a synchronous database session."""
        session = self._session_factory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()

    @asynccontextmanager
    async def get_async_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get an asynchronous database session."""
        session = self._async_session_factory()
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Async database session error: {e}")
            raise
        finally:
            await session.close()

    def close(self):
        """Close all database connections."""
        if self._engine:
            self._engine.dispose()
        if self._async_engine:
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(self._async_engine.dispose())
                else:
                    asyncio.run(self._async_engine.dispose())
            except RuntimeError:
                pass
        logger.info("Database connections closed")

    @property
    def is_connected(self) -> bool:
        """Check if database engine is available."""
        try:
            with self._engine.connect() as conn:
                conn.execute(
                    __import__("sqlalchemy").text("SELECT 1")
                )
                return True
        except Exception:
            return False


# Global database manager instance
db_manager: Optional[DatabaseManager] = None


def get_db_manager() -> DatabaseManager:
    """Get or create the global DatabaseManager instance."""
    global db_manager
    if db_manager is None:
        db_manager = DatabaseManager()
    return db_manager


def get_db() -> Generator[Session, None, None]:
    """Dependency for synchronous database sessions."""
    manager = get_db_manager()
    with manager.get_session() as session:
        yield session


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for asynchronous database sessions."""
    manager = get_db_manager()
    async with manager.get_async_session() as session:
        yield session


async def init_database():
    """Initialize the database: create tables and verify connection."""
    manager = get_db_manager()
    await manager.async_init_tables()
    logger.info("Database initialized successfully")
    return manager

