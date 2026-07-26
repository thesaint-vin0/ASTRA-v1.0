import type { WSEvent, WSMessage } from '../types'

type EventCallback = (event: WSEvent) => void
type StatusCallback = (connected: boolean) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private url = `ws://${window.location.hostname}:8642/ws`
  private eventListeners: Map<string, Set<EventCallback>> = new Map()
  private statusListeners: Set<StatusCallback> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private isConnecting = false
  private messageQueue: WSMessage[] = []

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return
    this.isConnecting = true

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.notifyStatus(true)
        // Flush queued messages
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift()
          if (msg) this.send(msg)
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSEvent
          const type = data.type
          const listeners = this.eventListeners.get(type) || this.eventListeners.get('*')
          if (listeners) {
            listeners.forEach((cb) => cb(data))
          }
        } catch (e) {
          console.error('WebSocket message parse error:', e)
        }
      }

      this.ws.onclose = () => {
        this.isConnecting = false
        this.notifyStatus(false)
        this.reconnect()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
      }
    } catch (error) {
      this.isConnecting = false
      console.error('WebSocket connection error:', error)
      this.reconnect()
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return
    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000)
    setTimeout(() => this.connect(), delay)
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts
    this.messageQueue = []
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.notifyStatus(false)
  }

  send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.messageQueue.push(message)
      if (!this.isConnecting) this.connect()
    }
  }

  sendMessage(content: string, conversationId = 'new', stream = true): void {
    this.send({ type: 'message', content, conversation_id: conversationId, stream })
  }

  sendVoice(data: ArrayBuffer): void {
    this.send({ type: 'voice', content: new TextDecoder().decode(data) })
  }

  sendVision(imageData: string, prompt = '', conversationId = 'new'): void {
    this.send({ type: 'vision', content: imageData, prompt, conversation_id: conversationId })
  }

  sendPing(): void {
    this.send({ type: 'ping' })
  }

  sendCancel(): void {
    this.send({ type: 'cancel' })
  }

  on(eventType: string, callback: EventCallback): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(callback)
    return () => this.eventListeners.get(eventType)?.delete(callback)
  }

  onStatus(callback: StatusCallback): () => void {
    this.statusListeners.add(callback)
    return () => this.statusListeners.delete(callback)
  }

  private notifyStatus(connected: boolean): void {
    this.statusListeners.forEach((cb) => cb(connected))
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const wsService = new WebSocketService()
export default wsService
