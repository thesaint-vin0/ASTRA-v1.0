"""
Astra AI - WebSocket Handler
Real-time communication for streaming responses and events.
"""

from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
from loguru import logger

from ..core.ai_engine import AIEngine

# Active WebSocket connections
active_connections: dict[str, WebSocket] = {}

ai_engine: Optional[AIEngine] = None


async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time AI communication.
    Handles streaming responses, status updates, and events.
    """
    await websocket.accept()
    connection_id = str(id(websocket))
    active_connections[connection_id] = websocket

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)

            msg_type = message_data.get("type", "message")
            content = message_data.get("content", "")
            conversation_id = message_data.get("conversation_id", "new")
            stream = message_data.get("stream", True)

            if msg_type == "message":
                # Process message through AI engine
                if ai_engine:
                    async for event in ai_engine.process_message(
                        conversation_id=conversation_id,
                        message=content,
                        stream=stream,
                    ):
                        await websocket.send_json(event)
                        if event["type"] == "complete":
                            await websocket.send_json({
                                "type": "conversation_id",
                                "conversation_id": conversation_id,
                            })
                else:
                    await websocket.send_json({
                        "type": "error",
                        "error": "AI Engine not initialized",
                    })

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "cancel":
                # Cancel current processing
                await websocket.send_json({"type": "cancelled"})

            elif msg_type == "voice":
                # Process voice data
                if ai_engine:
                    async for event in ai_engine.process_voice_input(
                        audio_data=content.encode() if isinstance(content, str) else content,
                        conversation_id=conversation_id,
                    ):
                        await websocket.send_json(event)

            elif msg_type == "vision":
                # Process image data
                if ai_engine:
                    async for event in ai_engine.process_image(
                        image_data=content.encode() if isinstance(content, str) else content,
                        message=message_data.get("prompt", ""),
                        conversation_id=conversation_id,
                    ):
                        await websocket.send_json(event)

    except WebSocketDisconnect:
        logger.debug(f"WebSocket disconnected: {connection_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "error": str(e)})
        except:
            pass
    finally:
        active_connections.pop(connection_id, None)


async def broadcast_event(event_type: str, data: dict):
    """Broadcast an event to all connected WebSocket clients."""
    message = json.dumps({"type": event_type, **data})
    disconnected = []
    for cid, ws in active_connections.items():
        try:
            await ws.send_text(message)
        except:
            disconnected.append(cid)
    for cid in disconnected:
        active_connections.pop(cid, None)

