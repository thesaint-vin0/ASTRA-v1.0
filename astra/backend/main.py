"""
Astra AI Operating System - Main Entry Point
FastAPI server with WebSocket support for real-time AI communication.
"""

import sys
import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger

from .config import settings
from .database.database import init_database, DatabaseManager
from .database.vector_store import VectorStore
from .core.ai_engine import AIEngine
from .api import routes as api_routes
from .api import websocket as ws_module

# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan> - <level>{message}</level>",
    level=settings.LOG_LEVEL,
    colorize=True,
)
logger.add(
    settings.LOGS_DIR / "astra.log",
    rotation="10 MB",
    retention="5 days",
    level=settings.LOG_LEVEL,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name} - {message}",
)

# Global instances
db_manager: DatabaseManager = None
vector_store: VectorStore = None
ai_engine: AIEngine = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle manager."""
    global db_manager, vector_store, ai_engine

    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}...")

    # Step 1: Initialize database
    db_manager = DatabaseManager()
    await init_database()
    logger.info("Database initialized")

    # Step 2: Initialize vector store
    vector_store = VectorStore()
    try:
        vector_store.initialize()
        logger.info("Vector store initialized")
    except Exception as e:
        logger.warning(f"Vector store initialization failed (will retry): {e}")

    # Step 3: Initialize AI Engine
    ai_engine = AIEngine(db_manager=db_manager, vector_store=vector_store)
    try:
        await ai_engine.initialize()
        logger.info("AI Engine initialized")
    except Exception as e:
        logger.warning(f"AI Engine initialization partial: {e}")

    # Step 4: Wire up API dependencies (set module-level variables)
    api_routes.ai_engine = ai_engine
    ws_module.ai_engine = ai_engine

    logger.info(f"{settings.APP_NAME} is ready on http://{settings.HOST}:{settings.PORT}")
    logger.info(f"API docs: http://{settings.HOST}:{settings.PORT}/docs")

    yield

    # Shutdown
    logger.info("Shutting down...")
    if ai_engine:
        await ai_engine.model_manager.close()
    if db_manager:
        db_manager.close()
    if vector_store:
        vector_store.close()
    logger.info("Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=settings.APP_DESCRIPTION,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_routes.router)

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_route(websocket: WebSocket):
    await ws_module.websocket_endpoint(websocket)


# Static files (for frontend in production)
frontend_path = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="frontend")


@app.get("/")
async def root():
    """Root endpoint - API health check."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "websocket": "/ws",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "astra.backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=settings.WORKERS,
        log_level=settings.LOG_LEVEL.lower(),
    )
