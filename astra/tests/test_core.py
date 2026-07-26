"""
Astra AI - Core Engine Tests
Tests for memory engine, conversation engine, reasoning engine, planning engine.
"""

import pytest
import pytest_asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from astra.backend.database.vector_store import VectorStore
from astra.backend.core.memory_engine import MemoryEngine
from astra.backend.core.reasoning_engine import ReasoningEngine
from astra.backend.core.planning_engine import PlanningEngine
from astra.backend.database.models import MemoryType


@pytest.fixture
def vector_store():
    store = MagicMock(spec=VectorStore)
    store.count.return_value = 0
    store.add_texts = MagicMock(return_value=["test-id"])
    store.search = MagicMock(return_value=[])
    return store


@pytest.fixture
def memory_engine(vector_store):
    return MemoryEngine(vector_store)


@pytest.fixture
def reasoning_engine():
    return ReasoningEngine()


@pytest.fixture
def planning_engine():
    return PlanningEngine()


@pytest.mark.asyncio
async def test_memory_store_short_term(memory_engine):
    """Test storing short-term memory."""
    mem_id = await memory_engine.store(
        memory_type=MemoryType.SHORT_TERM,
        key="test_conversation",
        content="Hello, this is a test message",
    )
    assert mem_id is not None
    assert isinstance(mem_id, str)
    assert "test_conversation" in memory_engine.short_term_cache
    assert len(memory_engine.short_term_cache["test_conversation"]) == 1


@pytest.mark.asyncio
async def test_memory_recall_short_term(memory_engine):
    """Test recalling short-term memory."""
    await memory_engine.store(
        memory_type=MemoryType.SHORT_TERM,
        key="test_key",
        content="Important remembered information",
    )
    results = await memory_engine.recall(
        memory_type=MemoryType.SHORT_TERM,
        key="test_key",
    )
    assert len(results) == 1
    assert "Important remembered information" in results[0]["content"]


@pytest.mark.asyncio
async def test_memory_clear_short_term(memory_engine):
    """Test clearing short-term memory."""
    await memory_engine.store(MemoryType.SHORT_TERM, "key1", "content1")
    await memory_engine.store(MemoryType.SHORT_TERM, "key2", "content2")
    memory_engine.clear_short_term("key1")
    assert "key1" not in memory_engine.short_term_cache
    assert "key2" in memory_engine.short_term_cache
    memory_engine.clear_short_term()
    assert len(memory_engine.short_term_cache) == 0


@pytest.mark.asyncio
async def test_memory_get_relevant_context_empty(memory_engine):
    """Test getting context when no memories exist."""
    context = await memory_engine.get_relevant_context("test query")
    assert context == ""


@pytest.mark.asyncio
async def test_reasoning_engine_basic(reasoning_engine):
    """Test basic reasoning."""
    result = await reasoning_engine.reason("What is Python?")
    assert result["query"] == "What is Python?"
    assert len(result["steps"]) > 0
    assert result["confidence"] >= 0.0


@pytest.mark.asyncio
async def test_reasoning_engine_types(reasoning_engine):
    """Test all reasoning types."""
    for rtype in ["auto", "chain_of_thought", "decision_tree", "causal"]:
        result = await reasoning_engine.reason("Test query", reasoning_type=rtype)
        assert result["reasoning_type"] is not None
        assert "steps" in result


@pytest.mark.asyncio
async def test_reasoning_engine_cache(reasoning_engine):
    """Test reasoning cache."""
    result1 = await reasoning_engine.reason("Cached query")
    result2 = await reasoning_engine.reason("Cached query")
    assert result1["thinking"] == result2["thinking"]


@pytest.mark.asyncio
async def test_reasoning_engine_confidence(reasoning_engine):
    """Test that confidence is calculated."""
    result = await reasoning_engine.reason("Analyze the impact of AI on healthcare")
    assert 0.0 <= result["confidence"] <= 1.0


@pytest.mark.asyncio
async def test_reasoning_engine_with_context(reasoning_engine):
    """Test reasoning with context."""
    context = [{"role": "system", "content": "You are a helpful AI assistant."}]
    result = await reasoning_engine.reason("Explain machine learning", context=context)
    assert result.get("context_used") == 1


@pytest.mark.asyncio
async def test_planning_engine_create(planning_engine):
    """Test creating a plan."""
    plan = await planning_engine.create_plan(goal="Build a web application")
    assert plan["goal"] == "Build a web application"
    assert len(plan["tasks"]) > 0
    assert plan["status"] == "created"


@pytest.mark.asyncio
async def test_planning_engine_tasks(planning_engine):
    """Test plan task generation."""
    plan = await planning_engine.create_plan(goal="Write a research paper")
    for task in plan["tasks"]:
        assert "id" in task
        assert "name" in task
        assert "status" in task
        assert task["status"] == "pending"


@pytest.mark.asyncio
async def test_planning_engine_progress(planning_engine):
    """Test plan progress tracking."""
    plan = await planning_engine.create_plan(goal="Test plan")
    progress = planning_engine.get_plan_progress(plan["id"])
    assert progress is not None
    assert progress["total_tasks"] > 0
    assert progress["completed_tasks"] == 0


@pytest.mark.asyncio
async def test_planning_engine_cancel(planning_engine):
    """Test canceling a plan."""
    plan = await planning_engine.create_plan(goal="Cancel test")
    planning_engine.cancel_plan(plan["id"])
    cancelled = planning_engine.get_plan(plan["id"])
    assert cancelled["status"] == "cancelled"


@pytest.mark.asyncio
async def test_planning_engine_list_active(planning_engine):
    """Test listing active plans."""
    await planning_engine.create_plan(goal="Plan A")
    await planning_engine.create_plan(goal="Plan B")
    active = planning_engine.list_active_plans()
    assert len(active) == 2


def test_reasoning_engine_clear_cache(reasoning_engine):
    """Test clearing the reasoning cache."""
    reasoning_engine.reasoning_cache["test"] = {"result": {}, "timestamp": datetime.now(timezone.utc)}
    reasoning_engine.clear_cache()
    assert len(reasoning_engine.reasoning_cache) == 0
