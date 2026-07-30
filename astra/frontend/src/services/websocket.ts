import type { WSEvent, WSMessage } from '../types'
import { useAppStore } from '../stores/appStore'

type EventCallback = (event: WSEvent) => void
type StatusCallback = (connected: boolean) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private eventListeners: Map<string, Set<EventCallback>> = new Map()
  private statusListeners: Set<StatusCallback> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 20
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000
  private isConnecting = false
  private messageQueue: WSMessage[] = []
  private shouldReconnect = true
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null
  private lastPongTime: number = Date.now()
  private readonly PING_INTERVAL = 15000
  private readonly CONNECTION_TIMEOUT = 5000
  private readonly PONG_TIMEOUT = 10000

  /**
   * Get the WebSocket URL dynamically from the current location
   */
  private getUrl(): string {
    // In development, the Vite proxy handles /ws
    // In production, use the configured backend host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const hostname = window.location.hostname
    const port = '8642' // Backend port from config
    return `${protocol}//${hostname}:${port}/ws`
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return
    if (!this.shouldReconnect) return

    this.isConnecting = true
    useAppStore.getState().setBackendReady(false)

    try {
      this.ws = new WebSocket(this.getUrl())

      // Connection timeout detection
      this.connectionTimeout = setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          this.ws?.close()
          this.isConnecting = false
          this.notifyStatus(false)
          this.scheduleReconnect()
        }
      }, this.CONNECTION_TIMEOUT)

      this.ws.onopen = () => {
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout)
          this.connectionTimeout = null
        }

        this.isConnecting = false
        this.reconnectAttempts = 0
        this.lastPongTime = Date.now()
        this.notifyStatus(true)
        useAppStore.getState().setBackendReady(true)
        useAppStore.getState().setConnected(true)

        // Start heartbeat
        this.startPing()

        // Flush queued messages
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift()
          if (msg) this.send(msg)
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSEvent

          // Handle pong response
          if (data.type === 'pong') {
            this.lastPongTime = Date.now()
            return
          }

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
        this.stopPing()
        this.notifyStatus(false)
        useAppStore.getState().setConnected(false)
        this.scheduleReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
      }
    } catch (error) {
      this.isConnecting = false
      console.error('WebSocket connection error:', error)
      this.notifyStatus(false)
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnect attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    )

    setTimeout(() => this.connect(), delay)
  }

  private startPing(): void {
    this.stopPing()
    this.lastPongTime = Date.now()

    this.pingInterval = setInterval(() => {
      // Check if we've missed pong responses
      if (Date.now() - this.lastPongTime > this.PONG_TIMEOUT) {
        console.warn('WebSocket heartbeat timeout, reconnecting...')
        this.ws?.close()
        return
      }

      try {
        this.send({ type: 'ping' })
      } catch {
        // Ignore send errors during ping
      }
    }, this.PING_INTERVAL)
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.stopPing()
    this.messageQueue = []

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.notifyStatus(false)
    useAppStore.getState().setConnected(false)
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

  /**
   * Manual reconnect button handler
   */
  reconnect(): void {
    this.reconnectAttempts = 0
    this.shouldReconnect = true
    this.disconnect()
    this.connect()
  }
}

export const wsService = new WebSocketService()
export default wsService

