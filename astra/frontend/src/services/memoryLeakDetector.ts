/**
 * Memory Leak Detector Service
 *
 * Monitors memory usage and detects potential leaks by tracking
 * sustained memory growth over time. Only warns when sustained
 * usage exceeds configurable thresholds.
 */

interface MemorySample {
  timestamp: number
  heapUsed: number
  heapTotal: number
  external: number
}

interface LeakDetectorConfig {
  sampleInterval: number    // ms between samples
  warningThreshold: number  // % increase over baseline to warn
  criticalThreshold: number // % increase over baseline to alert
  sustainedSamples: number  // number of consecutive samples above threshold
  maxSamples: number        // max samples to keep for analysis
}

type LeakListener = (level: 'warning' | 'critical', details: { currentMB: number; baselineMB: number; increasePercent: number }) => void

class MemoryLeakDetector {
  private samples: MemorySample[] = []
  private baseline: number | null = null
  private sustainedCount = 0
  private intervalId: ReturnType<typeof setInterval> | null = null
  private listeners: Set<LeakListener> = new Set()
  private isRunning = false

  private config: LeakDetectorConfig = {
    sampleInterval: 30000,      // 30 seconds
    warningThreshold: 30,       // 30% increase
    criticalThreshold: 60,      // 60% increase
    sustainedSamples: 5,        // 5 consecutive samples
    maxSamples: 120,            // 1 hour at 30s intervals
  }

  constructor(config?: Partial<LeakDetectorConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  /** Start monitoring memory usage */
  start(): void {
    if (this.isRunning) return
    this.isRunning = true

    // Take initial sample for baseline
    this.takeSample()
    this.baseline = this.samples[0]?.heapUsed ?? null

    this.intervalId = setInterval(() => {
      this.takeSample()
      this.analyze()
    }, this.config.sampleInterval)
  }

  /** Stop monitoring */
  stop(): void {
    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /** Reset baseline and clear samples */
  reset(): void {
    this.samples = []
    this.baseline = null
    this.sustainedCount = 0
  }

  /** Register a listener for leak warnings */
  onLeakDetected(listener: LeakListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Get current memory stats */
  getStats(): { currentMB: number; baselineMB: number | null; growthPercent: number; samples: number } {
    const current = this.samples[this.samples.length - 1]
    return {
      currentMB: current ? Math.round(current.heapUsed / 1024 / 1024 * 100) / 100 : 0,
      baselineMB: this.baseline ? Math.round(this.baseline / 1024 / 1024 * 100) / 100 : null,
      growthPercent: this.baseline && current
        ? Math.round(((current.heapUsed - this.baseline) / this.baseline) * 100 * 100) / 100
        : 0,
      samples: this.samples.length,
    }
  }

private takeSample(): void {
    // Use performance.memory if available (Chrome/Chromium)
    const mem = (performance as any).memory
    if (mem) {
      this.samples.push({
        timestamp: Date.now(),
        heapUsed: mem.usedJSHeapSize,
        heapTotal: mem.totalJSHeapSize,
        external: 0,
      })
    } else {
      // Fallback: use performance API or Electron's memory usage via IPC
      // In Electron, we can get memory from the main process
      this.samples.push({
        timestamp: Date.now(),
        heapUsed: (performance as any).memory?.usedJSHeapSize ?? 0,
        heapTotal: (performance as any).memory?.totalJSHeapSize ?? 0,
        external: 0,
      })
    }

    // Trim samples
    if (this.samples.length > this.config.maxSamples) {
      this.samples = this.samples.slice(-this.config.maxSamples)
    }
  }

  private analyze(): void {
    if (!this.baseline || this.samples.length < 2) return

    const current = this.samples[this.samples.length - 1].heapUsed
    const increasePercent = ((current - this.baseline) / this.baseline) * 100

    if (increasePercent > this.config.criticalThreshold) {
      this.sustainedCount++
      if (this.sustainedCount >= this.config.sustainedSamples) {
        this.notifyListeners('critical', {
          currentMB: Math.round(current / 1024 / 1024 * 100) / 100,
          baselineMB: Math.round(this.baseline / 1024 / 1024 * 100) / 100,
          increasePercent: Math.round(increasePercent * 100) / 100,
        })
      }
    } else if (increasePercent > this.config.warningThreshold) {
      this.sustainedCount++
      if (this.sustainedCount >= this.config.sustainedSamples) {
        this.notifyListeners('warning', {
          currentMB: Math.round(current / 1024 / 1024 * 100) / 100,
          baselineMB: Math.round(this.baseline / 1024 / 1024 * 100) / 100,
          increasePercent: Math.round(increasePercent * 100) / 100,
        })
      }
    } else {
      this.sustainedCount = 0
    }
  }

  private notifyListeners(level: 'warning' | 'critical', details: { currentMB: number; baselineMB: number; increasePercent: number }): void {
    this.listeners.forEach((listener) => listener(level, details))
  }
}

export const memoryLeakDetector = new MemoryLeakDetector()
export default MemoryLeakDetector
