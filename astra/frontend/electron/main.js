const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, Notification } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow = null
let tray = null
let isQuitting = false

// Store window state
const stateFile = path.join(app.getPath('userData'), 'window-state.json')

function loadWindowState() {
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf-8'))
    }
  } catch (e) {
    console.error('Failed to load window state:', e)
  }
  return { width: 1280, height: 800, x: undefined, y: undefined, isMaximized: false }
}

function saveWindowState() {
  if (!mainWindow) return
  try {
    const bounds = mainWindow.getBounds()
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized(),
    }
    fs.writeFileSync(stateFile, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save window state:', e)
  }
}

function createWindow() {
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
      sandbox: false,
    },
    frame: false,
    backgroundColor: '#0f172a',
    show: false,
    titleBarStyle: 'hidden',
  })

  if (windowState.isMaximized) {
    mainWindow.maximize()
  }

  // Load the app
  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximize-change', true)
    saveWindowState()
  })

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximize-change', false)
    saveWindowState()
  })

  mainWindow.on('resize', saveWindowState)
  mainWindow.on('move', saveWindowState)

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow.hide()
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

  // Create system tray
  createTray()
}

function createTray() {
  const iconSize = process.platform === 'darwin' ? 16 : 32
  const icon = nativeImage.createFromPath(path.join(__dirname, '../public/icon.png'))
  tray = new Tray(icon.resize({ width: iconSize, height: iconSize }))
  tray.setToolTip('Astra AI')

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
    { type: 'separator' },
    {
      label: 'New Conversation',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.webContents.send('command:new-conversation')
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// IPC Handlers
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.handle('window:close', () => {
  if (mainWindow) {
    mainWindow.hide()
  }
})
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized())
ipcMain.handle('window:isFocused', () => mainWindow?.isFocused())

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

ipcMain.handle('app:showNotification', (_, { title, body }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({ title, body, icon: path.join(__dirname, '../public/icon.png') })
    notification.on('click', () => {
      if (mainWindow) {
        mainWindow.show()
        mainWindow.focus()
      }
    })
    notification.show()
  }
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

ipcMain.handle('shell:openExternal', (_, url) => shell.openExternal(url))
ipcMain.handle('shell:showItemInFolder', (_, filePath) => shell.showItemInFolder(filePath))
ipcMain.handle('shell:openPath', (_, filePath) => shell.openPath(filePath))

ipcMain.handle('app:setLaunchOnStartup', (_, enable) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: app.getPath('exe'),
  })
})

ipcMain.handle('app:getLaunchOnStartup', () => {
  return app.getLoginItemSettings().openAtLogin
})

app.whenReady().then(createWindow)

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
  saveWindowState()
})

