"""
Astra AI - Vector Store (ChromaDB)
Handles embedding generation, vector storage, and semantic search.
"""

import os
from typing import List, Dict, Any, Optional, Union
from pathlib import Path
import uuid
import numpy as np

import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.api.models.Collection import Collection
from sentence_transformers import SentenceTransformer
from loguru import logger

from ..config import settings


class VectorStore:
    """
    ChromaDB-based vector store for semantic memory and search.
    Uses sentence-transformers for local embedding generation.
    """

    _instance: Optional["VectorStore"] = None
    _client: Optional[chromadb.ClientAPI] = None
    _collection: Optional[Collection] = None
    _embedding_model: Optional[SentenceTransformer] = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self.persist_dir = settings.CHROMA_PERSIST_DIR
            self.collection_name = settings.CHROMA_COLLECTION_NAME
            self.embedding_model_name = settings.EMBEDDING_MODEL
            self.dimension = settings.EMBEDDING_DIMENSION
            self._initialized = True

    def initialize(self):
        """Initialize ChromaDB client and embedding model."""
        try:
            # Create persist directory
            os.makedirs(self.persist_dir, exist_ok=True)

            # Initialize ChromaDB client
            self._client = chromadb.PersistentClient(
                path=self.persist_dir,
                settings=ChromaSettings(
                    anonymized_telemetry=False,
                    allow_reset=True,
                ),
            )

            # Get or create collection
            try:
                self._collection = self._client.get_collection(self.collection_name)
                logger.info(f"Loaded existing collection: {self.collection_name}")
            except ValueError:
                self._collection = self._client.create_collection(
                    name=self.collection_name,
                    metadata={"hnsw:space": "cosine", "description": "Astra memory store"},
                )
                logger.info(f"Created new collection: {self.collection_name}")

            # Initialize embedding model
            logger.info(f"Loading embedding model: {self.embedding_model_name}")
            self._embedding_model = SentenceTransformer(
                self.embedding_model_name,
                device="cuda" if settings.GPU_ENABLED else "cpu",
            )
            logger.info(f"Embedding model loaded: {self.embedding_model_name}")

        except Exception as e:
            logger.error(f"Failed to initialize vector store: {e}")
            raise

    def _get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts."""
        if self._embedding_model is None:
            raise RuntimeError("Vector store not initialized. Call initialize() first.")

        embeddings = self._embedding_model.encode(
            texts,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        return embeddings.tolist()

    def add_texts(
        self,
        texts: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None,
        ids: Optional[List[str]] = None,
        batch_size: int = 32,
    ) -> List[str]:
        """
        Add texts to the vector store.

        Args:
            texts: List of text strings to add
            metadatas: Optional list of metadata dicts
            ids: Optional list of IDs (auto-generated if not provided)
            batch_size: Batch size for embedding generation

        Returns:
            List of IDs for the added texts
        """
        if self._collection is None:
            raise RuntimeError("Vector store not initialized.")

        if ids is None:
            ids = [str(uuid.uuid4()) for _ in range(len(texts))]

        if metadatas is None:
            metadatas = [{} for _ in range(len(texts))]

        # Process in batches
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i : i + batch_size]
            batch_metadatas = metadatas[i : i + batch_size]
            batch_ids = ids[i : i + batch_size]

            embeddings = self._get_embeddings(batch_texts)

            self._collection.add(
                embeddings=embeddings,
                documents=batch_texts,
                metadatas=batch_metadatas,
                ids=batch_ids,
            )

        logger.debug(f"Added {len(texts)} texts to vector store")
        return ids

    def search(
        self,
        query: str,
        n_results: int = 10,
        filter: Optional[Dict[str, Any]] = None,
        include_metadata: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Search the vector store for similar texts.

        Args:
            query: Search query string
            n_results: Number of results to return
            filter: Optional metadata filter
            include_metadata: Whether to include metadata in results

        Returns:
            List of result dicts with 'id', 'document', 'metadata', 'distance'
        """
        if self._collection is None:
            raise RuntimeError("Vector store not initialized.")

        query_embedding = self._get_embeddings([query])[0]

        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=min(n_results, 100),
            where=filter,
            include=["documents", "metadatas", "distances"],
        )

        formatted_results = []
        if results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                result = {
                    "id": doc_id,
                    "document": results["documents"][0][i],
                    "distance": results["distances"][0][i],
                    "score": 1.0 - results["distances"][0][i],  # Convert distance to similarity
                }
                if include_metadata:
                    result["metadata"] = results["metadatas"][0][i]
                formatted_results.append(result)

        return formatted_results

    def update(
        self,
        ids: List[str],
        texts: Optional[List[str]] = None,
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ):
        """Update existing documents in the vector store."""
        if self._collection is None:
            raise RuntimeError("Vector store not initialized.")

        if texts:
            embeddings = self._get_embeddings(texts)
            self._collection.update(
                ids=ids,
                embeddings=embeddings,
                documents=texts,
            )

        if metadatas:
            self._collection.update(
                ids=ids,
                metadatas=metadatas,
            )

    def delete(self, ids: List[str]):
        """Delete documents from the vector store."""
        if self._collection is None:
            raise RuntimeError("Vector store not initialized.")

        self._collection.delete(ids=ids)

    def count(self) -> int:
        """Get the total number of documents in the vector store."""
        if self._collection is None:
            raise RuntimeError("Vector store not initialized.")
        return self._collection.count()

    def get_all(self, limit: int = 1000, offset: int = 0) -> List[Dict[str, Any]]:
        """Get all documents with pagination."""
        if self._collection is None:
            raise RuntimeError("Vector store not initialized.")

        results = self._collection.get(
            limit=limit,
            offset=offset,
            include=["documents", "metadatas"],
        )

        formatted = []
        for i in range(len(results["ids"])):
            formatted.append({
                "id": results["ids"][i],
                "document": results["documents"][i] if results["documents"] else None,
                "metadata": results["metadatas"][i] if results["metadatas"] else {},
            })

        return formatted

    def delete_collection(self):
        """Delete the entire collection."""
        if self._client is None:
            raise RuntimeError("Vector store not initialized.")

        try:
            self._client.delete_collection(self.collection_name)
            logger.info(f"Deleted collection: {self.collection_name}")
            self._collection = None
        except Exception as e:
            logger.error(f"Failed to delete collection: {e}")

    def reset(self):
        """Reset the entire vector store."""
        if self._client:
            self._client.reset()
            logger.info("Vector store reset completed")

    def close(self):
        """Clean up resources."""
        self._embedding_model = None
        self._collection = None
        self._client = None
        self._instance = None
        logger.info("Vector store closed")


# Global vector store instance
vector_store = VectorStore()

