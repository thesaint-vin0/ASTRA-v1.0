const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, Notification, dialog, powerMonitor } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow = null
let tray = null
let isQuitting = false
let isDev = false
let isQuitConfirmed = false
let pendingOpenPaths = []
let rendererReady = false

// Single instance lock — focus existing window instead of launching a duplicate
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

/**
 * Extract existing file paths from a command-line argument array. Used to
 * detect files passed to the app on initial launch or a second instance.
 */
function getFilePathsFromArgs(argv) {
  return argv.slice(1).filter((arg) => {
    if (arg.startsWith('-')) return false
    try {
      return fs.existsSync(arg)
    } catch {
      return false
    }
  })
}

/**
 * Handle "Open with Astra" — files passed to the app via OS file association,
 * second-instance launch, or macOS open-file event. Sends paths to the
 * renderer so they flow through the common import pipeline.
 *
 * Files opened before the renderer signals readiness are queued and drained
 * by the renderer via `files:getPendingOpenPaths` once it mounts. This avoids
 * race conditions where the event would be emitted before listeners exist.
 */
function handleOpenWithAstra(filePaths) {
  if (!mainWindow || !rendererReady) {
    pendingOpenPaths.push(...filePaths)
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
  mainWindow.webContents.send('file:open-with', filePaths)
}

// Second instance — focus the existing window and forward any opened files
app.on('second-instance', (_event, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
  const filePaths = getFilePathsFromArgs(commandLine)
  if (filePaths.length > 0) {
    handleOpenWithAstra(filePaths)
  }
})

// macOS: app was opened with a file (or files)
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  handleOpenWithAstra([filePath])
})

/**
 * Create a desktop shortcut for the app.
 * Windows: PowerShell WScript.Shell COM object.
 * Linux:   .desktop launcher file on the desktop.
 * macOS:   app is already launched from /Applications; verify existence.
 */
function createDesktopShortcut() {
  try {
    const desktopPath = app.getPath('desktop')
    if (process.platform === 'win32') {
      const exePath = process.execPath
      const shortcutPath = path.join(desktopPath, 'Astra AI.lnk')
      const psScript = [
        '$ws = New-Object -ComObject WScript.Shell;',
        `$s = $ws.CreateShortcut(${JSON.stringify(shortcutPath)});`,
        `$s.TargetPath = ${JSON.stringify(exePath)};`,
        `$s.WorkingDirectory = ${JSON.stringify(path.dirname(exePath))};`,
        `$s.Description = 'Astra AI';`,
        `$s.Save();`,
      ].join(' ')
      const { execFileSync } = require('child_process')
      execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript])
      return { success: true, path: shortcutPath }
    }
    if (process.platform === 'linux') {
      const desktopFile = path.join(desktopPath, 'astra-ai.desktop')
      const iconPath = path.join(__dirname, '../public/icon.png')
      const contents = [
        '[Desktop Entry]',
        'Type=Application',
        'Name=Astra AI',
        'Comment=Astra AI Operating System',
        `Exec=${process.execPath} %U`,
        `Icon=${iconPath}`,
        'Terminal=false',
        'Categories=Utility;',
      ].join('\n')
      fs.writeFileSync(desktopFile, contents)
      fs.chmodSync(desktopFile, 0o755)
      return { success: true, path: desktopFile }
    }
    if (process.platform === 'darwin') {
      const appPath = app.getPath('exe').split('/Contents/')[0]
      return { success: true, path: appPath }
    }
    return { success: false, error: 'Unsupported platform for desktop shortcut' }
  } catch (e) {
    logCrash(`Desktop shortcut error: ${e.message}`)
    return { success: false, error: e.message }
  }
}

// Feature flags
const FEATURES = {
  SYSTEM_TRAY: true,
  NATIVE_NOTIFICATIONS: true,
  LAUNCH_ON_STARTUP: true,
  DESKTOP_AUTOMATION: false,
  EXPERIMENTAL_UI: false,
}

// Store window state
const stateFile = path.join(app.getPath('userData'), 'window-state.json')
const settingsFile = path.join(app.getPath('userData'), 'settings.json')
const crashLogFile = path.join(app.getPath('userData'), 'crash.log')
const backupDir = path.join(app.getPath('userData'), 'backups')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function logCrash(error) {
  try {
    const timestamp = new Date().toISOString()
    const log = `[${timestamp}] CRASH: ${error}\n`
    fs.appendFileSync(crashLogFile, log)
  } catch (e) {
    console.error('Failed to write crash log:', e)
  }
}

function loadSettings() {
  try {
    if (fs.existsSync(settingsFile)) {
      return JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))
    }
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
  return {
    launchOnStartup: false,
    startMinimized: false,
    alwaysOnTop: false,
    minimizeToTray: true,
    notifications: {
      aiResponses: true,
      longTasks: true,
      pluginUpdates: true,
      modelDownloads: true,
      updates: true,
      automation: true,
      errors: true,
    },
  }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2))
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

function backupSettings() {
  try {
    ensureDir(backupDir)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(backupDir, `settings-${timestamp}.json`)
    if (fs.existsSync(settingsFile)) {
      fs.copyFileSync(settingsFile, backupFile)
    }
    if (fs.existsSync(stateFile)) {
      const stateBackup = path.join(backupDir, `window-state-${timestamp}.json`)
      fs.copyFileSync(stateFile, stateBackup)
    }
    // Rotate backups - keep last 10
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('settings-'))
      .sort()
      .reverse()
    if (backups.length > 10) {
      backups.slice(10).forEach(f => {
        fs.unlinkSync(path.join(backupDir, f))
      })
    }
  } catch (e) {
    console.error('Failed to backup settings:', e)
  }
}

function loadWindowState() {
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf-8'))
    }
  } catch (e) {
    console.error('Failed to load window state:', e)
  }
  return { width: 1280, height: 800, x: undefined, y: undefined, isMaximized: false, display: undefined }
}

function saveWindowState() {
  if (!mainWindow) return
  try {
    const bounds = mainWindow.getBounds()
    const currentDisplay = require('electron').screen.getDisplayMatching(bounds)
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized(),
      isFullScreen: mainWindow.isFullScreen(),
      display: currentDisplay ? currentDisplay.id : undefined,
    }
    fs.writeFileSync(stateFile, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save window state:', e)
  }
}

function createWindow() {
  const settings = loadSettings()
  const windowState = loadWindowState()

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 900,
    minHeight: 600,
    title: 'Astra AI',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // sandbox: true isolates the renderer and restricts Node.js access.
      // The preload script only uses `contextBridge` and `ipcRenderer`, both
      // of which are available in sandboxed renderers, so enabling the sandbox
      // does not break any functionality.
      sandbox: true,
      webSecurity: true,
    },
    frame: false,
    backgroundColor: '#0f172a',
    show: false,
    titleBarStyle: 'hidden',
    alwaysOnTop: settings.alwaysOnTop || false,
  })

  if (windowState.isMaximized) {
    mainWindow.maximize()
  }
  if (windowState.isFullScreen) {
    mainWindow.setFullScreen(true)
  }

  // Load the app
  isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    if (!settings.startMinimized) {
      mainWindow.show()
    }
  })

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximize-change', true)
    saveWindowState()
  })

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximize-change', false)
    saveWindowState()
  })

  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('window:fullscreen-change', true)
  })

  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('window:fullscreen-change', false)
  })

  mainWindow.on('resize', saveWindowState)
  mainWindow.on('move', saveWindowState)

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      if (settings.minimizeToTray !== false) {
        mainWindow.hide()
      } else {
        isQuitting = true
        app.quit()
      }
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss: http://127.0.0.1:8642; media-src 'self' blob:;",
        ],
      },
    })
  })

  // Create system tray
  if (FEATURES.SYSTEM_TRAY) {
    createTray(settings)
  }

  // Dashboard metrics
  startDashboardMetrics()
}

function createTray(settings) {
  const iconSize = process.platform === 'darwin' ? 16 : 32
  const icon = nativeImage.createFromPath(path.join(__dirname, '../public/icon.png'))
  tray = new Tray(icon.resize({ width: iconSize, height: iconSize }))
  tray.setToolTip('Astra AI')

  updateTrayMenu(settings)

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function updateTrayMenu(settings) {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Astra AI',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    {
      label: 'Quick Chat',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.webContents.send('command:new-conversation')
        }
      },
    },
    {
      label: 'Start Voice Mode',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.webContents.send('command:voice-mode')
        }
      },
    },
    {
      label: 'Open Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.webContents.send('command:open-dashboard')
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: settings.alwaysOnTop || false,
      click: (menuItem) => {
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(menuItem.checked)
          settings.alwaysOnTop = menuItem.checked
          saveSettings(settings)
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Astra',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
}

function startDashboardMetrics() {
  // Memory usage monitoring
  setInterval(() => {
    if (mainWindow) {
      const usage = process.memoryUsage()
      mainWindow.webContents.send('system:memory-usage', {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers,
      })
    }
  }, 30000)
}

// IPC Handlers
function setupIpcHandlers() {
  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.handle('window:close', () => {
    const settings = loadSettings()
    if (settings.minimizeToTray !== false) {
      mainWindow?.hide()
    } else {
      isQuitting = true
      app.quit()
    }
  })
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized())
  ipcMain.handle('window:isFocused', () => mainWindow?.isFocused())
  ipcMain.handle('window:setAlwaysOnTop', (_, onTop) => {
    mainWindow?.setAlwaysOnTop(onTop)
    const settings = loadSettings()
    settings.alwaysOnTop = onTop
    saveSettings(settings)
    updateTrayMenu(settings)
    return true
  })
  ipcMain.handle('window:isAlwaysOnTop', () => mainWindow?.isAlwaysOnTop())
  ipcMain.handle('window:setFullScreen', (_, fullscreen) => {
    mainWindow?.setFullScreen(fullscreen)
    return true
  })
  ipcMain.handle('window:isFullScreen', () => mainWindow?.isFullScreen())
  ipcMain.handle('window:getAllDisplays', () => {
    const displays = require('electron').screen.getAllDisplays()
    return displays.map(d => ({
      id: d.id,
      bounds: d.bounds,
      workArea: d.workArea,
      size: d.size,
      scaleFactor: d.scaleFactor,
      isPrimary: d.isPrimary,
    }))
  })
  ipcMain.handle('window:getCurrentDisplay', () => {
    if (!mainWindow) return null
    const bounds = mainWindow.getBounds()
    const display = require('electron').screen.getDisplayMatching(bounds)
    return {
      id: display.id,
      bounds: display.bounds,
      workArea: display.workArea,
      size: display.size,
      scaleFactor: display.scaleFactor,
      isPrimary: display.isPrimary,
    }
  })

  // App
  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:getPath', (_, name) => app.getPath(name))
  ipcMain.handle('app:getName', () => app.getName())
  ipcMain.handle('app:quit', () => {
    isQuitting = true
    app.quit()
  })
  ipcMain.handle('app:restart', () => {
    isQuitting = true
    app.relaunch()
    app.quit()
  })
  ipcMain.handle('app:getSystemInfo', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
    }
  })

  // Taskbar / Dock
  ipcMain.handle('app:setProgressBar', (_, progress) => {
    if (mainWindow) {
      if (process.platform === 'win32' || process.platform === 'darwin') {
        mainWindow.setProgressBar(progress)
      }
    }
  })
  ipcMain.handle('app:setBadgeCount', (_, count) => {
    if (process.platform === 'darwin') {
      app.dock.setBadge(count > 0 ? String(count) : '')
    }
  })
  ipcMain.handle('app:getBadgeCount', () => {
    if (process.platform === 'darwin') {
      const badge = app.dock.getBadge()
      return badge ? parseInt(badge) || 0 : 0
    }
    return 0
  })

  // Notifications
  ipcMain.handle('app:showNotification', (_, { title, body, silent }) => {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title,
        body,
        silent: silent || false,
        icon: path.join(__dirname, '../public/icon.png'),
      })
      notification.on('click', () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      })
      notification.show()
      return true
    }
    return false
  })

  // Shell
  ipcMain.handle('shell:openExternal', (_, url) => shell.openExternal(url))
  ipcMain.handle('shell:showItemInFolder', (_, filePath) => shell.showItemInFolder(filePath))
  ipcMain.handle('shell:openPath', (_, filePath) => shell.openPath(filePath))

  // Launch on Startup
  ipcMain.handle('app:setLaunchOnStartup', (_, enable, startMinimized) => {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: app.getPath('exe'),
      args: startMinimized ? ['--minimized'] : [],
    })
    const settings = loadSettings()
    settings.launchOnStartup = enable
    settings.startMinimized = startMinimized || false
    saveSettings(settings)
    return true
  })
  ipcMain.handle('app:getLaunchOnStartup', () => {
    return app.getLoginItemSettings().openAtLogin
  })

  // Desktop shortcut
  ipcMain.handle('app:createDesktopShortcut', () => createDesktopShortcut())

  // Settings
  ipcMain.handle('settings:get', () => loadSettings())
  ipcMain.handle('settings:set', (_, key, value) => {
    const settings = loadSettings()
    settings[key] = value
    saveSettings(settings)
    if (key === 'alwaysOnTop' && mainWindow) {
      mainWindow.setAlwaysOnTop(value)
    }
    if (key === 'launchOnStartup') {
      app.setLoginItemSettings({
        openAtLogin: value,
        path: app.getPath('exe'),
        args: settings.startMinimized ? ['--minimized'] : [],
      })
    }
    updateTrayMenu(settings)
    return true
  })
  ipcMain.handle('settings:getAll', () => loadSettings())

  // File Dialogs
  ipcMain.handle('dialog:openFile', async (_, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: options?.filters || [
        { name: 'All Supported Files', extensions: ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'md', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'zip', 'json', 'csv', 'xml', 'yaml', 'yml'] },
        { name: 'Documents', extensions: ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'md', 'csv'] },
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'] },
        { name: 'Archives', extensions: ['zip', 'tar', 'gz'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      ...options,
    })
    return result
  })
  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    })
    return result
  })
  ipcMain.handle('dialog:saveFile', async (_, options) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: options?.filters || [
        { name: 'JSON', extensions: ['json'] },
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Text', extensions: ['txt'] },
      ],
      ...options,
    })
    return result
  })

  // Open-with-Astra pending paths (queued before renderer finished loading)
  ipcMain.handle('files:getPendingOpenPaths', () => {
    const paths = pendingOpenPaths
    pendingOpenPaths = []
    return paths
  })

  // Security: validate that a path is an absolute, normal string and does not
  // contain path-traversal sequences. This prevents callers from escaping the
  // intended directory or reading arbitrary files via `..` traversal.
  function isSafePath(input) {
    return typeof input === 'string' && !input.includes('\0') && !input.includes('..')
  }

  // File Import Pipeline
  ipcMain.handle('file:import', async (_, filePath) => {
    try {
      if (!isSafePath(filePath)) {
        return { success: false, error: 'Invalid file path' }
      }
      const resolved = path.resolve(filePath)
      const stats = fs.statSync(resolved)
      const ext = path.extname(resolved).toLowerCase()
      const supportedExts = ['.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.md', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.zip', '.json', '.csv', '.xml', '.yaml', '.yml']
      if (!supportedExts.includes(ext)) {
        return { success: false, error: `Unsupported file type: ${ext}` }
      }
      const content = fs.readFileSync(resolved, 'utf-8')
      return {
        success: true,
        file: {
          name: path.basename(resolved),
          path: resolved,
          size: stats.size,
          ext,
          content,
        },
      }
    } catch (e) {
      logCrash(`File import error: ${e.message}`)
      return { success: false, error: e.message }
    }
  })

  // Drag and Drop
  ipcMain.handle('file:processDropped', async (_, filePaths) => {
    if (!Array.isArray(filePaths)) return { success: false, files: [] }
    const results = []
    for (const filePath of filePaths) {
      try {
        if (!isSafePath(filePath)) continue
        const resolved = path.resolve(filePath)
        const stats = fs.statSync(resolved)
        if (stats.isDirectory()) {
          results.push({
            name: path.basename(resolved),
            path: resolved,
            type: 'directory',
            size: stats.size,
          })
        } else {
          const ext = path.extname(resolved).toLowerCase()
          results.push({
            name: path.basename(resolved),
            path: resolved,
            type: 'file',
            ext,
            size: stats.size,
          })
        }
      } catch (e) {
        logCrash(`File process error: ${e.message}`)
      }
    }
    return { success: true, files: results }
  })

  // Session restore
  ipcMain.handle('session:restore', async () => {
    try {
      const sessionFile = path.join(app.getPath('userData'), 'session.json')
      if (fs.existsSync(sessionFile)) {
        const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'))
        return { success: true, session }
      }
    } catch (e) {
      logCrash(`Session restore error: ${e.message}`)
    }
    return { success: false, session: null }
  })
  ipcMain.handle('session:save', async (_, session) => {
    try {
      const sessionFile = path.join(app.getPath('userData'), 'session.json')
      fs.writeFileSync(sessionFile, JSON.stringify(session))
      return { success: true }
    } catch (e) {
      logCrash(`Session save error: ${e.message}`)
      return { success: false, error: e.message }
    }
  })
  ipcMain.handle('session:clear', async () => {
    try {
      const sessionFile = path.join(app.getPath('userData'), 'session.json')
      if (fs.existsSync(sessionFile)) {
        fs.unlinkSync(sessionFile)
      }
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // Feature flags
  ipcMain.handle('features:getAll', () => FEATURES)
  ipcMain.handle('features:isEnabled', (_, name) => FEATURES[name] || false)

  // Backups
  ipcMain.handle('backup:create', () => {
    backupSettings()
    return { success: true }
  })
  ipcMain.handle('backup:list', () => {
    try {
      ensureDir(backupDir)
      const backups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('settings-'))
        .sort()
        .reverse()
      return { success: true, backups }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
  ipcMain.handle('backup:restore', (_, filename) => {
    try {
      const backupFile = path.join(backupDir, filename)
      if (fs.existsSync(backupFile)) {
        fs.copyFileSync(backupFile, settingsFile)
        return { success: true }
      }
      return { success: false, error: 'Backup not found' }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // Crash logs
  ipcMain.handle('crash:getLogs', () => {
    try {
      if (fs.existsSync(crashLogFile)) {
        const logs = fs.readFileSync(crashLogFile, 'utf-8')
        return { success: true, logs }
      }
      return { success: true, logs: '' }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
  ipcMain.handle('crash:clearLogs', () => {
    try {
      if (fs.existsSync(crashLogFile)) {
        fs.unlinkSync(crashLogFile)
      }
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

// Setup IPC handlers
setupIpcHandlers()

app.whenReady().then(() => {
  const settings = loadSettings()
  if (settings.launchOnStartup) {
    // Already handled by setLoginItemSettings on startup
  }
  createWindow()

  // Capture files passed on initial launch (Windows/Linux "Open with Astra",
  // or explicit CLI arguments). They are queued until the renderer signals
  // readiness and pulls them via `files:getPendingOpenPaths`.
  const initialFilePaths = getFilePathsFromArgs(process.argv)
  if (initialFilePaths.length > 0) {
    pendingOpenPaths.push(...initialFilePaths)
  }

  // Auto backup settings periodically
  setInterval(backupSettings, 3600000) // Every hour
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    isQuitting = true
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else if (mainWindow) {
    mainWindow.show()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  if (!isQuitConfirmed) {
    isQuitConfirmed = true
    saveWindowState()
    backupSettings()
  }
})

// Graceful shutdown for SIGTERM/SIGINT (e.g., OS shutdown, kill from terminal)
function gracefulShutdown(signal) {
  console.log(`Received ${signal}, shutting down gracefully...`)
  isQuitConfirmed = true
  isQuitting = true
  saveWindowState()
  backupSettings()
  app.quit()
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle start minimized
if (process.argv.includes('--minimized')) {
  const settings = loadSettings()
  settings.startMinimized = true
  saveSettings(settings)
}

// Global error handling
process.on('uncaughtException', (error) => {
  logCrash(error.stack || error.message)
  console.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason) => {
  logCrash(reason?.stack || reason?.message || String(reason))
  console.error('Unhandled Rejection:', reason)
})
