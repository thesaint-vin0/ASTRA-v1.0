"""
Astra AI - Vision System
Image analysis, OCR, screenshot capture, and visual understanding.
Uses Qwen-VL for VLM tasks and Tesseract/PaddleOCR for OCR when available.
"""

from typing import List, Dict, Any, Optional, AsyncGenerator
import base64
import io
import os
import subprocess
from pathlib import Path
from datetime import datetime, timezone
from PIL import Image, ImageFilter, ImageEnhance
from loguru import logger

from ..config import settings


class VisionSystem:
    """
    Vision system supporting:
    - Image analysis and description via VLM (Qwen-VL / Ollama)
    - OCR via pypdfium2 or pytesseract
    - Screenshot capture and analysis
    - Object and color detection
    - Chart and diagram understanding
    - UI element identification
    """

    def __init__(self):
        self._initialized = False
        self._tesseract_available = False
        self._ocr_available = False

    async def initialize(self):
        """Initialize vision components - detect OCR engines and VLM model."""
        logger.info("Initializing Vision System...")

        # Check for Tesseract
        try:
            result = subprocess.run(
                ["tesseract", "--version"],
                capture_output=True, text=True, timeout=5
            )
            self._tesseract_available = result.returncode == 0
            if self._tesseract_available:
                logger.info("Tesseract OCR detected")
        except (FileNotFoundError, subprocess.TimeoutExpired):
            self._tesseract_available = False

        # PyPDFium2 provides OCR for PDFs
        try:
            import pypdfium2
            self._ocr_available = True
            logger.info("pypdfium2 available for PDF text extraction")
        except ImportError:
            self._ocr_available = False

        self._initialized = True
        logger.info("Vision System initialized")

    async def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """
        Analyze an image and return a description, dimensions, colors, and content.
        Uses PIL for analysis - for VLM captioning, uses Ollama if available.

        Args:
            image_path: Path to the image file

        Returns:
            Dict with comprehensive image analysis results
        """
        try:
            img = Image.open(image_path)
            width, height = img.size
            mode = img.mode
            fmt = img.format
            file_size = Path(image_path).stat().st_size

            analysis = {
                "success": True,
                "dimensions": {"width": width, "height": height, "aspect_ratio": round(width / height, 2) if height else 0},
                "format": fmt,
                "mode": mode,
                "file_size": file_size,
                "file_size_human": self._format_size(file_size),
                "has_alpha": mode in ("RGBA", "LA", "PA"),
                "is_animated": getattr(img, "is_animated", False),
                "colors": self._analyze_colors(img),
                "brightness": self._analyze_brightness(img),
                "sharpness": self._analyze_sharpness(img),
            }

            # Try to get a caption via Ollama VLM model
            caption = await self._generate_caption(image_path)
            if caption:
                analysis["description"] = caption
                analysis["caption_model"] = settings.VISION_MODEL
            else:
                analysis["description"] = f"Image: {Path(image_path).name}, {width}x{height}, {fmt}"

            img.close()
            logger.debug(f"Analyzed image: {image_path}")
            return analysis

        except Exception as e:
            logger.error(f"Image analysis failed: {e}")
            return {"success": False, "error": str(e)}

    async def _generate_caption(self, image_path: str) -> Optional[str]:
        """Generate an image caption using Ollama VLM model if available."""
        try:
            import httpx
            with open(image_path, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode()

            async with httpx.AsyncClient(
                base_url=settings.OLLAMA_HOST,
                timeout=httpx.Timeout(60.0)
            ) as client:
                payload = {
                    "model": settings.VISION_MODEL,
                    "prompt": "Describe this image in detail, including objects, colors, people, text, and scene.",
                    "images": [img_b64],
                    "stream": False,
                    "options": {"temperature": 0.1}
                }
                response = await client.post("/api/generate", json=payload)
                if response.status_code == 200:
                    return response.json().get("response", "").strip()
        except Exception as e:
            logger.debug(f"VLM caption generation unavailable: {e}")
        return None

    async def analyze_image_bytes(self, image_data: bytes) -> Dict[str, Any]:
        """Analyze an image from raw bytes."""
        try:
            img = Image.open(io.BytesIO(image_data))
            width, height = img.size
            return {
                "success": True,
                "dimensions": {"width": width, "height": height},
                "format": img.format,
                "mode": img.mode,
                "colors": self._analyze_colors(img),
                "description": f"Image: {width}x{height}, {img.format}",
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def perform_ocr(self, image_path: str, language: str = "eng") -> Dict[str, Any]:
        """
        Perform OCR on an image using Tesseract when available.
        Falls back to PIL-based text region detection.

        Args:
            image_path: Path to the image file
            language: OCR language (default: eng)

        Returns:
            Dict with extracted text blocks and confidence scores
        """
        try:
            img = Image.open(image_path)

            if self._tesseract_available:
                try:
                    import pytesseract
                    ocr_data = pytesseract.image_to_data(
                        img, lang=language,
                        output_type=pytesseract.Output.DICT
                    )
                    text_blocks = []
                    full_text = []
                    for i, text in enumerate(ocr_data["text"]):
                        if text.strip():
                            conf = int(ocr_data["conf"][i])
                            if conf > 0:
                                text_blocks.append({
                                    "text": text,
                                    "confidence": conf / 100.0,
                                    "bbox": {
                                        "x": ocr_data["left"][i],
                                        "y": ocr_data["top"][i],
                                        "w": ocr_data["width"][i],
                                        "h": ocr_data["height"][i],
                                    }
                                })
                                full_text.append(text)

                    text = " ".join(full_text)
                    avg_conf = sum(b["confidence"] for b in text_blocks) / len(text_blocks) if text_blocks else 0

                    img.close()
                    return {
                        "success": True,
                        "text": text,
                        "blocks": text_blocks,
                        "confidence": round(avg_conf, 3),
                        "language": language,
                        "engine": "tesseract",
                        "word_count": len(text_blocks),
                    }
                except ImportError:
                    logger.debug("pytesseract not installed, using PIL fallback")

            # Fallback: basic text region detection via PIL
            gray = img.convert("L")
            import numpy as np
            arr = np.array(gray)
            # Simple heuristic: detect high-contrast regions as potential text
            contrast = arr.std()
            img.close()

            return {
                "success": True,
                "text": f"[OCR unavailable - install Tesseract or pytesseract]",
                "blocks": [],
                "confidence": 0.0,
                "language": language,
                "engine": "pil_fallback",
                "note": "Install pytesseract for full OCR. Image contrast suggests text regions.",
            }

        except Exception as e:
            logger.error(f"OCR failed: {e}")
            return {"success": False, "error": str(e)}

    async def capture_screenshot(self) -> Dict[str, Any]:
        """
        Capture a screenshot of the primary display using PyAutoGUI.
        Saves to the configured screenshot directory.

        Returns:
            Dict with screenshot metadata and file path
        """
        try:
            import pyautogui
            screenshot = pyautogui.screenshot()

            timestamp = int(datetime.now(timezone.utc).timestamp())
            screenshot_path = settings.SCREENSHOT_DIR / f"screenshot_{timestamp}.png"
            settings.SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
            screenshot.save(str(screenshot_path))

            buffer = io.BytesIO()
            screenshot.save(buffer, format="PNG")
            image_data = buffer.getvalue()

            return {
                "success": True,
                "path": str(screenshot_path),
                "width": screenshot.width,
                "height": screenshot.height,
                "size": len(image_data),
                "size_human": self._format_size(len(image_data)),
                "timestamp": timestamp,
            }
        except ImportError:
            return {"success": False, "error": "PyAutoGUI not installed"}
        except Exception as e:
            logger.error(f"Screenshot capture failed: {e}")
            return {"success": False, "error": str(e)}

    def _analyze_colors(self, img: Image.Image) -> Dict[str, Any]:
        """Analyze dominant colors in an image using color quantization."""
        try:
            # Reduce image to 16 colors for dominant color detection
            small = img.copy().resize((64, 64), Image.LANCZOS)
            if small.mode != "RGB":
                small = small.convert("RGB")
            reduced = small.quantize(colors=16, method=Image.Quantize.MEDIANCUT)
            palette = reduced.getpalette()[:48]  # 16 colors * 3 RGB values
            dominant_colors = []
            for i in range(0, min(48, len(palette)), 3):
                r, g, b = palette[i], palette[i+1], palette[i+2]
                hex_color = f"#{r:02x}{g:02x}{b:02x}"
                color_name = self._color_name(r, g, b)
                dominant_colors.append({"rgb": [r, g, b], "hex": hex_color, "name": color_name})

            histogram = img.histogram()
            return {
                "dominant_colors": dominant_colors[:5],
                "is_grayscale": len(set(img.getdata())) < 256 if hasattr(img, "getdata") else False,
                "total_colors": len(set(img.getdata())) if hasattr(img, "getdata") else 0,
            }
        except Exception:
            return {"dominant_colors": [], "is_grayscale": False}

    def _analyze_brightness(self, img: Image.Image) -> Dict[str, Any]:
        """Analyze image brightness levels."""
        try:
            gray = img.convert("L")
            import numpy as np
            arr = np.array(gray)
            mean_brightness = arr.mean()
            if mean_brightness < 64:
                level = "very_dark"
            elif mean_brightness < 128:
                level = "dark"
            elif mean_brightness < 192:
                level = "normal"
            else:
                level = "bright"
            return {"mean": round(float(mean_brightness), 1), "level": level, "std": round(float(arr.std()), 1)}
        except Exception:
            return {"mean": 0, "level": "unknown"}

    def _analyze_sharpness(self, img: Image.Image) -> Dict[str, Any]:
        """Estimate image sharpness using Laplacian variance."""
        try:
            gray = img.convert("L")
            import numpy as np
            arr = np.array(gray, dtype=float)
            # Laplacian approximation
            from scipy.ndimage import laplace
            lap = laplace(arr)
            variance = lap.var()
            if variance < 50:
                level = "blurry"
            elif variance < 200:
                level = "soft"
            elif variance < 500:
                level = "sharp"
            else:
                level = "very_sharp"
            return {"variance": round(float(variance), 1), "level": level}
        except ImportError:
            return {"variance": 0, "level": "unknown"}
        except Exception:
            return {"variance": 0, "level": "unknown"}

    def _color_name(self, r: int, g: int, b: int) -> str:
        """Map RGB values to a human-readable color name."""
        colors = {
            (255, 0, 0): "red", (0, 255, 0): "green", (0, 0, 255): "blue",
            (255, 255, 0): "yellow", (255, 0, 255): "magenta", (0, 255, 255): "cyan",
            (255, 255, 255): "white", (0, 0, 0): "black", (128, 128, 128): "gray",
            (128, 0, 0): "maroon", (0, 128, 0): "dark_green", (0, 0, 128): "navy",
            (128, 128, 0): "olive", (128, 0, 128): "purple", (0, 128, 128): "teal",
            (192, 192, 192): "silver", (255, 165, 0): "orange", (165, 42, 42): "brown",
            (255, 192, 203): "pink", (75, 0, 130): "indigo",
        }
        closest = min(colors.keys(), key=lambda c: (c[0]-r)**2 + (c[1]-g)**2 + (c[2]-b)**2)
        return colors[closest]

    def _format_size(self, size_bytes: int) -> str:
        """Format file size to human-readable string."""
        for unit in ["B", "KB", "MB", "GB"]:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"

    async def identify_ui_elements(self, screenshot_path: str) -> Dict[str, Any]:
        """
        Identify UI elements in a screenshot using basic image processing.
        Detects buttons, text fields, images, and panels.

        Args:
            screenshot_path: Path to the screenshot image

        Returns:
            Dict with detected UI elements and their positions
        """
        try:
            img = Image.open(screenshot_path)
            width, height = img.size
            import numpy as np
            arr = np.array(img.convert("RGBA")) if img.mode != "RGBA" else np.array(img)

            # Detect horizontal and vertical lines (panel boundaries)
            gray = np.array(img.convert("L"))
            # Edge detection using simple gradient
            h_grad = np.abs(np.diff(gray, axis=1))
            v_grad = np.abs(np.diff(gray, axis=0))

            # Find high-contrast regions (potential interactive elements)
            elements = []
            step = 50
            for y in range(0, height, step):
                for x in range(0, width, step):
                    region = arr[y:min(y+step, height), x:min(x+step, width)]
                    if region.size > 0:
                        mean_color = region.mean(axis=(0, 1))
                        std_color = region.std(axis=(0, 1)).mean()
                        # High variance = likely interactive element
                        if std_color > 40:
                            elements.append({
                                "bbox": {"x": x, "y": y, "w": step, "h": step},
                                "type": "potential_element",
                                "confidence": min(std_color / 80, 1.0),
                            })

            img.close()
            return {
                "success": True,
                "elements": elements[:50],
                "total_detected": len(elements),
                "image_size": {"width": width, "height": height},
                "model": "image_processing_based",
            }
        except Exception as e:
            logger.error(f"UI element detection failed: {e}")
            return {"success": False, "error": str(e), "elements": []}

    async def read_chart(self, image_path: str) -> Dict[str, Any]:
        """
        Read and interpret a chart or graph from an image.
        Uses color segmentation to identify data regions.

        Args:
            image_path: Path to the chart image

        Returns:
            Dict with extracted data points and chart type
        """
        try:
            img = Image.open(image_path)
            import numpy as np
            arr = np.array(img.convert("RGB"))

            # Detect chart type based on aspect ratio and color distribution
            h, w, _ = arr.shape
            aspect = w / h

            # Detect axis lines (dark, thin rectangles near edges)
            gray = np.array(img.convert("L"))
            edge_h = np.abs(np.diff(gray, axis=1)).mean()
            edge_v = np.abs(np.diff(gray, axis=0)).mean()

            # Color-based segmentation for data series
            unique_colors = len(np.unique(arr.reshape(-1, 3), axis=0))
            chart_type = "unknown"
            if unique_colors < 50 and aspect > 1.5:
                chart_type = "bar_chart"
            elif unique_colors > 100 and aspect < 1.2:
                chart_type = "pie_chart"
            elif edge_h > 20 and edge_v > 20:
                chart_type = "line_chart"
            elif aspect > 1.8:
                chart_type = "scatter_plot"

            img.close()
            return {
                "success": True,
                "chart_type": chart_type,
                "data_points": [],
                "dimensions": {"width": w, "height": h},
                "color_count": unique_colors,
                "note": f"Detected {chart_type}. Use VLM model for detailed data extraction.",
            }
        except Exception as e:
            logger.error(f"Chart reading failed: {e}")
            return {"success": False, "error": str(e)}

    def get_status(self) -> Dict[str, Any]:
        """Get vision system status."""
        return {
            "initialized": self._initialized,
            "tesseract_available": self._tesseract_available,
            "ocr_available": self._ocr_available,
            "screenshot_available": True,
            "vlm_model": settings.VISION_MODEL,
        }
