"""
Astra AI - Memory Engine
Implements three-layer memory system with semantic search.
"""

from typing import List, Dict, Any, Optional, AsyncGenerator
from datetime import datetime, timedelta, timezone
import uuid
from loguru import logger

from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..database.models import Memory, MemoryType, Document
from ..database.vector_store import VectorStore
from ..config import settings


class MemoryEngine:
    """
    Three-layer memory system:
    - Short-term: Current conversation context
    - Long-term: User preferences, projects, history
    - Knowledge: Documents, imported files, personal knowledge base
    """

    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        self.short_term_cache: Dict[str, List[Dict[str, Any]]] = {}
        self.max_short_term_items = 50

    async def store(
        self,
        memory_type: MemoryType,
        key: str,
        content: str,
        summary: Optional[str] = None,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        importance: float = 0.5,
        metadata: Optional[Dict[str, Any]] = None,
        ttl: Optional[int] = None,
        db_session: Optional[AsyncSession] = None,
    ) -> str:
        """Store a memory entry."""
        memory_id = str(uuid.uuid4())

        # For short-term memory, cache in-memory
        if memory_type == MemoryType.SHORT_TERM:
            return await self._store_short_term(key, content, metadata)

        # For long-term and knowledge, persist to DB and vector store
        memory = Memory(
            id=memory_id,
            memory_type=memory_type,
            key=key,
            content=content,
            summary=summary,
            category=category,
            tags=tags or [],
            importance=importance,
            metadata=metadata or {},
            expires_at=(
                datetime.now(timezone.utc) + timedelta(seconds=ttl)
                if ttl
                else None
            ),
        )

        if db_session:
            db_session.add(memory)
            await db_session.commit()

            # Add to vector store for semantic search
            await self._index_to_vector_store(
                text=content,
                metadata={
                    "memory_id": memory_id,
                    "memory_type": memory_type.value,
                    "key": key,
                    "category": category,
                    "tags": tags or [],
                    "summary": summary or "",
                },
            )

            logger.debug(f"Stored {memory_type.value} memory: {key}")

        return memory_id

    async def _store_short_term(
        self,
        key: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Store short-term memory in cache."""
        if key not in self.short_term_cache:
            self.short_term_cache[key] = []

        entry = {
            "id": str(uuid.uuid4()),
            "content": content,
            "metadata": metadata or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        self.short_term_cache[key].append(entry)

        # Limit cache size
        if len(self.short_term_cache[key]) > self.max_short_term_items:
            self.short_term_cache[key] = self.short_term_cache[key][
                -self.max_short_term_items:
            ]

        return entry["id"]

    async def _index_to_vector_store(
        self, text: str, metadata: Dict[str, Any]
    ):
        """Index memory content to vector store."""
        try:
            self.vector_store.add_texts(
                texts=[text],
                metadatas=[metadata],
            )
        except Exception as e:
            logger.warning(f"Failed to index memory to vector store: {e}")

    async def recall(
        self,
        memory_type: Optional[MemoryType] = None,
        key: Optional[str] = None,
        query: Optional[str] = None,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        limit: int = 20,
        db_session: Optional[AsyncSession] = None,
    ) -> List[Dict[str, Any]]:
        """Recall memories with filtering and semantic search."""
        results = []

        # Search short-term memory
        if memory_type is None or memory_type == MemoryType.SHORT_TERM:
            if key and key in self.short_term_cache:
                results.extend(self.short_term_cache[key])
            elif query:
                # Simple text search in short-term cache
                for cache_key, entries in self.short_term_cache.items():
                    for entry in entries:
                        if query.lower() in entry["content"].lower():
                            results.append(entry)

        # Search long-term and knowledge memories via vector store
        if memory_type in [None, MemoryType.LONG_TERM, MemoryType.KNOWLEDGE]:
            if query:
                vector_results = self.vector_store.search(
                    query=query,
                    n_results=limit,
                    filter={"category": category} if category else None,
                )
                for vr in vector_results:
                    if "memory_id" in vr.get("metadata", {}):
                        results.append(
                            {
                                "id": vr["metadata"]["memory_id"],
                                "content": vr["document"],
                                "metadata": vr["metadata"],
                                "score": vr.get("score", 0),
                                "source": "vector",
                            }
                        )

            if db_session and (key or category):
                stmt = select(Memory).where(Memory.memory_type == (memory_type or MemoryType.LONG_TERM))
                if key:
                    stmt = stmt.where(Memory.key == key)
                if category:
                    stmt = stmt.where(Memory.category == category)
                if tags:
                    for tag in tags:
                        stmt = stmt.where(Memory.tags.contains(tag))

                stmt = stmt.order_by(Memory.importance.desc()).limit(limit)
                result = await db_session.execute(stmt)
                memories = result.scalars().all()

                for mem in memories:
                    results.append(
                        {
                            "id": mem.id,
                            "memory_type": mem.memory_type.value,
                            "key": mem.key,
                            "content": mem.content,
                            "summary": mem.summary,
                            "category": mem.category,
                            "tags": mem.tags,
                            "importance": mem.importance,
                            "metadata": mem.metadata,
                            "created_at": mem.created_at.isoformat(),
                            "source": "database",
                        }
                    )

        # Sort by importance/score
        results.sort(key=lambda x: x.get("score", x.get("importance", 0)), reverse=True)

        # Update access count
        if db_session and results:
            for r in results:
                if "id" in r and r.get("source") == "database":
                    stmt = (
                        update(Memory)
                        .where(Memory.id == r["id"])
                        .values(access_count=Memory.access_count + 1)
                    )
                    await db_session.execute(stmt)
            await db_session.commit()

        return results[:limit]

    async def forget(
        self,
        memory_id: str,
        db_session: Optional[AsyncSession] = None,
    ):
        """Delete a specific memory."""
        # Remove from vector store
        try:
            self.vector_store.delete([memory_id])
        except Exception:
            pass

        # Remove from database
        if db_session:
            stmt = delete(Memory).where(Memory.id == memory_id)
            await db_session.execute(stmt)
            await db_session.commit()

        # Remove from short-term cache
        for key in list(self.short_term_cache.keys()):
            self.short_term_cache[key] = [
                e for e in self.short_term_cache[key] if e.get("id") != memory_id
            ]
            if not self.short_term_cache[key]:
                del self.short_term_cache[key]

        logger.debug(f"Forgot memory: {memory_id}")

    async def get_relevant_context(
        self,
        query: str,
        limit: int = 15,
        db_session: Optional[AsyncSession] = None,
    ) -> str:
        """Get relevant context from all memory layers for a query."""
        results = await self.recall(
            query=query,
            limit=limit,
            db_session=db_session,
        )

        if not results:
            return ""

        context_parts = []
        for r in results:
            content = r.get("content", "")
            source = r.get("source", "unknown")
            mem_type = r.get("memory_type", "")
            score = r.get("score", r.get("importance", 0))

            if score > 0.3:
                context_parts.append(
                    f"[{mem_type.upper() if mem_type else 'MEMORY'} - {source}]: {content}"
                )

        return "\n\n".join(context_parts)

    async def consolidate_short_term(self, key: str, db_session: AsyncSession):
        """Consolidate short-term memories into long-term storage."""
        if key not in self.short_term_cache:
            return

        entries = self.short_term_cache[key]
        if not entries:
            return

        # Combine short-term entries into a summary
        combined_content = "\n".join(
            e["content"] for e in entries
        )

        await self.store(
            memory_type=MemoryType.LONG_TERM,
            key=f"consolidated_{key}_{uuid.uuid4().hex[:8]}",
            content=combined_content,
            category="conversation_history",
            importance=0.6,
            db_session=db_session,
        )

        # Clear short-term cache
        del self.short_term_cache[key]
        logger.debug(f"Consolidated short-term memory: {key}")

    def get_conversation_context(self, conversation_id: str) -> List[Dict[str, Any]]:
        """Get short-term context for a conversation."""
        return self.short_term_cache.get(conversation_id, [])

    def clear_short_term(self, key: Optional[str] = None):
        """Clear short-term memory cache."""
        if key:
            self.short_term_cache.pop(key, None)
        else:
            self.short_term_cache.clear()

    async def prune_expired(self, db_session: AsyncSession):
        """Remove expired memories."""
        now = datetime.now(timezone.utc)
        stmt = delete(Memory).where(
            Memory.expires_at < now,
            Memory.expires_at.isnot(None),
        )
        result = await db_session.execute(stmt)
        await db_session.commit()
        logger.debug(f"Pruned {result.rowcount} expired memories")

