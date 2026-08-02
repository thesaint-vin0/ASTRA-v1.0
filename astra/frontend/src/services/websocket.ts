import type { WSEvent, WSMessage } from '../types'
import { useAppStore } from '../stores/appStore'

type EventCallback = (event: WSEvent) => void
type StatusCallback = (connected: boolean) => void

// Message priority levels for the WebSocket send queue
type MessagePriority = 'high' | 'normal' | 'low'

interface QueuedMessage {
  message: WSMessage
  priority: MessagePriority
}

const PRIORITY_ORDER: Record<MessagePriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
}

export interface ConnectionQuality {
  rttMs: number | null
  consecutiveReconnects: number
  totalMessagesReceived: number
  totalMessagesSent: number
  totalPings: number
  totalPongs: number
  lastDisconnectAt: number | null
  bandwidth: 'good' | 'fair' | 'poor' | 'unknown'
}

class WebSocketService {
  private ws: WebSocket | null = null
  private eventListeners: Map<string, Set<EventCallback>> = new Map()
  private statusListeners: Set<StatusCallback> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 20
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000
  private isConnecting = false
  private messageQueue: QueuedMessage[] = []
  private shouldReconnect = true
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null
  private lastPongTime: number = Date.now()
  private readonly PING_INTERVAL = 15000
  private readonly CONNECTION_TIMEOUT = 5000
  private readonly PONG_TIMEOUT = 10000
  // Maximum buffered outgoing messages; oldest low-priority messages are
  // dropped first to prevent unbounded queue growth during disconnects.
  private readonly MAX_QUEUE_SIZE = 200
  // Batching for rapid updates
  private batchBuffer: Map<string, WSEvent[]> = new Map()
  private batchTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private readonly BATCH_WINDOW = 50 // ms to batch rapid events

  // ── Connection quality metrics ──
  private lastPingSentAt: number = 0
  private lastRttMs: number | null = null
  private totalMessagesReceived = 0
  private totalMessagesSent = 0
  private totalPings = 0
  private totalPongs = 0
  private lastDisconnectAt: number | null = null

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
        this.lastRttMs = null
        this.lastDisconnectAt = null
        this.notifyStatus(true)
        useAppStore.getState().setBackendReady(true)
        useAppStore.getState().setConnected(true)

        // Start heartbeat
        this.startPing()

        // Flush queued messages (sorted by priority)
        const ordered = [...this.messageQueue].sort(
          (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        )
        this.messageQueue = []
        for (const queued of ordered) {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(queued.message))
          } else {
            this.messageQueue.push(queued)
          }
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSEvent
          this.totalMessagesReceived++

          // Handle pong response
          if (data.type === 'pong') {
            this.lastPongTime = Date.now()
            this.totalPongs++
            // Compute RTT from last ping sent time
            if (this.lastPingSentAt > 0) {
              this.lastRttMs = Date.now() - this.lastPingSentAt
              this.lastPingSentAt = 0
            }
            return
          }

          // Batch rapid chunk updates for streaming
          this.dispatchBatched(data)
        } catch (e) {
          console.error('WebSocket message parse error:', e)
        }
      }

      this.ws.onclose = () => {
        this.isConnecting = false
        this.stopPing()
        this.lastDisconnectAt = Date.now()
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
    // Exponential backoff with jitter to avoid thundering herd
    const exponential = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1)
    const capped = Math.min(exponential, this.maxReconnectDelay)
    const jitter = capped * 0.1 * Math.random()
    const delay = Math.floor(capped + jitter)

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
        this.lastPingSentAt = Date.now()
        this.totalPings++
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

  send(message: WSMessage, priority: MessagePriority = 'normal'): void {
    this.totalMessagesSent++
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.messageQueue.push({ message, priority })
      // Prevent unbounded queue growth: drop oldest low-priority messages first
      if (this.messageQueue.length > this.MAX_QUEUE_SIZE) {
        const overflow = this.messageQueue.length - this.MAX_QUEUE_SIZE
        this.messageQueue = this.messageQueue.filter((_, i) => {
          if (i < overflow && this.messageQueue[i].priority === 'low') return false
          return true
        }).slice(-this.MAX_QUEUE_SIZE)
      }
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
    this.send({ type: 'ping' }, 'low')
  }

  sendCancel(): void {
    this.send({ type: 'cancel' }, 'high')
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

/**
   * Dispatch events with batching for rapid updates (e.g., streaming chunks)
   * Batches 'chunk' events within a 50ms window to reduce re-renders while
   * preserving full streaming content (concatenates intermediate chunks).
   */
  private dispatchBatched(data: WSEvent): void {
    const type = data.type

    // Only batch 'chunk' events for streaming; dispatch everything else immediately
    if (type !== 'chunk') {
      const listeners = this.eventListeners.get(type) || this.eventListeners.get('*')
      if (listeners) {
        listeners.forEach((cb) => cb(data))
      }
      return
    }

    // Batch chunk events
    if (!this.batchBuffer.has(type)) {
      this.batchBuffer.set(type, [])
    }
    this.batchBuffer.get(type)!.push(data)

    // Clear existing timeout
    if (this.batchTimeouts.has(type)) {
      clearTimeout(this.batchTimeouts.get(type)!)
    }

    // Set new timeout to flush batch
    this.batchTimeouts.set(type, setTimeout(() => {
      const batch = this.batchBuffer.get(type) || []
      this.batchBuffer.delete(type)
      this.batchTimeouts.delete(type)

      if (batch.length === 0) return

      // Concatenate all chunk content into a single event to avoid losing data
      const merged = { ...batch[batch.length - 1] }
      const fullContent = batch.map((b) => (b.content as string) || '').join('')
      if (fullContent) merged.content = fullContent

      const listeners = this.eventListeners.get(type) || this.eventListeners.get('*')
      if (listeners) {
        listeners.forEach((cb) => cb(merged))
      }
    }, this.BATCH_WINDOW))
  }

  private notifyStatus(connected: boolean): void {
    this.statusListeners.forEach((cb) => cb(connected))
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /** Number of messages currently buffered awaiting reconnect */
  get queuedCount(): number {
    return this.messageQueue.length
  }

  /** Retrieve live connection quality metrics for diagnostics and UI */
  getQuality(): ConnectionQuality {
    const rtt = this.lastRttMs
    let bandwidth: ConnectionQuality['bandwidth'] = 'unknown'
    if (rtt !== null) {
      if (rtt < 150) bandwidth = 'good'
      else if (rtt < 400) bandwidth = 'fair'
      else bandwidth = 'poor'
    }
    return {
      rttMs: rtt,
      consecutiveReconnects: this.reconnectAttempts,
      totalMessagesReceived: this.totalMessagesReceived,
      totalMessagesSent: this.totalMessagesSent,
      totalPings: this.totalPings,
      totalPongs: this.totalPongs,
      lastDisconnectAt: this.lastDisconnectAt,
      bandwidth,
    }
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

