"""
Astra AI - Systems Tests
Tests for vision system, voice system, file manager.
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from pathlib import Path

from astra.backend.systems.vision_system import VisionSystem
from astra.backend.systems.voice_system import VoiceSystem
from astra.backend.systems.file_manager import FileManager


@pytest.fixture
def vision_system():
    return VisionSystem()


@pytest.fixture
def voice_system():
    return VoiceSystem()


@pytest.fixture
def file_manager():
    return FileManager()


@pytest.mark.asyncio
async def test_vision_initialization(vision_system):
    """Test vision system initialization."""
    assert not vision_system._initialized
    await vision_system.initialize()
    assert vision_system._initialized


@pytest.mark.asyncio
async def test_vision_image_analysis(vision_system):
    """Test image analysis with a real image file."""
    await vision_system.initialize()
    # Create a small test image
    from PIL import Image
    import io, tempfile, os
    img = Image.new("RGB", (100, 50), color="red")
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        img.save(f.name)
        temp_path = f.name
    try:
        result = await vision_system.analyze_image(temp_path)
        assert result["success"]
        assert result["dimensions"]["width"] == 100
        assert result["dimensions"]["height"] == 50
        assert result["format"] == "PNG"
        assert "colors" in result
        assert "brightness" in result
        assert "sharpness" in result
    finally:
        os.unlink(temp_path)


@pytest.mark.asyncio
async def test_vision_color_analysis(vision_system):
    """Test color analysis helper."""
    from PIL import Image
    img = Image.new("RGB", (10, 10), color=(255, 0, 0))
    colors = vision_system._analyze_colors(img)
    assert "dominant_colors" in colors
    assert "is_grayscale" in colors


@pytest.mark.asyncio
async def test_vision_brightness_analysis(vision_system):
    """Test brightness analysis helper."""
    from PIL import Image
    img = Image.new("RGB", (10, 10), color="white")
    brightness = vision_system._analyze_brightness(img)
    assert brightness["level"] == "bright"


@pytest.mark.asyncio
async def test_vision_format_size(vision_system):
    """Test size formatting helper."""
    assert "B" in vision_system._format_size(100)
    assert "KB" in vision_system._format_size(2048)
    assert "MB" in vision_system._format_size(1048576)


@pytest.mark.asyncio
async def test_vision_color_name(vision_system):
    """Test color name mapping."""
    assert vision_system._color_name(255, 0, 0) == "red"
    assert vision_system._color_name(0, 255, 0) == "green"
    assert vision_system._color_name(0, 0, 0) == "black"
    assert vision_system._color_name(255, 255, 255) == "white"


@pytest.mark.asyncio
async def test_vision_status(vision_system):
    """Test status reporting."""
    await vision_system.initialize()
    status = vision_system.get_status()
    assert status["initialized"]
    assert status["screenshot_available"]


@pytest.mark.asyncio
async def test_voice_initialization(voice_system):
    """Test voice system initialization."""
    assert not voice_system._initialized
    await voice_system.initialize()
    assert voice_system._initialized


@pytest.mark.asyncio
async def test_voice_detect_wake_word(voice_system):
    """Test wake word detection with silence."""
    await voice_system.initialize()
    result = await voice_system.detect_wake_word(b"\x00" * 32000)  # 1 second of silence
    assert not result["detected"]
    assert result["confidence"] == 0.0


@pytest.mark.asyncio
async def test_voice_synthesize(voice_system):
    """Test TTS synthesis."""
    await voice_system.initialize()
    result = await voice_system.synthesize("Hello world")
    assert result["success"]
    assert result["duration"] > 0
    assert result["format"] == "wav"
    # Clean up
    import os
    try:
        os.unlink(result["path"])
    except (PermissionError, OSError):
        pass


@pytest.mark.asyncio
async def test_voice_status(voice_system):
    """Test voice system status."""
    await voice_system.initialize()
    status = voice_system.get_status()
    assert status["initialized"]
    assert status["wake_words"] == ["hey astra", "ok astra", "astra"]


@pytest.mark.asyncio
async def test_file_manager_init(file_manager):
    """Test file manager initialization."""
    assert not file_manager._initialized
    await file_manager.initialize()
    assert file_manager._initialized


@pytest.mark.asyncio
async def test_file_manager_write_read(file_manager):
    """Test writing and reading a text file."""
    await file_manager.initialize()
    import tempfile, os
    with tempfile.NamedTemporaryFile(suffix=".txt", mode="w", delete=False) as f:
        f.write("test content")
        temp_path = f.name
    try:
        result = await file_manager.read_file(temp_path)
        assert result["success"]
        assert result["content"] == "test content"
        assert result["file_type"] == "text"
    finally:
        os.unlink(temp_path)


@pytest.mark.asyncio
async def test_file_manager_file_not_found(file_manager):
    """Test reading non-existent file."""
    await file_manager.initialize()
    result = await file_manager.read_file("/nonexistent/file.txt")
    assert not result["success"]
    assert "error" in result


@pytest.mark.asyncio
async def test_file_manager_list_directory(file_manager):
    """Test listing directory contents."""
    await file_manager.initialize()
    import tempfile, os
    with tempfile.TemporaryDirectory() as tmpdir:
        Path(tmpdir, "test.txt").write_text("hello")
        result = await file_manager.list_directory(tmpdir)
        assert result["success"]
        assert len(result["items"]) == 1
        assert result["items"][0]["name"] == "test.txt"


@pytest.mark.asyncio
async def test_file_manager_search(file_manager):
    """Test file search."""
    await file_manager.initialize()
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        Path(tmpdir, "search_target.txt").write_text("content")
        result = await file_manager.search_files("*.txt", tmpdir)
        assert result["success"]
        assert len(result["matches"]) >= 1


@pytest.mark.asyncio
async def test_file_manager_supported_extensions(file_manager):
    """Test supported extensions mapping."""
    await file_manager.initialize()
    assert ".txt" in file_manager.supported_extensions
    assert ".pdf" in file_manager.supported_extensions
    assert ".py" in file_manager.supported_extensions
    assert ".jpg" in file_manager.supported_extensions
    assert len(file_manager.supported_extensions) >= 20
