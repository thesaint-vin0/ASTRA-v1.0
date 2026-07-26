"""
Astra AI - Settings Manager
Manages application settings with persistence to database and file.
"""

from typing import List, Dict, Any, Optional, TypeVar, Generic
import json
from pathlib import Path
from datetime import datetime, timezone
from loguru import logger

from ..config import settings
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..database.models import Setting as SettingModel


class SettingsManager:
    """
    Manages application settings with:
    - In-memory cache for fast access
    - Database persistence
    - File-based configuration
    - Environment variable overrides
    """

    def __init__(self):
        self._cache: Dict[str, Any] = {}
        self._load_config_files()

    def _load_config_files(self):
        """Load settings from configuration files."""
        # Load from YAML
        yaml_config = settings.CONFIG_DIR / "config.yaml"
        if yaml_config.exists():
            import yaml
            with open(yaml_config, "r") as f:
                data = yaml.safe_load(f)
                if data:
                    self._cache.update(data)

        # Load from JSON
        json_config = settings.CONFIG_DIR / "config.json"
        if json_config.exists():
            with open(json_config, "r") as f:
                data = json.load(f)
                if data:
                    self._cache.update(data)

    async def get(self, key: str, default: Any = None, db_session: Optional[AsyncSession] = None) -> Any:
        """Get a setting value by key."""
        # Check in-memory cache first
        if key in self._cache:
            return self._cache[key]

        # Check database
        if db_session:
            stmt = select(SettingModel).where(SettingModel.key == key)
            result = await db_session.execute(stmt)
            setting = result.scalar_one_or_none()
            if setting:
                value = self._deserialize_value(setting.value, setting.value_type)
                self._cache[key] = value
                return value

        # Check settings object
        env_key = key.upper()
        if hasattr(settings, env_key):
            return getattr(settings, env_key)

        return default

    async def set(
        self,
        key: str,
        value: Any,
        category: str = "general",
        description: Optional[str] = None,
        is_encrypted: bool = False,
        db_session: Optional[AsyncSession] = None,
    ):
        """Set a setting value."""
        value_type = self._get_value_type(value)
        serialized = self._serialize_value(value)

        # Update cache
        self._cache[key] = value

        # Persist to database
        if db_session:
            stmt = select(SettingModel).where(SettingModel.key == key)
            result = await db_session.execute(stmt)
            setting = result.scalar_one_or_none()

            if setting:
                setting.value = serialized
                setting.value_type = value_type
                setting.category = category
                if description:
                    setting.description = description
                setting.updated_at = datetime.now(timezone.utc)
            else:
                setting = SettingModel(
                    key=key,
                    value=serialized,
                    value_type=value_type,
                    category=category,
                    description=description or "",
                    is_encrypted=is_encrypted,
                )
                db_session.add(setting)
            await db_session.commit()

        logger.debug(f"Setting updated: {key} = {value}")

    async def delete(self, key: str, db_session: Optional[AsyncSession] = None):
        """Delete a setting."""
        self._cache.pop(key, None)

        if db_session:
            stmt = select(SettingModel).where(SettingModel.key == key)
            result = await db_session.execute(stmt)
            setting = result.scalar_one_or_none()
            if setting:
                await db_session.delete(setting)
                await db_session.commit()

    async def get_all(
        self, category: Optional[str] = None, db_session: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """Get all settings, optionally filtered by category."""
        settings_dict = {}

        # From cache
        for key, value in self._cache.items():
            if category is None:
                settings_dict[key] = value

        # From database
        if db_session:
            stmt = select(SettingModel)
            if category:
                stmt = stmt.where(SettingModel.category == category)
            result = await db_session.execute(stmt)
            for setting in result.scalars():
                settings_dict[setting.key] = self._deserialize_value(
                    setting.value, setting.value_type
                )

        return settings_dict

    def _get_value_type(self, value: Any) -> str:
        """Determine the type of a value for storage."""
        if isinstance(value, bool):
            return "bool"
        elif isinstance(value, int):
            return "int"
        elif isinstance(value, float):
            return "float"
        elif isinstance(value, (list, dict)):
            return "json"
        else:
            return "string"

    def _serialize_value(self, value: Any) -> str:
        """Serialize a value to string for storage."""
        if isinstance(value, (bool, int, float)):
            return str(value)
        elif isinstance(value, (list, dict)):
            return json.dumps(value)
        return str(value)

    def _deserialize_value(self, value: str, value_type: str) -> Any:
        """Deserialize a stored string value back to its original type."""
        if value_type == "bool":
            return value.lower() in ("true", "1", "yes")
        elif value_type == "int":
            return int(value)
        elif value_type == "float":
            return float(value)
        elif value_type == "json":
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return value

    def get_cached(self, key: str, default: Any = None) -> Any:
        """Get a value from cache only (no DB lookup)."""
        return self._cache.get(key, default)

    def export_settings(self) -> Dict[str, Any]:
        """Export all settings for backup."""
        return dict(self._cache)

    def import_settings(self, data: Dict[str, Any]):
        """Import settings from a backup."""
        self._cache.update(data)
        logger.info(f"Imported {len(data)} settings")

    def get_status(self) -> Dict[str, Any]:
        """Get settings manager status."""
        return {
            "cached_settings": len(self._cache),
            "config_files": [
                str(settings.CONFIG_DIR / "config.yaml"),
                str(settings.CONFIG_DIR / "config.json"),
            ],
        }
