"""
Astra AI - Model Manager
Manages local (Ollama) and cloud AI model connections.
"""

from typing import List, Dict, Any, Optional, AsyncGenerator, AsyncIterator
import json
import httpx
import asyncio
from loguru import logger

from ..config import settings


class ModelManager:
    """
    Manages AI model connections:
    - Local models via Ollama
    - Cloud models via OpenAI-compatible APIs
    - Model selection based on task
    - Load balancing and fallback
    """

    def __init__(self):
        self.models: Dict[str, Dict[str, Any]] = {}
        self.ollama_client: Optional[httpx.AsyncClient] = None
        self.cloud_client: Optional[httpx.AsyncClient] = None
        self._initialized = False
        self._has_gpu = False
        self._gpu_device = "cpu"

    async def initialize(self):
        """Initialize model connections."""
        logger.info("Initializing Model Manager...")

        # Initialize Ollama client
        self.ollama_client = httpx.AsyncClient(
            base_url=settings.OLLAMA_HOST,
            timeout=httpx.Timeout(settings.OLLAMA_TIMEOUT, connect=10.0),
        )

        # Initialize cloud client if configured
        if settings.OPENAI_API_KEY:
            self.cloud_client = httpx.AsyncClient(
                base_url=settings.OPENAI_BASE_URL or "https://api.openai.com/v1",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                timeout=httpx.Timeout(60.0, connect=10.0),
            )

        # Detect GPU availability
        self._detect_gpu()

        # Discover available models
        await self._discover_models()

        self._initialized = True
        logger.info(f"Model Manager initialized. Available models: {list(self.models.keys())}")

    def _detect_gpu(self):
        """Detect GPU availability using multiple methods."""
        # Check CUDA via torch if available
        try:
            import torch
            if torch.cuda.is_available():
                self._has_gpu = True
                self._gpu_device = f"cuda:{settings.CUDA_DEVICE}"
                logger.info(f"GPU detected: {torch.cuda.get_device_name(0)}")
                return
        except ImportError:
            pass

        # Check for DirectML / other backends
        try:
            import platform
            if platform.system() == "Windows":
                # Check for DirectX 12 support
                import subprocess
                result = subprocess.run(
                    ["dxdiag", "/t", "dxdiag.txt"],
                    capture_output=True, timeout=5,
                )
                if result.returncode == 0:
                    logger.info("DirectX 12 available for GPU acceleration")
        except Exception:
            pass

        logger.info("No GPU detected, using CPU")

    async def _discover_models(self):
        """Discover available models from Ollama and cloud."""
        # Check Ollama availability
        try:
            response = await self.ollama_client.get("/api/tags")
            if response.status_code == 200:
                data = response.json()
                ollama_models = data.get("models", [])
                for model in ollama_models:
                    name = model.get("name", "")
                    self.models[name] = {
                        "provider": "ollama",
                        "name": name,
                        "size": model.get("size", 0),
                        "modified_at": model.get("modified_at", ""),
                        "details": model.get("details", {}),
                        "available": True,
                    }
                logger.info(f"Found {len(ollama_models)} Ollama models")
            else:
                logger.warning(f"Ollama returned status {response.status_code}")
        except httpx.ConnectError:
            logger.warning(f"Ollama not available at {settings.OLLAMA_HOST}")
        except Exception as e:
            logger.warning(f"Failed to discover Ollama models: {e}")

        # If no models found, add default configured models
        if not self.models:
            self.models[settings.DEFAULT_LOCAL_MODEL] = {
                "provider": "ollama",
                "name": settings.DEFAULT_LOCAL_MODEL,
                "available": False,
                "size": 0,
            }
            self.models[settings.FALLBACK_MODEL] = {
                "provider": "ollama",
                "name": settings.FALLBACK_MODEL,
                "available": False,
                "size": 0,
            }

        # Add cloud models if configured
        if settings.OPENAI_API_KEY:
            openai_models = ["gpt-4o", "gpt-4o-mini", settings.OPENAI_MODEL]
            for m in set(openai_models):
                self.models[m] = {
                    "provider": "openai",
                    "name": m,
                    "available": True,
                }

        if settings.ANTHROPIC_API_KEY:
            anthropic_models = ["claude-3-opus-20240229", "claude-3-sonnet-20240229",
                                "claude-3-haiku-20240307", settings.ANTHROPIC_MODEL]
            for m in set(anthropic_models):
                self.models[m] = {
                    "provider": "anthropic",
                    "name": m,
                    "available": True,
                }

    async def complete(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """
        Generate a complete (non-streaming) response.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model name to use (defaults to configured model)
            system_prompt: Optional system prompt override
            temperature: Generation temperature
            max_tokens: Maximum tokens to generate
            tools: Optional tool definitions for function calling

        Returns:
            Generated response text
        """
        model = model or settings.DEFAULT_LOCAL_MODEL
        provider = self._get_provider(model)

        if provider == "ollama":
            return await self._ollama_complete(messages, model, system_prompt,
                                                temperature, max_tokens, tools)
        elif provider == "openai":
            return await self._openai_complete(messages, model, system_prompt,
                                                temperature, max_tokens, tools)
        elif provider == "anthropic":
            return await self._anthropic_complete(messages, model, system_prompt,
                                                   temperature, max_tokens, tools)
        else:
            logger.error(f"Unknown provider for model {model}")
            return ""

    async def stream_complete(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream a response token by token.

        Args:
            messages: List of message dicts
            model: Model name to use
            system_prompt: Optional system prompt
            temperature: Generation temperature
            max_tokens: Maximum tokens to generate
            tools: Optional tool definitions

        Yields:
            Response text chunks
        """
        model = model or settings.DEFAULT_LOCAL_MODEL
        provider = self._get_provider(model)

        if provider == "ollama":
            async for chunk in self._ollama_stream(messages, model, system_prompt,
                                                    temperature, max_tokens, tools):
                yield chunk
        elif provider == "openai":
            async for chunk in self._openai_stream(messages, model, system_prompt,
                                                    temperature, max_tokens, tools):
                yield chunk
        elif provider == "anthropic":
            async for chunk in self._anthropic_stream(messages, model, system_prompt,
                                                       temperature, max_tokens, tools):
                yield chunk
        else:
            logger.error(f"Unknown provider for model {model}")
            yield ""

    # ============================================================
    # Ollama Integration
    # ============================================================

    async def _ollama_complete(
        self, messages: List[Dict[str, str]], model: str,
        system_prompt: Optional[str], temperature: float,
        max_tokens: Optional[int], tools: Optional[List[Dict[str, Any]]],
    ) -> str:
        """Generate completion via Ollama."""
        payload = self._build_ollama_payload(model, messages, system_prompt,
                                              temperature, max_tokens, tools, stream=False)
        try:
            response = await self.ollama_client.post("/api/chat", json=payload)
            if response.status_code == 200:
                result = response.json()
                return result.get("message", {}).get("content", "")
            else:
                logger.error(f"Ollama error {response.status_code}: {response.text[:200]}")
                return ""
        except Exception as e:
            logger.error(f"Ollama completion failed: {e}")
            return await self._fallback_complete(messages, system_prompt, temperature, max_tokens, tools)

    async def _ollama_stream(
        self, messages: List[Dict[str, str]], model: str,
        system_prompt: Optional[str], temperature: float,
        max_tokens: Optional[int], tools: Optional[List[Dict[str, Any]]],
    ) -> AsyncGenerator[str, None]:
        """Stream completion via Ollama."""
        payload = self._build_ollama_payload(model, messages, system_prompt,
                                              temperature, max_tokens, tools, stream=True)
        try:
            async with self.ollama_client.stream("POST", "/api/chat", json=payload) as response:
                if response.status_code != 200:
                    logger.error(f"Ollama stream error {response.status_code}")
                    yield ""
                    return

                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            if "message" in data and "content" in data["message"]:
                                yield data["message"]["content"]
                            if data.get("done", False):
                                break
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(f"Ollama streaming failed: {e}")
            async for chunk in self._fallback_stream(messages, system_prompt, temperature, max_tokens, tools):
                yield chunk

    def _build_ollama_payload(
        self, model: str, messages: List[Dict[str, str]],
        system_prompt: Optional[str], temperature: float,
        max_tokens: Optional[int], tools: Optional[List[Dict[str, Any]]],
        stream: bool = False,
    ) -> Dict[str, Any]:
        """Build the Ollama API request payload."""
        payload = {
            "model": model,
            "messages": messages,
            "stream": stream,
            "options": {
                "temperature": temperature,
                "top_p": settings.TOP_P,
            },
        }

        if system_prompt:
            payload["system"] = system_prompt

        if max_tokens:
            payload["options"]["num_predict"] = max_tokens

        if tools:
            payload["tools"] = tools

        return payload

    # ============================================================
    # OpenAI Integration
    # ============================================================

    async def _openai_complete(
        self, messages: List[Dict[str, str]], model: str,
        system_prompt: Optional[str], temperature: float,
        max_tokens: Optional[int], tools: Optional[List[Dict[str, Any]]],
    ) -> str:
        """Generate completion via OpenAI API."""
        if not self.cloud_client:
            return ""

        payload = self._build_openai_payload(model, messages, system_prompt,
                                              temperature, max_tokens, tools, stream=False)
        try:
            response = await self.cloud_client.post("/chat/completions", json=payload)
            if response.status_code == 200:
                result = response.json()
                return result.get("choices", [{}])[0].get("message", {}).get("content", "")
            else:
                logger.error(f"OpenAI error {response.status_code}: {response.text[:200]}")
                return ""
        except Exception as e:
            logger.error(f"OpenAI completion failed: {e}")
            return ""

    async def _openai_stream(
        self, messages: List[Dict[str, str]], model: str,
        system_prompt: Optional[str], temperature: float,
        max_tokens: Optional[int], tools: Optional[List[Dict[str, Any]]],
    ) -> AsyncGenerator[str, None]:
        """Stream completion via OpenAI API."""
        if not self.cloud_client:
            yield ""
            return

        payload = self._build_openai_payload(model, messages, system_prompt,
                                              temperature, max_tokens, tools, stream=True)
        try:
            async with self.cloud_client.stream("POST", "/chat/completions", json=payload) as response:
                if response.status_code != 200:
                    yield ""
                    return

                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data.get("choices", [{}])[0].get("delta", {})
                            if "content" in delta:
                                yield delta["content"]
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(f"OpenAI streaming failed: {e}")

    def _build_openai_payload(
        self, model: str, messages: List[Dict[str, str]],
        system_prompt: Optional[str], temperature: float,
        max_tokens: Optional[int], tools: Optional[List[Dict[str, Any]]],
        stream: bool = False,
    ) -> Dict[str, Any]:
        """Build the OpenAI-compatible API request payload."""
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "top_p": settings.TOP_P,
            "stream": stream,
        }

        if max_tokens:
            payload["max_tokens"] = max_tokens

        if tools:
            payload["tools"] = tools

        return payload

    # ============================================================
    # Anthropic Integration
    # ============================================================

    async def _anthropic_complete(
        self, messages: List[Dict[str, str]], model: str,
        system_prompt: Optional[str], temperature: float,
        max_tokens: Optional[int], tools: Optional[List[Dict[str, Any]]],
    ) -> str:
        """Generate completion via Anthropic API."""
        if not settings.ANTHROPIC_API_KEY:
            return ""

        client = httpx.AsyncClient(
            base_url="https://api.anthropic.com/v1",
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            timeout=httpx.Timeout(60.0),
        )

        payload = {
            "model": model,
            "messages": [m for m in messages if m.get("role") != "system"],
            "max_tokens": max_tokens or settings.MAX_TOKENS,
            "temperature": temperature,
        }

        if system_prompt:
            payload["system"] = system_prompt

        try:
            response = await client.post("/messages", json=payload)
            if response.status_code == 200:
                result = response.json()
                return result.get("content", [{}])[0].get("text", "")
            else:
                logger.error(f"Anthropic error {response.status_code}: {response.text[:200]}")
                return ""
        except Exception as e:
            logger.error(f"Anthropic completion failed: {e}")
            return ""
        finally:
            await client.aclose()

    async def _anthropic_stream(
        self, messages: List[Dict[str, str]], model: str,
        system_prompt: Optional[str], temperature: float,
        max_tokens: Optional[int], tools: Optional[List[Dict[str, Any]]],
    ) -> AsyncGenerator[str, None]:
        """Stream completion via Anthropic API."""
        if not settings.ANTHROPIC_API_KEY:
            yield ""
            return

        client = httpx.AsyncClient(
            base_url="https://api.anthropic.com/v1",
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            timeout=httpx.Timeout(120.0),
        )

        payload = {
            "model": model,
            "messages": [m for m in messages if m.get("role") != "system"],
            "max_tokens": max_tokens or settings.MAX_TOKENS,
            "temperature": temperature,
            "stream": True,
        }

        if system_prompt:
            payload["system"] = system_prompt

        try:
            async with client.stream("POST", "/messages", json=payload) as response:
                if response.status_code != 200:
                    yield ""
                    return

                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if data.get("type") == "content_block_delta":
                                delta = data.get("delta", {})
                                if "text" in delta:
                                    yield delta["text"]
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(f"Anthropic streaming failed: {e}")
            yield ""
        finally:
            await client.aclose()

    # ============================================================
    # Fallback Support
    # ============================================================

    async def _fallback_complete(
        self, messages: List[Dict[str, str]],
        system_prompt: Optional[str], temperature: float,
        max_tokens: Optional[int], tools: Optional[List[Dict[str, Any]]],
    ) -> str:
        """Try fallback model if primary fails."""
        if settings.FALLBACK_MODEL and settings.FALLBACK_MODEL != settings.DEFAULT_LOCAL_MODEL:
            logger.info(f"Attempting fallback to {settings.FALLBACK_MODEL}")
            return await self.complete(
                messages=messages, model=settings.FALLBACK_MODEL,
                system_prompt=system_prompt, temperature=temperature,
                max_tokens=max_tokens, tools=tools,
            )
        return ""

    async def _fallback_stream(
        self, messages: List[Dict[str, str]],
        system_prompt: Optional[str], temperature: float,
        max_tokens: Optional[int], tools: Optional[List[Dict[str, Any]]],
    ) -> AsyncGenerator[str, None]:
        """Try fallback model stream if primary fails."""
        if settings.FALLBACK_MODEL and settings.FALLBACK_MODEL != settings.DEFAULT_LOCAL_MODEL:
            logger.info(f"Attempting fallback stream to {settings.FALLBACK_MODEL}")
            async for chunk in self.stream_complete(
                messages=messages, model=settings.FALLBACK_MODEL,
                system_prompt=system_prompt, temperature=temperature,
                max_tokens=max_tokens, tools=tools,
            ):
                yield chunk
        else:
            yield ""

    # ============================================================
    # Model Management
    # ============================================================

    async def list_available_models(self) -> List[Dict[str, Any]]:
        """List all available models with metadata."""
        # Refresh model list
        await self._discover_models()

        models_list = []
        for name, info in self.models.items():
            models_list.append({
                "name": name,
                "provider": info.get("provider", "unknown"),
                "available": info.get("available", False),
                "size": info.get("size", 0),
                "details": info.get("details", {}),
            })

        return sorted(models_list, key=lambda m: (not m["available"], m["name"]))

    async def get_model_info(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific model."""
        # Check cache
        if model_name in self.models:
            return self.models[model_name]

        # Try to pull model info from Ollama
        try:
            response = await self.ollama_client.post("/api/show", json={"name": model_name})
            if response.status_code == 200:
                info = response.json()
                self.models[model_name] = {
                    "provider": "ollama",
                    "name": model_name,
                    "available": True,
                    "size": info.get("size", 0),
                    "details": info.get("details", {}),
                    "modelfile": info.get("modelfile", ""),
                    "parameters": info.get("parameters", ""),
                }
                return self.models[model_name]
        except Exception:
            pass

        return None

    async def pull_model(self, model_name: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Download a model from Ollama."""
        logger.info(f"Pulling model: {model_name}")

        try:
            async with self.ollama_client.stream(
                "POST", "/api/pull",
                json={"name": model_name, "stream": True},
            ) as response:
                if response.status_code != 200:
                    yield {"status": "error", "error": f"HTTP {response.status_code}"}
                    return

                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            yield data
                            if data.get("status") == "success":
                                self.models[model_name] = {
                                    "provider": "ollama",
                                    "name": model_name,
                                    "available": True,
                                    "size": data.get("total", 0),
                                }
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(f"Failed to pull model {model_name}: {e}")
            yield {"status": "error", "error": str(e)}

    async def remove_model(self, model_name: str) -> bool:
        """Remove a downloaded model."""
        logger.info(f"Removing model: {model_name}")

        try:
            response = await self.ollama_client.delete("/api/delete", json={"name": model_name})
            if response.status_code in (200, 204):
                self.models.pop(model_name, None)
                logger.info(f"Removed model: {model_name}")
                return True
            else:
                logger.error(f"Failed to remove model {model_name}: {response.text}")
                return False
        except Exception as e:
            logger.error(f"Failed to remove model {model_name}: {e}")
            return False

    async def generate_embeddings(self, text: str, model: Optional[str] = None) -> List[float]:
        """Generate embeddings using Ollama."""
        model = model or settings.DEFAULT_LOCAL_MODEL

        try:
            response = await self.ollama_client.post(
                "/api/embeddings",
                json={"model": model, "prompt": text},
            )
            if response.status_code == 200:
                return response.json().get("embedding", [])
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")

        return []

    # ============================================================
    # Utilities
    # ============================================================

    def _get_provider(self, model_name: str) -> str:
        """Determine the provider for a given model name."""
        if model_name in self.models:
            return self.models[model_name].get("provider", "ollama")

        # Heuristic detection
        if model_name.startswith("gpt-") or model_name.startswith("o"):
            return "openai"
        elif model_name.startswith("claude-"):
            return "anthropic"
        else:
            return "ollama"

    def select_best_model(self, task_type: str = "general") -> str:
        """
        Select the best available model for a given task type.
        Task types: general, code, creative, fast, vision, embedding
        """
        available_ollama = [
            name for name, info in self.models.items()
            if info.get("provider") == "ollama" and info.get("available", False)
        ]

        if not available_ollama:
            return settings.DEFAULT_LOCAL_MODEL

        # Task-specific model selection
        task_model_map = {
            "code": ["codellama", "deepseek-coder", "qwen2.5-coder", "qwen2.5"],
            "creative": ["llama3.2", "llama3.1", "mistral", "qwen2.5"],
            "fast": ["qwen2.5:3b", "llama3.2:3b", "phi", "tinyllama"],
            "vision": ["qwen2.5-vl", "llava", "bakllava"],
            "embedding": ["nomic-embed-text", "all-minilm", "mxbai-embed-large"],
        }

        preferred = task_model_map.get(task_type, [])
        for p in preferred:
            matches = [m for m in available_ollama if p in m.lower()]
            if matches:
                return matches[0]

        return available_ollama[0]


    async def health_check(self, model_name: Optional[str] = None) -> Dict[str, Any]:
        """Run a health check on a specific model or all models."""
        models_to_check = [model_name] if model_name else list(self.models.keys())
        results = {}
        for name in models_to_check:
            provider = self._get_provider(name)
            result = {'provider': provider, 'status': 'unknown', 'latency_ms': 0, 'error': None}
            try:
                import time
                start = time.time()
                if provider == 'ollama':
                    resp = await self.ollama_client.post('/api/generate', json={
                        'model': name, 'prompt': 'Hi', 'stream': False, 'options': {'num_predict': 1}
                    })
                    if resp.status_code == 200:
                        result['status'] = 'healthy'
                        result['latency_ms'] = int((time.time() - start) * 1000)
                        data = resp.json()
                        result['eval_count'] = data.get('eval_count', 0)
                        result['eval_duration'] = data.get('eval_duration', 0)
                    else:
                        result['status'] = 'unhealthy'
                        result['error'] = f'HTTP {resp.status_code}'
                elif provider == 'openai':
                    resp = await self.cloud_client.get('/models')
                    if resp.status_code == 200:
                        result['status'] = 'healthy'
                        result['latency_ms'] = int((time.time() - start) * 1000)
                    else:
                        result['status'] = 'unhealthy'
                        result['error'] = f'HTTP {resp.status_code}'
                else:
                    result['status'] = 'unknown'
                    result['error'] = f'No health check for provider: {provider}'
            except Exception as e:
                result['status'] = 'unhealthy'
                result['error'] = str(e)[:200]
            results[name] = result
        return results


    def get_status(self) -> Dict[str, Any]:
        """Get model manager status."""
        return {
            "initialized": self._initialized,
            "total_models": len(self.models),
            "available_models": sum(1 for m in self.models.values() if m.get("available")),
            "default_model": settings.DEFAULT_LOCAL_MODEL,
            "fallback_model": settings.FALLBACK_MODEL,
            "provider": settings.LOCAL_MODEL_PROVIDER,
            "gpu_available": self._has_gpu,
            "gpu_device": self._gpu_device,
            "ollama_connected": self.ollama_client is not None,
            "cloud_connected": self.cloud_client is not None,
        }

    async def close(self):
        """Clean up model manager resources."""
        if self.ollama_client:
            await self.ollama_client.aclose()
        if self.cloud_client:
            await self.cloud_client.aclose()
        logger.info("Model Manager closed")

