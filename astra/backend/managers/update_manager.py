"""
Astra AI - Update Manager
Checks for updates and manages the update lifecycle.
"""

from typing import Dict, Any, Optional, AsyncGenerator, Callable, List
import json
import httpx
import shutil
import zipfile
import tempfile
import hashlib
import subprocess
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from loguru import logger

from ..config import settings


class UpdateManager:
    """
    Manages application updates:
    - Check for new versions
    - Download updates
    - Apply updates
    - Rollback on failure
    """

    UPDATE_URL = "https://api.github.com/repos/astra/astra-ai/releases"
    # Fallback to a configurable update server
    FALLBACK_UPDATE_URL = "https://updates.astra-ai.dev"

    def __init__(self):
        self._update_info: Optional[Dict[str, Any]] = None
        self._downloading = False
        self._download_progress: float = 0.0
        self._backup_path: Optional[Path] = None
        self._current_channel = settings.UPDATE_CHANNEL
        self._check_interval = settings.UPDATE_CHECK_INTERVAL
        self._last_check: Optional[datetime] = None

    async def check_for_updates(
        self,
        force: bool = False,
        channel: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Check for available updates.

        Args:
            force: Force check even if within check interval
            channel: Update channel to check (stable, beta, dev)

        Returns:
            Dict with update availability info
        """
        channel = channel or self._current_channel

        # Rate limit checks unless forced
        if not force and self._last_check:
            elapsed = (datetime.now(timezone.utc) - self._last_check).total_seconds()
            if elapsed < self._check_interval:
                return {
                    "checked": False,
                    "message": f"Last check was {int(elapsed)}s ago, next check in "
                               f"{int(self._check_interval - elapsed)}s",
                    "last_check": self._last_check.isoformat(),
                }

        self._last_check = datetime.now(timezone.utc)

        # Try primary update source (GitHub)
        try:
            result = await self._check_github(channel)
            if result.get("update_available"):
                self._update_info = result
                logger.info(f"Update available: v{result['latest_version']} ({channel})")
                return result
        except Exception as e:
            logger.warning(f"GitHub update check failed: {e}")

        # Try fallback update server
        try:
            result = await self._check_fallback(channel)
            if result.get("update_available"):
                self._update_info = result
                logger.info(f"Update available from fallback: v{result['latest_version']}")
                return result
        except Exception as e:
            logger.warning(f"Fallback update check failed: {e}")

        return {
            "update_available": False,
            "current_version": settings.APP_VERSION,
            "channel": channel,
            "checked_at": self._last_check.isoformat(),
            "message": "No updates available",
        }

    async def _check_github(self, channel: str) -> Dict[str, Any]:
        """Check for updates via GitHub Releases API."""
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "AstraAI/1.0",
        }

        params = {"per_page": 10}
        if channel != "stable":
            params["per_page"] = 20

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(self.UPDATE_URL, headers=headers, params=params)
            response.raise_for_status()
            releases = response.json()

        if not releases:
            return {"update_available": False}

        return self._process_releases(releases, channel)

    async def _check_fallback(self, channel: str) -> Dict[str, Any]:
        """Check for updates via fallback update server."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.FALLBACK_UPDATE_URL}/api/check",
                params={
                    "version": settings.APP_VERSION,
                    "channel": channel,
                    "platform": "windows",
                },
            )
            response.raise_for_status()
            return response.json()

    def _process_releases(
        self, releases: List[Dict[str, Any]], channel: str
    ) -> Dict[str, Any]:
        """Process GitHub releases and determine if update is needed."""
        from packaging.version import Version, InvalidVersion

        current = Version(settings.APP_VERSION)
        latest_version = current
        latest_release = None
        download_url = None
        release_notes = ""
        prerelease = False

        for release in releases:
            if release.get("draft", False):
                continue

            tag_name = release.get("tag_name", "").lstrip("v")
            is_prerelease = release.get("prerelease", False)

            # Channel filtering
            if channel == "stable" and is_prerelease:
                continue
            if channel == "beta" and is_prerelease:
                prerelease = True
            if channel == "dev":
                prerelease = True

            try:
                version = Version(tag_name)
                if version > latest_version:
                    latest_version = version
                    latest_release = release
                    # Find the right asset
                    for asset in release.get("assets", []):
                        name = asset.get("name", "").lower()
                        if name.endswith((".exe", ".msi", ".zip")) and "windows" in name:
                            download_url = asset.get("browser_download_url")
                            break
                    release_notes = release.get("body", "")[:2000]
            except InvalidVersion:
                continue

        update_available = latest_version > current

        return {
            "update_available": update_available,
            "current_version": settings.APP_VERSION,
            "latest_version": str(latest_version),
            "release_notes": release_notes,
            "download_url": download_url,
            "channel": channel,
            "prerelease": prerelease,
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "release_date": latest_release.get("published_at") if latest_release else None,
        }

    async def download_update(
        self,
        url: Optional[str] = None,
        progress_callback: Optional[Callable[[float], None]] = None,
    ) -> Optional[Path]:
        """
        Download the latest update package.

        Args:
            url: Direct download URL (uses stored URL if not provided)
            progress_callback: Callback for download progress (0.0 to 1.0)

        Returns:
            Path to downloaded update file, or None on failure
        """
        if self._downloading:
            logger.warning("Download already in progress")
            return None

        download_url = url or (self._update_info or {}).get("download_url")
        if not download_url:
            logger.error("No download URL available")
            return None

        self._downloading = True
        self._download_progress = 0.0

        temp_dir = Path(tempfile.mkdtemp(prefix="astra_update_"))
        download_path = temp_dir / "astra_update.zip"

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=30.0)) as client:
                async with client.stream("GET", download_url) as response:
                    response.raise_for_status()
                    total_size = int(response.headers.get("content-length", 0))

                    downloaded = 0
                    with open(download_path, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size=8192):
                            f.write(chunk)
                            downloaded += len(chunk)
                            if total_size > 0:
                                self._download_progress = downloaded / total_size
                                if progress_callback:
                                    progress_callback(self._download_progress)

            logger.info(f"Update downloaded: {download_path} ({downloaded} bytes)")
            return download_path

        except Exception as e:
            logger.error(f"Failed to download update: {e}")
            # Clean up
            shutil.rmtree(temp_dir, ignore_errors=True)
            return None

        finally:
            self._downloading = False
            self._download_progress = 0.0

    async def install_update(
        self,
        update_path: Optional[Path] = None,
        create_backup: bool = True,
    ) -> Dict[str, Any]:
        """
        Install a downloaded update.

        Args:
            update_path: Path to the downloaded update package
            create_backup: Whether to create a backup before updating

        Returns:
            Dict with installation result
        """
        if not update_path and self._update_info:
            update_path = await self.download_update()

        if not update_path or not update_path.exists():
            return {"success": False, "error": "No update package available"}

        # Create backup if requested
        if create_backup:
            backup_result = await self._create_backup()
            if not backup_result["success"]:
                logger.warning(f"Backup creation failed: {backup_result.get('error')}")

        try:
            app_dir = Path(__file__).parent.parent.parent  # astra directory

            if update_path.suffix == ".zip":
                # Extract zip to temp directory first
                extract_dir = Path(tempfile.mkdtemp(prefix="astra_extract_"))
                with zipfile.ZipFile(update_path, "r") as zf:
                    zf.extractall(extract_dir)

                # Apply update by replacing files
                await self._apply_update_files(extract_dir, app_dir)

                # Clean up extract directory
                shutil.rmtree(extract_dir, ignore_errors=True)

            elif update_path.suffix == ".exe":
                # Run installer executable
                result = subprocess.run(
                    [str(update_path), "/SILENT", "/VERYSILENT", "/SUPPRESSMSGBOXES"],
                    capture_output=True,
                    timeout=300,
                )
                if result.returncode != 0:
                    return {
                        "success": False,
                        "error": f"Installer failed with code {result.returncode}",
                        "output": result.stdout.decode(),
                    }

            else:
                return {"success": False, "error": f"Unsupported update format: {update_path.suffix}"}

            # Update version info
            if self._update_info:
                self._update_info["installed_version"] = self._update_info.get("latest_version")
                self._update_info["installed_at"] = datetime.now(timezone.utc).isoformat()

            logger.info(f"Update installed successfully from {update_path}")
            return {
                "success": True,
                "message": "Update installed successfully",
                "previous_version": settings.APP_VERSION,
                "new_version": self._update_info.get("latest_version", "unknown"),
                "requires_restart": True,
            }

        except Exception as e:
            logger.error(f"Update installation failed: {e}")
            return {"success": False, "error": str(e)}

    async def _apply_update_files(self, source_dir: Path, target_dir: Path):
        """Apply update by copying files from source to target."""
        for item in source_dir.rglob("*"):
            if item.is_file():
                relative_path = item.relative_to(source_dir)
                target_path = target_dir / relative_path
                target_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(item, target_path)
                logger.debug(f"Updated: {relative_path}")

    async def _create_backup(self) -> Dict[str, Any]:
        """Create a backup of the current application."""
        try:
            backup_dir = settings.DATA_DIR.parent / "backups"
            backup_dir.mkdir(parents=True, exist_ok=True)

            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            backup_name = f"astra_backup_{settings.APP_VERSION}_{timestamp}"
            backup_path = backup_dir / backup_name

            app_dir = Path(__file__).parent.parent.parent  # astra directory

            # Create backup archive
            shutil.make_archive(str(backup_path), "zip", app_dir)
            self._backup_path = Path(f"{backup_path}.zip")

            logger.info(f"Backup created: {self._backup_path}")
            return {
                "success": True,
                "backup_path": str(self._backup_path),
                "size": self._backup_path.stat().st_size,
            }

        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            return {"success": False, "error": str(e)}

    async def rollback(self) -> Dict[str, Any]:
        """
        Rollback to the previous version using backup.

        Returns:
            Dict with rollback result
        """
        if not self._backup_path or not self._backup_path.exists():
            # Try to find the latest backup
            backup_dir = settings.DATA_DIR.parent / "backups"
            if backup_dir.exists():
                backups = sorted(backup_dir.glob("astra_backup_*.zip"), reverse=True)
                if backups:
                    self._backup_path = backups[0]

        if not self._backup_path or not self._backup_path.exists():
            return {"success": False, "error": "No backup available for rollback"}

        try:
            app_dir = Path(__file__).parent.parent.parent

            # Extract backup
            extract_dir = Path(tempfile.mkdtemp(prefix="astra_rollback_"))
            with zipfile.ZipFile(self._backup_path, "r") as zf:
                zf.extractall(extract_dir)

            # Restore files
            await self._apply_update_files(extract_dir, app_dir)

            # Clean up
            shutil.rmtree(extract_dir, ignore_errors=True)

            logger.info(f"Rolled back from backup: {self._backup_path}")
            return {
                "success": True,
                "message": "Rollback completed successfully",
                "backup_used": str(self._backup_path),
                "requires_restart": True,
            }

        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            return {"success": False, "error": str(e)}

    def get_update_info(self) -> Optional[Dict[str, Any]]:
        """Get the latest update information."""
        return self._update_info

    def get_download_progress(self) -> float:
        """Get current download progress (0.0 to 1.0)."""
        return self._download_progress

    def is_downloading(self) -> bool:
        """Check if a download is in progress."""
        return self._downloading

    def set_channel(self, channel: str):
        """Set the update channel."""
        valid_channels = ["stable", "beta", "dev"]
        if channel in valid_channels:
            self._current_channel = channel
            self._update_info = None  # Reset cached info
            logger.info(f"Update channel set to: {channel}")

    def get_channel(self) -> str:
        """Get the current update channel."""
        return self._current_channel

    async def verify_update(self, update_path: Path) -> bool:
        """
        Verify the integrity of an update package.

        Args:
            update_path: Path to the update package

        Returns:
            True if verification passes
        """
        if not update_path.exists():
            return False

        # Check file size (minimum 1MB)
        if update_path.stat().st_size < 1024 * 1024:
            logger.error("Update package too small")
            return False

        # Verify ZIP integrity
        try:
            with zipfile.ZipFile(update_path, "r") as zf:
                bad_file = zf.testzip()
                if bad_file:
                    logger.error(f"Corrupted file in update package: {bad_file}")
                    return False
            return True
        except zipfile.BadZipFile:
            logger.error("Invalid update package (bad ZIP)")
            return False
        except Exception as e:
            logger.error(f"Update verification failed: {e}")
            return False

    def get_status(self) -> Dict[str, Any]:
        """Get update manager status."""
        return {
            "current_version": settings.APP_VERSION,
            "channel": self._current_channel,
            "last_check": self._last_check.isoformat() if self._last_check else None,
            "update_available": (self._update_info or {}).get("update_available", False),
            "latest_version": (self._update_info or {}).get("latest_version"),
            "is_downloading": self._downloading,
            "download_progress": self._download_progress,
            "has_backup": self._backup_path is not None and self._backup_path.exists(),
            "check_interval": self._check_interval,
            "auto_update": settings.AUTO_UPDATE,
        }

