"""
Astra AI Operating System - Configuration Module
Manages all configuration settings with environment variable support.
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any, List
from pydantic_settings import BaseSettings
from pydantic import Field, ConfigDict
import yaml
import json


class Settings(BaseSettings):
    """Application settings loaded from environment variables and config files."""

    model_config = ConfigDict(
        env_prefix="ASTRA_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "Astra AI"
    APP_VERSION: str = "0.1.0"
    APP_DESCRIPTION: str = "Personal AI Operating System"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Paths
    BASE_DIR: Path = Path(__file__).parent.parent
    DATA_DIR: Path = Field(default_factory=lambda: Path.home() / ".astra" / "data")
    MEMORY_DIR: Path = Field(default_factory=lambda: Path.home() / ".astra" / "memory")
    PLUGINS_DIR: Path = Field(default_factory=lambda: Path.home() / ".astra" / "plugins")
    LOGS_DIR: Path = Field(default_factory=lambda: Path.home() / ".astra" / "logs")
    CONFIG_DIR: Path = Field(default_factory=lambda: Path.home() / ".astra" / "config")
    MODELS_DIR: Path = Field(default_factory=lambda: Path.home() / ".astra" / "models")
    TEMP_DIR: Path = Field(default_factory=lambda: Path.home() / ".astra" / "temp")

    # Server
    HOST: str = "127.0.0.1"
    PORT: int = 8642
    WORKERS: int = 1
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "file://"]
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024  # 100MB

    # Database
    DATABASE_URL: str = Field(
        default_factory=lambda: f"sqlite+aiosqlite:///{Path.home() / '.astra' / 'data' / 'astra.db'}"
    )
    DATABASE_POOL_SIZE: int = 10
    DATABASE_TIMEOUT: int = 30

    # Vector Database (ChromaDB)
    CHROMA_PERSIST_DIR: str = Field(
        default_factory=lambda: str(Path.home() / ".astra" / "data" / "chroma_db")
    )
    CHROMA_COLLECTION_NAME: str = "astra_memory"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384

    # Model Configuration
    LOCAL_MODEL_PROVIDER: str = "ollama"
    OLLAMA_HOST: str = "http://127.0.0.1:11434"
    OLLAMA_TIMEOUT: int = 120
    DEFAULT_LOCAL_MODEL: str = "qwen2.5:7b"
    FALLBACK_MODEL: str = "llama3.2:3b"
    MAX_TOKENS: int = 4096
    TEMPERATURE: float = 0.7
    TOP_P: float = 0.9
    STREAMING: bool = True

    # Cloud Model Configuration
    CLOUD_MODEL_PROVIDER: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-haiku-20240307"

    # Voice Configuration
    WHISPER_MODEL: str = "base"
    WHISPER_LANGUAGE: str = "en"
    PIPER_VOICE: str = "en_US-lessac-medium"
    PIPER_RATE: float = 1.0
    WAKE_WORDS: List[str] = ["hey astra", "ok astra", "astra"]
    VOICE_TIMEOUT: int = 5
    SILENCE_THRESHOLD: int = 500

    # Vision Configuration
    VISION_MODEL: str = "qwen2.5-vl:7b"
    OCR_ENABLED: bool = True
    MAX_IMAGE_SIZE: int = 10 * 1024 * 1024  # 10MB

    # Security
    SECRET_KEY: str = Field(default_factory=lambda: os.urandom(32).hex())
    ENCRYPTION_ALGORITHM: str = "AES-256-GCM"
    PASSWORD_HASH_ALGORITHM: str = "bcrypt"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION: int = 86400  # 24 hours
    API_KEY_LENGTH: int = 32
    SESSION_TIMEOUT: int = 3600  # 1 hour
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION: int = 900  # 15 minutes

    # Plugin System
    PLUGIN_ENABLED: bool = True
    PLUGIN_SANDBOX_ENABLED: bool = True
    PLUGIN_MAX_MEMORY: int = 256  # MB
    PLUGIN_TIMEOUT: int = 30  # seconds

    # Performance
    GPU_ENABLED: bool = True
    CUDA_DEVICE: int = 0
    BATCH_SIZE: int = 32
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 3600
    RESPONSE_CACHE_SIZE: int = 100
    MAX_CONCURRENT_TASKS: int = 10
    BACKGROUND_WORKERS: int = 4

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    LOG_MAX_SIZE: int = 10 * 1024 * 1024  # 10MB
    LOG_BACKUP_COUNT: int = 5
    AUDIT_LOG_ENABLED: bool = True

    # Personality
    DEFAULT_PERSONALITY: str = "professional"
    PERSONALITIES: Dict[str, Dict[str, Any]] = {
        "professional": {
            "name": "Professional",
            "system_prompt": "You are Astra, a professional AI assistant. Be concise, accurate, and formal.",
            "temperature": 0.5,
            "style": "formal",
        },
        "friendly": {
            "name": "Friendly",
            "system_prompt": "You are Astra, a friendly AI assistant. Be warm, helpful, and conversational.",
            "temperature": 0.7,
            "style": "casual",
        },
        "technical": {
            "name": "Technical",
            "system_prompt": "You are Astra, a technical AI assistant. Provide detailed, technical explanations.",
            "temperature": 0.3,
            "style": "technical",
        },
        "creative": {
            "name": "Creative",
            "system_prompt": "You are Astra, a creative AI assistant. Think outside the box and be imaginative.",
            "temperature": 0.9,
            "style": "creative",
        },
        "researcher": {
            "name": "Researcher",
            "system_prompt": "You are Astra, a research AI assistant. Be thorough, cite sources, and analyze deeply.",
            "temperature": 0.4,
            "style": "academic",
        },
        "minimal": {
            "name": "Minimal",
            "system_prompt": "You are Astra, a minimal AI assistant. Give short, direct answers without elaboration.",
            "temperature": 0.2,
            "style": "minimal",
        },
    }

    # Automation
    SCREENSHOT_DIR: Path = Field(default_factory=lambda: Path.home() / ".astra" / "screenshots")
    BROWSER_HEADLESS: bool = True
    BROWSER_TIMEOUT: int = 30000
    AUTOMATION_SPEED: float = 1.0

    # Update
    UPDATE_CHECK_ENABLED: bool = True
    UPDATE_CHECK_INTERVAL: int = 86400  # 24 hours
    AUTO_UPDATE: bool = False
    UPDATE_CHANNEL: str = "stable"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._create_directories()
        self._load_config_file()

    def _create_directories(self):
        """Create required directories on initialization."""
        directories = [
            self.DATA_DIR,
            self.MEMORY_DIR,
            self.PLUGINS_DIR,
            self.LOGS_DIR,
            self.CONFIG_DIR,
            self.MODELS_DIR,
            self.TEMP_DIR,
            self.SCREENSHOT_DIR,
        ]
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)

    def _load_config_file(self):
        """Load additional configuration from YAML/JSON config files."""
        config_file = self.CONFIG_DIR / "config.yaml"
        if config_file.exists():
            with open(config_file, "r") as f:
                config_data = yaml.safe_load(f)
                if config_data:
                    for key, value in config_data.items():
                        setattr(self, key.upper(), value)

        json_config = self.CONFIG_DIR / "config.json"
        if json_config.exists():
            with open(json_config, "r") as f:
                config_data = json.load(f)
                if config_data:
                    for key, value in config_data.items():
                        setattr(self, key.upper(), value)

    def get_database_url(self) -> str:
        """Get the database URL, ensuring directory exists."""
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        return self.DATABASE_URL

    def to_dict(self) -> Dict[str, Any]:
        """Convert settings to dictionary, excluding secrets."""
        return {
            "app_name": self.APP_NAME,
            "app_version": self.APP_VERSION,
            "environment": self.ENVIRONMENT,
            "debug": self.DEBUG,
            "host": self.HOST,
            "port": self.PORT,
            "database_url": self.DATABASE_URL,
            "local_model_provider": self.LOCAL_MODEL_PROVIDER,
            "default_local_model": self.DEFAULT_LOCAL_MODEL,
            "default_personality": self.DEFAULT_PERSONALITY,
            "gpu_enabled": self.GPU_ENABLED,
            "log_level": self.LOG_LEVEL,
            "streaming": self.STREAMING,
        }


# Global settings instance
settings = Settings()

