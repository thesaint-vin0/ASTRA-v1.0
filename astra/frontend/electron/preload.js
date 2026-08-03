const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  isFocused: () => ipcRenderer.invoke('window:isFocused'),
  setAlwaysOnTop: (onTop) => ipcRenderer.invoke('window:setAlwaysOnTop', onTop),
  isAlwaysOnTop: () => ipcRenderer.invoke('window:isAlwaysOnTop'),
  setFullScreen: (fullscreen) => ipcRenderer.invoke('window:setFullScreen', fullscreen),
  isFullScreen: () => ipcRenderer.invoke('window:isFullScreen'),
  getAllDisplays: () => ipcRenderer.invoke('window:getAllDisplays'),
  getCurrentDisplay: () => ipcRenderer.invoke('window:getCurrentDisplay'),

  // Window events
  onMaximizeChange: (callback) => {
    const handler = (_, isMaximized) => callback(isMaximized)
    ipcRenderer.on('window:maximize-change', handler)
    return () => ipcRenderer.removeListener('window:maximize-change', handler)
  },
  onFullscreenChange: (callback) => {
    const handler = (_, isFullscreen) => callback(isFullscreen)
    ipcRenderer.on('window:fullscreen-change', handler)
    return () => ipcRenderer.removeListener('window:fullscreen-change', handler)
  },
  onCommand: (command, callback) => {
    const handler = () => callback()
    ipcRenderer.on(`command:${command}`, handler)
    return () => ipcRenderer.removeListener(`command:${command}`, handler)
  },
  onMemoryUsage: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('system:memory-usage', handler)
    return () => ipcRenderer.removeListener('system:memory-usage', handler)
  },

  // App
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getName: () => ipcRenderer.invoke('app:getName'),
  getPath: (name) => ipcRenderer.invoke('app:getPath', name),
  quit: () => ipcRenderer.invoke('app:quit'),
  restart: () => ipcRenderer.invoke('app:restart'),
  getSystemInfo: () => ipcRenderer.invoke('app:getSystemInfo'),

  // Taskbar / Dock
  setProgressBar: (progress) => ipcRenderer.invoke('app:setProgressBar', progress),
  setBadgeCount: (count) => ipcRenderer.invoke('app:setBadgeCount', count),
  getBadgeCount: () => ipcRenderer.invoke('app:getBadgeCount'),

  // Notifications
  showNotification: (opts) => ipcRenderer.invoke('app:showNotification', opts),
  onNotificationClicked: (callback) => {
    ipcRenderer.on('notification:clicked', () => callback())
    return () => ipcRenderer.removeAllListeners('notification:clicked')
  },

  // Shell
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  showItemInFolder: (filePath) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),

  // Launch on Startup
  setLaunchOnStartup: (enable, startMinimized) => ipcRenderer.invoke('app:setLaunchOnStartup', enable, startMinimized),
  getLaunchOnStartup: () => ipcRenderer.invoke('app:getLaunchOnStartup'),

  // Desktop shortcut
  createDesktopShortcut: () => ipcRenderer.invoke('app:createDesktopShortcut'),

// "Open with Astra" — files opened via OS file association / second instance
  onFileOpenWith: (callback) => {
    const handler = (_, filePaths) => callback(filePaths)
    ipcRenderer.on('file:open-with', handler)
    return () => ipcRenderer.removeListener('file:open-with', handler)
  },
  getPendingOpenPaths: () => ipcRenderer.invoke('files:getPendingOpenPaths'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),

  // File Dialogs
  openFileDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:saveFile', options),

  // File Import
  importFile: (filePath) => ipcRenderer.invoke('file:import', filePath),
  processDroppedFiles: (filePaths) => ipcRenderer.invoke('file:processDropped', filePaths),

  // Session
  restoreSession: () => ipcRenderer.invoke('session:restore'),
  saveSession: (session) => ipcRenderer.invoke('session:save', session),
  clearSession: () => ipcRenderer.invoke('session:clear'),

  // Feature Flags
  getFeatures: () => ipcRenderer.invoke('features:getAll'),
  isFeatureEnabled: (name) => ipcRenderer.invoke('features:isEnabled', name),

  // Backups
  createBackup: () => ipcRenderer.invoke('backup:create'),
  listBackups: () => ipcRenderer.invoke('backup:list'),
  restoreBackup: (filename) => ipcRenderer.invoke('backup:restore', filename),

// Crash logs
  getCrashLogs: () => ipcRenderer.invoke('crash:getLogs'),
  clearCrashLogs: () => ipcRenderer.invoke('crash:clearLogs'),

  // Auto-update
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  getUpdateStatus: () => ipcRenderer.invoke('update:getStatus'),
  setAutoUpdate: (enabled) => ipcRenderer.invoke('update:setAutoDownload', enabled),
  setUpdateChannel: (channel) => ipcRenderer.invoke('update:setChannel', channel),
  onUpdateStatus: (callback) => {
    const handler = (_, status) => callback(status)
    ipcRenderer.on('update:status', handler)
    return () => ipcRenderer.removeListener('update:status', handler)
  },
})
