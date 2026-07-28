const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  isFocused: () => ipcRenderer.invoke('window:isFocused'),

  // Window events
  onMaximizeChange: (callback) => {
    const handler = (_, isMaximized) => callback(isMaximized)
    ipcRenderer.on('window:maximize-change', handler)
    return () => ipcRenderer.removeListener('window:maximize-change', handler)
  },
  onCommand: (command, callback) => {
    const handler = () => callback()
    ipcRenderer.on(`command:${command}`, handler)
    return () => ipcRenderer.removeListener(`command:${command}`, handler)
  },

  // App
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getName: () => ipcRenderer.invoke('app:getName'),
  getPath: (name) => ipcRenderer.invoke('app:getPath', name),
  quit: () => ipcRenderer.invoke('app:quit'),
  restart: () => ipcRenderer.invoke('app:restart'),
  getSystemInfo: () => ipcRenderer.invoke('app:getSystemInfo'),

  // Notifications
  showNotification: (opts) => ipcRenderer.invoke('app:showNotification', opts),

  // Shell
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  showItemInFolder: (filePath) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),

  // Startup
  setLaunchOnStartup: (enable) => ipcRenderer.invoke('app:setLaunchOnStartup', enable),
  getLaunchOnStartup: () => ipcRenderer.invoke('app:getLaunchOnStartup'),
})

