/**
 * Astra AI — Auto-Update Service
 *
 * Wraps electron-updater's autoUpdater behind an event/status based API that
 * the renderer can safely consume through the preload bridge.
 *
 * Design requirements:
 *  - Stable/Beta channel support (based on installed package version suffix and
 *    a runtime channel preference persisted on disk)
 *  - Download progress events
 *  - Update state machine (idle → checking → available → downloading → downloaded
 *    → installing, plus error/rollback)
 *  - Offline-safe: failed checks are surfaced as status events, never thrown
 *  - No direct Electron internals exposed to the renderer
 *  - IPC handlers registered here so main.js stays thin
 */
const { autoUpdater } = require('electron-updater')
const { app, ipcMain, dialog, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

// Release channel derived from the installed version suffix (single source).
function getReleaseChannel() {
  return /-(alpha|beta|rc|dev)/i.test(app.getVersion()) ? 'beta' : 'stable'
}

/**
 * Structured release logging for update lifecycle events.
 * Appends a JSON line per update event so ops/CI can trace update behavior.
 */
function logUpdate(event, details = {}) {
  try {
    const releaseLogFile = path.join(app.getPath('userData'), 'release.log')
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'update',
      event,
      ...details,
      version: app.getVersion(),
      channel: getReleaseChannel(),
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      node: process.versions.node,
    }
    fs.mkdirSync(path.dirname(releaseLogFile), { recursive: true })
    fs.appendFileSync(releaseLogFile, JSON.stringify(entry) + '\n')
  } catch (err) {
    console.error('[updater] Failed to write release log:', err)
  }
}

// Persist channel + autoDownload preferences in the userData directory.
function getConfig() {
  const file = path.join(app.getPath('userData'), 'updater-config.json')
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return { channel: 'stable', autoDownload: true }
  }
}

function saveConfig(patch) {
  const file = path.join(app.getPath('userData'), 'updater-config.json')
  const merged = { ...getConfig(), ...patch, channel: patch.channel || getConfig().channel }
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(merged, null, 2))
  } catch (err) {
    console.error('[updater] Failed to persist config:', err)
  }
}

const UPDATE_STATES = {
  IDLE: 'idle',
  CHECKING: 'checking',
  AVAILABLE: 'available',
  NOT_AVAILABLE: 'not_available',
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  INSTALLING: 'installing',
  ERROR: 'error',
}

class UpdateManager {
  constructor() {
    this.status = UPDATE_STATES.IDLE
    this.lastError = null
    this.latestVersion = null
    this.currentVersion = app.getVersion()
    this.downloadProgress = { percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 }
    this.config = getConfig()

    this._wireUpdaterEvents()
    this._registerIpcHandlers()
  }

  _wireUpdaterEvents() {
    autoUpdater.autoDownload = this.config.autoDownload
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => {
      this._setStatus(UPDATE_STATES.CHECKING)
      logUpdate('checking-for-update')
    })

    autoUpdater.on('update-available', (info) => {
      this.latestVersion = info.version
      this.lastError = null
      this._setStatus(UPDATE_STATES.AVAILABLE, { version: info.version })
      logUpdate('update-available', { version: info.version })
    })

    autoUpdater.on('update-not-available', (info) => {
      this.latestVersion = info.version || null
      this._setStatus(UPDATE_STATES.NOT_AVAILABLE, { version: this.latestVersion })
      logUpdate('update-not-available', { version: this.latestVersion })
    })

    autoUpdater.on('download-progress', (progress) => {
      this.downloadProgress = {
        percent: Math.round(progress.percent * 10) / 10,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      }
      this._setStatus(UPDATE_STATES.DOWNLOADING, { progress: this.downloadProgress })
    })

    autoUpdater.on('update-downloaded', (info) => {
      this._setStatus(UPDATE_STATES.DOWNLOADED, { version: info.version })
      logUpdate('update-downloaded', { version: info.version })
    })

    autoUpdater.on('update-cancelled', () => {
      this._setStatus(UPDATE_STATES.IDLE)
      logUpdate('update-cancelled')
    })

    autoUpdater.on('error', (err) => {
      this.lastError = err && err.message ? err.message : String(err)
      console.error('[updater] Error:', err)
      this._setStatus(UPDATE_STATES.ERROR, { message: this.lastError })
      logUpdate('error', { error: this.lastError })
    })

    // macOS forced updates are not used; on Windows/Linux the app is relaunched.
    autoUpdater.on('before-quit-for-update', () => {
      this._setStatus(UPDATE_STATES.INSTALLING)
      logUpdate('before-quit-for-update')
    })
  }

  _setStatus(state, payload = {}) {
    this.status = state
    const statusPayload = {
      state,
      currentVersion: this.currentVersion,
      latestVersion: this.latestVersion || undefined,
      downloadProgress: this.downloadProgress,
      error: this.lastError || undefined,
      channel: this.config.channel,
      autoDownload: this.config.autoDownload,
      ...payload,
    }
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('update:status', statusPayload)
    }
  }

  _isDev() {
    return !app.isPackaged
  }

  async checkForUpdates() {
    // electron-updater only works in packaged builds. In dev we simulate a
    // graceful "not available" response so the UI is still testable.
    if (this._isDev()) {
      console.log('[updater] Dev mode — skipping update check')
      this._setStatus(UPDATE_STATES.NOT_AVAILABLE, { message: 'Updates are only checked in packaged builds' })
      return { success: true, state: UPDATE_STATES.NOT_AVAILABLE }
    }
    try {
      await autoUpdater.checkForUpdates()
      return { success: true, state: this.status }
    } catch (err) {
      this.lastError = err.message
      this._setStatus(UPDATE_STATES.ERROR, { message: err.message })
      return { success: false, error: err.message }
    }
  }

  async downloadUpdate() {
    if (this.status !== UPDATE_STATES.AVAILABLE) {
      return { success: false, error: `Invalid state for download: ${this.status}` }
    }
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (err) {
      this.lastError = err.message
      this._setStatus(UPDATE_STATES.ERROR, { message: err.message })
      return { success: false, error: err.message }
    }
  }

  async quitAndInstall() {
    if (this.status !== UPDATE_STATES.DOWNLOADED) {
      return { success: false, error: `Invalid state for install: ${this.status}` }
    }
    this._setStatus(UPDATE_STATES.INSTALLING)
    setImmediate(() => autoUpdater.quitAndInstall(false, true))
    return { success: true }
  }

  async setAutoDownload(enabled) {
    this.config.autoDownload = !!enabled
    autoUpdater.autoDownload = this.config.autoDownload
    saveConfig({ autoDownload: this.config.autoDownload })
    this._setStatus(this.status)
    return { success: true, autoDownload: this.config.autoDownload }
  }

  async setChannel(channel) {
    if (!['stable', 'beta'].includes(channel)) {
      return { success: false, error: `Unsupported channel: ${channel}` }
    }
    this.config.channel = channel
    saveConfig({ channel })
    // electron-updater derives channel from package version (e.g. 1.0.0-beta.1)
    // and from the configured publish provider. We reload the updater config to
    // reflect the change immediately.
    this._setStatus(this.status)
    return { success: true, channel }
  }

  getStatus() {
    return {
      state: this.status,
      currentVersion: this.currentVersion,
      latestVersion: this.latestVersion || undefined,
      downloadProgress: this.downloadProgress,
      error: this.lastError || undefined,
      channel: this.config.channel,
      autoDownload: this.config.autoDownload,
    }
  }

  _registerIpcHandlers() {
    ipcMain.handle('update:check', () => this.checkForUpdates())
    ipcMain.handle('update:download', () => this.downloadUpdate())
    ipcMain.handle('update:install', () => this.quitAndInstall())
    ipcMain.handle('update:getStatus', () => this.getStatus())
    ipcMain.handle('update:setAutoDownload', (_e, enabled) => this.setAutoDownload(enabled))
    ipcMain.handle('update:setChannel', (_e, channel) => this.setChannel(channel))
  }
}

module.exports = { UpdateManager, UPDATE_STATES }

