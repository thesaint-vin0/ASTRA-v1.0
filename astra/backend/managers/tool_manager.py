"""
Astra AI - Tool Manager
Registry, discovery, and execution of tools and functions.
"""

from typing import List, Dict, Any, Optional, Callable, Awaitable
import inspect
import asyncio
import json
import aiofiles
from datetime import datetime, timezone
from loguru import logger


class Tool:
    """Represents a single tool/function that the AI can use."""

    def __init__(
        self,
        name: str,
        description: str,
        handler: Callable[..., Any],
        parameters: Optional[Dict[str, Any]] = None,
        required_permissions: Optional[List[str]] = None,
        category: str = "general",
    ):
        self.name = name
        self.description = description
        self.handler = handler
        self.parameters = parameters or {
            "type": "object",
            "properties": {},
            "required": [],
        }
        self.required_permissions = required_permissions or []
        self.category = category

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
            "category": self.category,
        }


class ToolManager:
    """
    Manages tool registration, discovery, and execution.
    Tools are callable functions that extend the AI's capabilities.
    """

    def __init__(self):
        self.tools: Dict[str, Tool] = {}
        self.execution_history: List[Dict[str, Any]] = []

    async def load_builtin_tools(self):
        """Load all built-in tools."""
        logger.info("Loading built-in tools...")

        self.register_tool(Tool(
            name="read_file",
            description="Read the contents of a file at the specified path",
            handler=self._read_file,
            parameters={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to the file"},
                },
                "required": ["path"],
            },
            category="filesystem",
        ))

        self.register_tool(Tool(
            name="write_file",
            description="Write content to a file at the specified path",
            handler=self._write_file,
            parameters={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to the file"},
                    "content": {"type": "string", "description": "Content to write"},
                },
                "required": ["path", "content"],
            },
            category="filesystem",
        ))

        self.register_tool(Tool(
            name="execute_python",
            description="Execute Python code in a sandboxed environment",
            handler=self._execute_python,
            parameters={
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Python code to execute"},
                },
                "required": ["code"],
            },
            required_permissions=["code_execution"],
            category="code",
        ))

        self.register_tool(Tool(
            name="web_search",
            description="Search the web for information (requires internet)",
            handler=self._web_search,
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                },
                "required": ["query"],
            },
            category="web",
        ))

        self.register_tool(Tool(
            name="fetch_webpage",
            description="Fetch and summarize a webpage",
            handler=self._fetch_webpage,
            parameters={
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "URL to fetch"},
                },
                "required": ["url"],
            },
            category="web",
        ))

        self.register_tool(Tool(
            name="get_system_info",
            description="Get information about the system",
            handler=self._get_system_info,
            parameters={"type": "object", "properties": {}, "required": []},
            category="system",
        ))

        self.register_tool(Tool(
            name="get_time",
            description="Get the current date and time",
            handler=self._get_time,
            parameters={"type": "object", "properties": {}, "required": []},
            category="system",
        ))

        self.register_tool(Tool(
            name="search_memory",
            description="Search through stored memories",
            handler=self._search_memory,
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                },
                "required": ["query"],
            },
            category="memory",
        ))

        self.register_tool(Tool(
            name="calculate",
            description="Perform mathematical calculations",
            handler=self._calculate,
            parameters={
                "type": "object",
                "properties": {
                    "expression": {"type": "string", "description": "Math expression"},
                },
                "required": ["expression"],
            },
            category="utility",
        ))

        logger.info(f"Loaded {len(self.tools)} built-in tools")

    def register_tool(self, tool: Tool):
        self.tools[tool.name] = tool
        logger.debug(f"Registered tool: {tool.name}")

    def unregister_tool(self, name: str):
        if name in self.tools:
            del self.tools[name]

    def get_tool(self, name: str) -> Optional[Tool]:
        return self.tools.get(name)

    def list_tools(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        tools_list = []
        for name, tool in self.tools.items():
            if category is None or tool.category == category:
                tools_list.append(tool.to_dict())
        return tools_list

    async def execute_tool(
        self, tool_name: str, arguments: Dict[str, Any], permissions: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        tool = self.tools.get(tool_name)
        if not tool:
            return {"error": f"Tool '{tool_name}' not found", "tool": tool_name}

        if tool.required_permissions and permissions:
            missing = [p for p in tool.required_permissions if p not in permissions]
            if missing:
                return {"error": f"Missing permissions: {missing}", "tool": tool_name}

        try:
            start_time = datetime.now(timezone.utc)
            if asyncio.iscoroutinefunction(tool.handler):
                result = await tool.handler(**arguments)
            else:
                result = tool.handler(**arguments)
            elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()

            execution = {
                "tool": tool_name, "arguments": arguments, "result": result,
                "elapsed_seconds": elapsed, "timestamp": start_time.isoformat(),
            }
            self.execution_history.append(execution)
            if len(self.execution_history) > 1000:
                self.execution_history = self.execution_history[-500:]

            return {"tool": tool_name, "result": result, "elapsed_seconds": elapsed}
        except Exception as e:
            logger.error(f"Tool execution failed: {tool_name} - {e}")
            return {"error": str(e), "tool": tool_name}

    async def _read_file(self, path: str) -> Dict[str, Any]:
        try:
            async with aiofiles.open(path, "r", encoding="utf-8") as f:
                content = await f.read()
            return {"success": True, "content": content, "path": path}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _write_file(self, path: str, content: str) -> Dict[str, Any]:
        try:
            async with aiofiles.open(path, "w", encoding="utf-8") as f:
                await f.write(content)
            return {"success": True, "path": path, "size": len(content)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _execute_python(self, code: str) -> Dict[str, Any]:
        try:
            safe_globals = {
                "__builtins__": {k: v for k, v in __builtins__.items()
                    if k in ("print","len","range","int","float","str","list","dict",
                             "tuple","set","bool","True","False","None",
                             "sum","min","max","abs","round","sorted",
                             "enumerate","zip","map","filter","any","all")}
            }
            local_vars = {}
            exec(code, safe_globals, local_vars)
            output = local_vars.get("result", local_vars)
            return {"success": True, "output": str(output)[:1000]}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _web_search(self, query: str) -> Dict[str, Any]:
        return {"success": True, "message": f"Web search for '{query}'"}

    async def _fetch_webpage(self, url: str) -> Dict[str, Any]:
        return {"success": True, "message": f"Webpage '{url}'"}

    async def _get_system_info(self) -> Dict[str, Any]:
        import platform
        info = {
            "os": platform.system(), "os_version": platform.version(),
            "architecture": platform.machine(), "python_version": platform.python_version(),
            "hostname": platform.node(),
        }
        return {"success": True, "info": info}

    async def _get_time(self) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        return {"success": True, "datetime": now.isoformat(), "date": now.strftime("%Y-%m-%d"), "time": now.strftime("%H:%M:%S UTC")}

    async def _search_memory(self, query: str) -> Dict[str, Any]:
        return {"success": True, "message": f"Memory search for '{query}'"}

    async def _calculate(self, expression: str) -> Dict[str, Any]:
        try:
            safe_globals = {"__builtins__": {}}
            result = eval(expression, safe_globals, {"abs": abs, "round": round, "min": min, "max": max, "sum": sum})
            return {"success": True, "expression": expression, "result": result}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_execution_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self.execution_history[-limit:]

    def get_status(self) -> Dict[str, Any]:
        return {"total_tools": len(self.tools), "execution_count": len(self.execution_history)}
