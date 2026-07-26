"""
Astra AI - Voice System
Speech-to-text via Whisper, text-to-speech via Piper, wake word detection.
"""

from typing import List, Dict, Any, Optional, AsyncGenerator, Callable
import io
import os
import tempfile
import wave
import struct
import asyncio
import numpy as np
from pathlib import Path
from datetime import datetime, timezone
from loguru import logger

from ..config import settings


class VoiceSystem:
    """
    Voice system supporting:
    - Speech-to-text via OpenAI Whisper (local model)
    - Text-to-speech via Piper TTS
    - Wake word detection
    - Continuous conversation mode
    - Voice activity detection (VAD)
    - Microphone selection
    - Audio recording and playback
    """

    def __init__(self):
        self._whisper_model = None
        self._whisper_loaded = False
        self._piper_process = None
        self._initialized = False
        self.is_listening = False
        self.is_speaking = False
        self._sample_rate = 16000
        self._channels = 1

    async def initialize(self):
        """Initialize voice components - load Whisper model."""
        logger.info("Initializing Voice System...")

        # Try to load Whisper model
        try:
            import whisper
            logger.info(f"Loading Whisper model: {settings.WHISPER_MODEL}")
            self._whisper_model = whisper.load_model(settings.WHISPER_MODEL)
            self._whisper_loaded = True
            logger.info(f"Whisper model loaded: {settings.WHISPER_MODEL}")
        except ImportError:
            logger.warning("Whisper not installed. Install with: pip install openai-whisper")
        except Exception as e:
            logger.warning(f"Failed to load Whisper model: {e}")

        # Check for audio playback/recording capabilities
        try:
            import sounddevice as sd
            devices = sd.query_devices()
            self._input_device = next((d for d in devices if d["max_input_channels"] > 0), None)
            self._output_device = next((d for d in devices if d["max_output_channels"] > 0), None)
            if self._input_device:
                logger.info(f"Microphone: {self._input_device['name']}")
            if self._output_device:
                logger.info(f"Speaker: {self._output_device['name']}")
        except ImportError:
            logger.debug("sounddevice not installed")
        except Exception as e:
            logger.debug(f"Audio device detection: {e}")

        self._initialized = True
        logger.info("Voice System initialized")

    async def transcribe(self, audio_path: str, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Transcribe audio file to text using Whisper.

        Args:
            audio_path: Path to the audio file (WAV, MP3, etc.)
            language: Optional language code (e.g., 'en', 'fr')

        Returns:
            Dict with transcription text, segments, and metadata
        """
        if not self._whisper_loaded or not self._whisper_model:
            return {"success": False, "error": "Whisper model not loaded", "text": ""}

        try:
            result = self._whisper_model.transcribe(
                audio_path,
                language=language or settings.WHISPER_LANGUAGE,
                task="transcribe",
                verbose=False,
            )

            segments = []
            for seg in result.get("segments", []):
                segments.append({
                    "start": seg.get("start", 0),
                    "end": seg.get("end", 0),
                    "text": seg.get("text", "").strip(),
                    "confidence": seg.get("confidence", 0),
                })

            audio_duration = segments[-1]["end"] if segments else 0
            text = result.get("text", "").strip()

            logger.debug(f"Transcribed {Path(audio_path).name}: {len(text)} chars, {len(segments)} segments")
            return {
                "success": True,
                "text": text,
                "language": result.get("language", language or "en"),
                "segments": segments,
                "duration": audio_duration,
                "word_count": len(text.split()),
                "model": settings.WHISPER_MODEL,
            }

        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return {"success": False, "error": str(e), "text": ""}

    async def transcribe_bytes(self, audio_data: bytes, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Transcribe audio from raw bytes (WAV format expected).

        Args:
            audio_data: Raw WAV audio bytes
            language: Optional language code

        Returns:
            Dict with transcription result
        """
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                f.write(audio_data)
                temp_path = f.name

            result = await self.transcribe(temp_path, language=language)

            try:
                os.unlink(temp_path)
            except PermissionError:
                pass

            return result
        except Exception as e:
            return {"success": False, "error": str(e), "text": ""}

    async def transcribe_microphone(self, duration: int = 5, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Record audio from microphone and transcribe.

        Args:
            duration: Recording duration in seconds
            language: Optional language code

        Returns:
            Dict with transcription result
        """
        try:
            import sounddevice as sd
            logger.info(f"Recording for {duration} seconds...")
            audio = sd.rec(
                int(duration * self._sample_rate),
                samplerate=self._sample_rate,
                channels=self._channels,
                dtype=np.float32,
            )
            sd.wait()

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                temp_path = f.name
                self._save_wav(temp_path, audio, self._sample_rate)

            result = await self.transcribe(temp_path, language=language)

            try:
                os.unlink(temp_path)
            except PermissionError:
                pass

            return result

        except ImportError:
            return {"success": False, "error": "sounddevice not installed for microphone recording", "text": ""}
        except Exception as e:
            return {"success": False, "error": str(e), "text": ""}

    async def synthesize(self, text: str, output_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Synthesize text to speech using Piper TTS.

        Args:
            text: Text to synthesize
            output_path: Optional path to save WAV file (auto-generated if None)

        Returns:
            Dict with audio metadata and path
        """
        if not output_path:
            output_path = str(settings.TEMP_DIR / f"tts_{hash(text)}.wav")

        try:
            import subprocess as sp
            piper_bin = "piper" if os.name != "nt" else "piper.exe"

            try:
                sp.run([piper_bin, "--help"], capture_output=True, timeout=5)
                piper_available = True
            except (FileNotFoundError, sp.TimeoutExpired):
                piper_available = False

            if piper_available:
                voice_path = Path(settings.MODELS_DIR) / "piper" / f"{settings.PIPER_VOICE}.tflite"
                if voice_path.exists():
                    process = sp.Popen(
                        [piper_bin, "--model", str(voice_path), "--output_file", output_path],
                        stdin=sp.PIPE, stdout=sp.DEVNULL, stderr=sp.DEVNULL,
                    )
                    process.stdin.write(text.encode())
                    process.stdin.close()
                    process.wait(timeout=30)
                    logger.info(f"Piper TTS generated: {output_path}")
                else:
                    logger.warning(f"Piper voice model not found, using fallback")
                    output_path = self._synthesize_fallback(text, output_path)
            else:
                output_path = self._synthesize_fallback(text, output_path)

            import wave as wav_mod
            with wav_mod.open(output_path, "r") as wf:
                frames = wf.getnframes()
                rate = wf.getframerate()
                duration = frames / rate if rate > 0 else 0

            return {
                "success": True,
                "path": output_path,
                "duration": round(duration, 2),
                "format": "wav",
                "sample_rate": rate,
                "text_length": len(text),
                "engine": "piper" if piper_available else "fallback",
            }

        except Exception as e:
            logger.error(f"Synthesis failed: {e}")
            return {"success": False, "error": str(e)}

    def _synthesize_fallback(self, text: str, output_path: str) -> str:
        """Fallback TTS: generate a simple sine-wave based speech simulation."""
        import wave as wav_mod
        import math

        sample_rate = 22050
        duration = max(0.5, len(text) * 0.05)
        n_samples = int(sample_rate * duration)

        with wav_mod.open(output_path, "w") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)

            for i in range(n_samples):
                t = i / sample_rate
                freq = 200 + 50 * math.sin(2 * math.pi * 3 * t)
                amplitude = 0.3 * max(0, math.sin(2 * math.pi * t / duration))
                sample = int(amplitude * 32767 * math.sin(2 * math.pi * freq * t))
                wf.writeframes(struct.pack("<h", sample))

        logger.debug(f"Fallback TTS generated: {output_path}")
        return output_path

    def _save_wav(self, path: str, audio_data: np.ndarray, sample_rate: int):
        """Save numpy audio array to WAV file."""
        import wave as wav_mod
        with wav_mod.open(path, "w") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            scaled = np.int16(audio_data * 32767)
            wf.writeframes(scaled.tobytes())

    async def detect_wake_word(self, audio_data: bytes) -> Dict[str, Any]:
        """Detect wake word in audio stream using energy-based VAD."""
        try:
            audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
            energy = np.sqrt(np.mean(audio_array ** 2))
            if energy < 0.02:
                return {"detected": False, "confidence": 0.0, "wake_word": None}

            zcr = np.mean(np.abs(np.diff(np.sign(audio_array))))
            is_speech = zcr > 0.1 and energy > 0.05

            if is_speech and energy > 0.1:
                return {
                    "detected": True,
                    "confidence": min(energy * 3, 0.95),
                    "wake_word": settings.WAKE_WORDS[0] if settings.WAKE_WORDS else None,
                    "energy": float(energy),
                    "engine": "energy_vad",
                }

            return {"detected": False, "confidence": 0.0, "wake_word": None}

        except Exception as e:
            logger.debug(f"Wake word detection error: {e}")
            return {"detected": False, "confidence": 0.0, "wake_word": None}

    async def listen_for_wake_word(self, timeout: int = 30) -> Optional[Dict[str, Any]]:
        """Continuously listen for wake word from microphone."""
        try:
            import sounddevice as sd
            chunk_duration = 1
            chunks = timeout // chunk_duration

            for _ in range(chunks):
                audio = sd.rec(
                    int(chunk_duration * self._sample_rate),
                    samplerate=self._sample_rate,
                    channels=self._channels,
                    dtype=np.int16,
                )
                sd.wait()

                result = await self.detect_wake_word(audio.tobytes())
                if result.get("detected"):
                    logger.info(f"Wake word detected: {result}")
                    return result
                await asyncio.sleep(0.1)

            return None
        except ImportError:
            logger.debug("sounddevice not available for wake word listening")
            return None
        except Exception as e:
            logger.error(f"Wake word listening failed: {e}")
            return None

    async def get_audio_devices(self) -> List[Dict[str, Any]]:
        """Get list of available audio input/output devices."""
        try:
            import sounddevice as sd
            devices = []
            for i, d in enumerate(sd.query_devices()):
                devices.append({
                    "index": i,
                    "name": d["name"],
                    "inputs": d["max_input_channels"],
                    "outputs": d["max_output_channels"],
                    "sample_rate": d["default_samplerate"],
                })
            return devices
        except ImportError:
            return [{"index": 0, "name": "Default device (sounddevice not installed)", "inputs": 0, "outputs": 0}]

    def get_status(self) -> Dict[str, Any]:
        """Get voice system status."""
        return {
            "initialized": self._initialized,
            "whisper_loaded": self._whisper_loaded,
            "whisper_model": settings.WHISPER_MODEL,
            "piper_voice": settings.PIPER_VOICE,
            "is_listening": self.is_listening,
            "is_speaking": self.is_speaking,
            "wake_words": settings.WAKE_WORDS,
            "sample_rate": self._sample_rate,
            "microphone_available": getattr(self, '_input_device', None) is not None,
        }
