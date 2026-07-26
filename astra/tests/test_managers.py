"""
Astra AI - Manager Tests
Tests for tool manager, security manager, settings manager.
"""

import pytest
import pytest_asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from astra.backend.managers.tool_manager import ToolManager, Tool
from astra.backend.managers.security_manager import SecurityManager


@pytest.fixture
def tool_manager():
    tm = ToolManager()
    return tm


@pytest.fixture
def security_manager():
    return SecurityManager()


@pytest.mark.asyncio
async def test_tool_manager_register(tool_manager):
    """Test registering a tool."""
    tool = Tool(
        name="test_tool",
        description="A test tool",
        handler=lambda: {"result": "success"},
        category="test",
    )
    tool_manager.register_tool(tool)
    assert "test_tool" in tool_manager.tools
    assert tool_manager.get_tool("test_tool") is not None


@pytest.mark.asyncio
async def test_tool_manager_unregister(tool_manager):
    """Test unregistering a tool."""
    tool = Tool(name="temp_tool", description="Temp", handler=lambda: None)
    tool_manager.register_tool(tool)
    tool_manager.unregister_tool("temp_tool")
    assert tool_manager.get_tool("temp_tool") is None


@pytest.mark.asyncio
async def test_tool_manager_list(tool_manager):
    """Test listing tools by category."""
    tool_manager.register_tool(Tool(name="a", description="Tool A", handler=lambda: None, category="cat1"))
    tool_manager.register_tool(Tool(name="b", description="Tool B", handler=lambda: None, category="cat2"))
    cat1_tools = tool_manager.list_tools(category="cat1")
    assert len(cat1_tools) == 1
    all_tools = tool_manager.list_tools()
    assert len(all_tools) == 2


@pytest.mark.asyncio
async def test_tool_manager_execute(tool_manager):
    """Test executing a tool."""
    async def test_handler(**kwargs):
        return {"value": kwargs.get("x", 0) + 1}
    tool_manager.register_tool(Tool(name="add_one", description="Adds one", handler=test_handler))
    result = await tool_manager.execute_tool("add_one", {"x": 5})
    assert result["result"]["value"] == 6


@pytest.mark.asyncio
async def test_tool_manager_execute_not_found(tool_manager):
    """Test executing non-existent tool."""
    result = await tool_manager.execute_tool("nonexistent", {})
    assert "error" in result


@pytest.mark.asyncio
async def test_tool_manager_history(tool_manager):
    """Test execution history."""
    async def handler(**kwargs):
        return {"ok": True}
    tool_manager.register_tool(Tool(name="hist_tool", description="History test", handler=handler))
    await tool_manager.execute_tool("hist_tool", {})
    assert len(tool_manager.get_execution_history()) == 1


@pytest.mark.asyncio
async def test_tool_manager_get_system_info(tool_manager):
    """Test built-in system info tool."""
    await tool_manager.load_builtin_tools()
    result = await tool_manager.execute_tool("get_system_info", {})
    assert result["result"]["success"]
    assert "os" in result["result"]["info"]


@pytest.mark.asyncio
async def test_tool_manager_calculate(tool_manager):
    """Test built-in calculate tool."""
    await tool_manager.load_builtin_tools()
    result = await tool_manager.execute_tool("calculate", {"expression": "2 + 2"})
    assert result["result"]["success"]
    assert result["result"]["result"] == 4


def test_security_manager_encrypt_decrypt(security_manager):
    """Test encryption/decryption."""
    original = "sensitive data"
    encrypted = security_manager.encrypt(original)
    assert encrypted != original
    decrypted = security_manager.decrypt(encrypted)
    assert decrypted == original


def test_security_manager_password_hash(security_manager):
    """Test password hashing and verification."""
    password = "my_secure_password"
    hashed = security_manager.hash_password(password)
    assert hashed != password
    assert security_manager.verify_password(password, hashed)
    assert not security_manager.verify_password("wrong_password", hashed)


def test_security_manager_api_key(security_manager):
    """Test API key generation and verification."""
    key = security_manager.generate_api_key()
    assert key.startswith("astra_")
    hashed = security_manager.hash_api_key(key)
    assert security_manager.verify_api_key(key, hashed)
    assert not security_manager.verify_api_key("wrong_key", hashed)


def test_security_manager_jwt(security_manager):
    """Test JWT token creation and verification."""
    token = security_manager.create_jwt_token("user123")
    payload = security_manager.verify_jwt_token(token)
    assert payload is not None
    assert payload["sub"] == "user123"
    assert payload["type"] == "access"


def test_security_manager_jwt_invalid(security_manager):
    """Test invalid JWT token."""
    payload = security_manager.verify_jwt_token("invalid_token")
    assert payload is None


def test_security_manager_rate_limit(security_manager):
    """Test rate limiting."""
    key = "test_key"
    for i in range(5):
        assert security_manager.check_rate_limit(key, max_attempts=5, window_seconds=60)
    assert not security_manager.check_rate_limit(key, max_attempts=5, window_seconds=60)


def test_security_manager_permissions(security_manager):
    """Test permission checking."""
    user_perms = ["read", "write", "execute"]
    assert security_manager.check_permission(user_perms, "read")
    assert not security_manager.check_permission(user_perms, "admin")
    assert security_manager.check_permissions(user_perms, ["read", "write"])
    assert not security_manager.check_permissions(user_perms, ["read", "admin"])


def test_security_manager_sanitize(security_manager):
    """Test input sanitization."""
    dirty = "<script>alert('xss')</script>"
    clean = security_manager.sanitize_input(dirty)
    assert "<script>" not in clean
    assert "&lt;script&gt;" in clean


def test_security_manager_status(security_manager):
    """Test status reporting."""
    status = security_manager.get_status()
    assert status["encryption_enabled"]
    assert status["jwt_enabled"]
