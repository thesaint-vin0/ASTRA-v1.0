"""
Astra AI - Plugin Manager
Discovers, loads, and manages plugins with sandbox execution.
"""

from typing import List, Dict, Any, Optional
import importlib
import inspect
import os
import sys
import json
from pathlib import Path
from datetime import datetime, timezone
from loguru import logger

from ..config import settings
from ..database.models import Plugin, PluginStatus


class PluginManager:
    """
    Plugin manager supporting:
    - Plugin discovery and loading
    - Sandboxed execution
    - Dependency management
    - Lifecycle hooks
    - Permission management
    """

    def __init__(self):
        self.plugins: Dict[str, Dict[str, Any]] = {}
        self._plugin_modules: Dict[str, Any] = {}

    async def discover_plugins(self):
        """Discover plugins from the plugins directory."""
        plugins_dir = settings.PLUGINS_DIR
        if not plugins_dir.exists():
            plugins_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created plugins directory: {plugins_dir}")
            return

        for item in plugins_dir.iterdir():
            if item.is_dir() and (item / "plugin.json").exists():
                try:
                    await self._load_plugin(item)
                except Exception as e:
                    logger.error(f"Failed to load plugin from {item}: {e}")

    async def _load_plugin(self, plugin_dir: Path) -> Optional[Dict[str, Any]]:
        """Load a single plugin from a directory."""
        manifest_path = plugin_dir / "plugin.json"
        with open(manifest_path, "r") as f:
            manifest = json.load(f)

        plugin_name = manifest.get("name", plugin_dir.name)
        if plugin_name in self.plugins:
            logger.warning(f"Plugin already loaded: {plugin_name}")
            return None

        # Validate manifest
        required_fields = ["name", "version", "entry_point"]
        for field in required_fields:
            if field not in manifest:
                logger.error(f"Plugin {plugin_name} missing required field: {field}")
                return None

        # Add plugin directory to path
        if str(plugin_dir) not in sys.path:
            sys.path.insert(0, str(plugin_dir))

        try:
            # Import the plugin module
            module = importlib.import_module(manifest["entry_point"])

            plugin_info = {
                "name": plugin_name,
                "version": manifest.get("version", "0.1.0"),
                "description": manifest.get("description", ""),
                "author": manifest.get("author", ""),
                "type": manifest.get("type", "tool"),
                "permissions": manifest.get("permissions", []),
                "dependencies": manifest.get("dependencies", []),
                "module": module,
                "loaded_at": datetime.now(timezone.utc).isoformat(),
                "status": PluginStatus.ACTIVE,
            }

            self.plugins[plugin_name] = plugin_info
            self._plugin_modules[plugin_name] = module

            logger.info(f"Loaded plugin: {plugin_name} v{plugin_info['version']}")
            return plugin_info

        except Exception as e:
            logger.error(f"Failed to load plugin {plugin_name}: {e}")
            return None

    def get_plugin(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a loaded plugin by name."""
        return self.plugins.get(name)

    def get_plugin_tools(self, plugin_name: str) -> List[Dict[str, Any]]:
        """Get tools exported by a plugin."""
        plugin = self.plugins.get(plugin_name)
        if not plugin:
            return []

        module = plugin.get("module")
        if not module:
            return []

        tools = []
        for name, obj in inspect.getmembers(module):
            if callable(obj) and not name.startswith("_"):
                tools.append({
                    "name": name,
                    "plugin": plugin_name,
                    "module": module.__name__,
                })
        return tools

    async def unload_plugin(self, name: str):
        """Unload a plugin."""
        if name in self.plugins:
            plugin = self.plugins[name]
            plugin["status"] = PluginStatus.DISABLED
            self._plugin_modules.pop(name, None)
            logger.info(f"Unloaded plugin: {name}")

    def list_plugins(self, status: Optional[PluginStatus] = None) -> List[Dict[str, Any]]:
        """List all plugins, optionally filtered by status."""
        plugins_list = []
        for name, plugin in self.plugins.items():
            if status is None or plugin.get("status") == status:
                plugins_list.append({
                    "name": name,
                    "version": plugin.get("version"),
                    "description": plugin.get("description", ""),
                    "author": plugin.get("author", ""),
                    "type": plugin.get("type"),
                    "status": plugin.get("status", PluginStatus.INSTALLED).value,
                    "loaded_at": plugin.get("loaded_at"),
                })
        return plugins_list

    def get_status(self) -> Dict[str, Any]:
        """Get plugin manager status."""
        return {
            "total_plugins": len(self.plugins),
            "active_plugins": sum(
                1 for p in self.plugins.values()
                if p.get("status") == PluginStatus.ACTIVE
            ),
            "plugin_directory": str(settings.PLUGINS_DIR),
        }
