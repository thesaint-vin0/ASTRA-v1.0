"""
Astra AI - Automation System
Desktop automation using Playwright (web) and PyAutoGUI (desktop).
"""

from typing import List, Dict, Any, Optional
import asyncio
from pathlib import Path
from datetime import datetime, timezone
from loguru import logger

from ..config import settings


class AutomationSystem:
    """
    Automation system supporting:
    - Web browser automation via Playwright
    - Desktop automation via PyAutoGUI
    - Keyboard and mouse control
    - Application launching
    """

    def __init__(self):
        self._browser = None
        self._context = None
        self._playwright = None
        self._initialized = False

    async def initialize(self):
        logger.info("Initializing Automation System...")
        self._initialized = True
        logger.info("Automation System initialized")

    async def launch_browser(self, url: Optional[str] = None) -> Dict[str, Any]:
        try:
            from playwright.async_api import async_playwright
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(headless=settings.BROWSER_HEADLESS)
            self._context = await self._browser.new_context()
            if url:
                page = await self._context.new_page()
                await page.goto(url)
                return {"success": True, "url": url, "title": await page.title()}
            return {"success": True, "status": "Browser launched"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def navigate(self, url: str) -> Dict[str, Any]:
        try:
            if not self._browser:
                return {"success": False, "error": "Browser not launched"}
            pages = self._context.pages
            page = pages[0] if pages else await self._context.new_page()
            await page.goto(url, timeout=settings.BROWSER_TIMEOUT)
            return {"success": True, "url": url, "title": await page.title()}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def click_element(self, selector: str) -> Dict[str, Any]:
        try:
            if not self._browser:
                return {"success": False, "error": "Browser not launched"}
            page = self._context.pages[0]
            await page.click(selector)
            return {"success": True, "selector": selector}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def type_text(self, selector: str, text: str) -> Dict[str, Any]:
        try:
            if not self._browser:
                return {"success": False, "error": "Browser not launched"}
            page = self._context.pages[0]
            await page.fill(selector, text)
            return {"success": True, "selector": selector, "text_length": len(text)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def extract_text(self, selector: str) -> Dict[str, Any]:
        try:
            if not self._browser:
                return {"success": False, "error": "Browser not launched"}
            page = self._context.pages[0]
            text = await page.text_content(selector)
            return {"success": True, "text": text}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def take_screenshot(self, path: Optional[str] = None) -> Dict[str, Any]:
        try:
            if not self._browser:
                return {"success": False, "error": "Browser not launched"}
            if not path:
                path = str(settings.SCREENSHOT_DIR / f"web_{int(datetime.now(timezone.utc).timestamp())}.png")
            page = self._context.pages[0]
            await page.screenshot(path=path, full_page=True)
            return {"success": True, "path": path}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def execute_javascript(self, code: str) -> Dict[str, Any]:
        try:
            if not self._browser:
                return {"success": False, "error": "Browser not launched"}
            page = self._context.pages[0]
            result = await page.evaluate(code)
            return {"success": True, "result": result}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def desktop_click(self, x: int, y: int) -> Dict[str, Any]:
        try:
            import pyautogui
            pyautogui.click(x, y)
            return {"success": True, "x": x, "y": y}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def desktop_type(self, text: str) -> Dict[str, Any]:
        try:
            import pyautogui
            pyautogui.typewrite(text)
            return {"success": True, "text": text}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def desktop_press_key(self, key: str) -> Dict[str, Any]:
        try:
            import pyautogui
            pyautogui.press(key)
            return {"success": True, "key": key}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def open_application(self, app_name: str) -> Dict[str, Any]:
        try:
            import subprocess
            subprocess.Popen(app_name, shell=True)
            return {"success": True, "application": app_name}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def close_browser(self) -> Dict[str, Any]:
        try:
            if self._browser:
                await self._browser.close()
            if self._playwright:
                await self._playwright.stop()
            self._browser = None
            self._context = None
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_status(self) -> Dict[str, Any]:
        return {"initialized": self._initialized, "browser_running": self._browser is not None}
