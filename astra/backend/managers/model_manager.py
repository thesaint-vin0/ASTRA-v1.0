"""
Astra AI - Model Manager
Manages local (Ollama) and cloud AI model connections.
"""

from typing import List, Dict, Any, Optional, AsyncGenerator, AsyncIterator
import json
import httpx
import asyncio
from loguru import logger

from ..config import settings


class ModelManager:
    """
    Manages AI model connections:
    - Local models via Ollama
    - Cloud models via OpenAI-compatible APIs
    - Model selection based on task
    - Load balancing and fallback
    """

    def __init__(self):
        self.models: Dict[str, Dict[str, Any]] = {}
        self.ollama_client: Optional[httpx.AsyncClient] = None
        self.cloud_client: Optional[httpx.AsyncClient] = None
        self._initialized = False

    async def initialize(self):
        """Initialize model connections."""
        logger.info("Initializing Model Manager...")

        # Initialize Ollama client
        self.ollama_client = httpx.AsyncClient(
            base_url=settings.OLLAMA_HOST,
            timeout=httpx.Timeout(settings.OLLAMA_TIMEOUT),
        )

        # Initialize cloud client if configured
        if settings.OPENAI_API_KEY:
            self.cloud_client = httpx.AsyncClient(
                base_url=settings.OPENAI_BASE_URL or "https://api.openai.com/v1",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                timeout=httpx.Timeout(60.0),
            )

        # Discover available models
        await self._discover_models()

        self._initialized = True
        logger.info(f"Model Manager initialized. Available models: {list(self.models.keys())}")

    async def _discover_models(self):
        """Discover available models from Ollama and cloud."""
        # Check Ollama availability
        try:
            response = await self.ollama_client.get("/api/tags")
            if response.status_code == 200:
                data = response.json()
