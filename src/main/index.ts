import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createAddDeviceModal, createMainWindow, createSettingsWindow } from './windows'
import { createAppMenu } from './menu'
import { loadSettings, setupSettingsIPC } from './settings'
import { setupFileIconIPC } from './fileIcons'
import { Bonjour } from 'bonjour-service'
import { setupBonjourIPC } from './bonjour'
import { startSignalingServer } from './signaling'
import { setupPeerTransferIPC, setupFileReceiver } from './peer'

let settingsWindow: BrowserWindow | null = null
let addDeviceWindow: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null

const bonjour = new Bonjour()
const PORT = 4000
const SIGNALING_PORT = 4001

function openSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }

  settingsWindow = createSettingsWindow()

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

function openAddDeviceWindow(): void {
  if (addDeviceWindow) {
    addDeviceWindow.focus()
    return
  }

  addDeviceWindow = createAddDeviceModal()

  addDeviceWindow.on('closed', () => {
    addDeviceWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Set up application menu
  const menu = createAppMenu(openSettingsWindow, openAddDeviceWindow)
  Menu.setApplicationMenu(menu)

  // Set up IPC handlers
  setupSettingsIPC()
  setupBonjourIPC(bonjour)
  setupFileIconIPC()
  setupPeerTransferIPC()

  // Start signaling server for WebRTC
  startSignalingServer(SIGNALING_PORT)

  // Start file receiver server
  setupFileReceiver(PORT)

  // IPC handlers
  ipcMain.on('ping', () => console.log('pong'))
  ipcMain.on('open-settings', openSettingsWindow)
  ipcMain.on('open-add-device', openAddDeviceWindow)
  ipcMain.on('close-add-device', () => {
    if (addDeviceWindow) {
      addDeviceWindow.close()
    }
  })

  // Create the main window first
  mainWindow = createMainWindow()

  ipcMain.handle('file:tryQuickLook', async (_, filePath: string) => {
    if (process.platform === 'darwin') {
      mainWindow?.previewFile(filePath)
    }
  })

  // Set up bonjour service asynchronously (don't block startup)
  setTimeout(async () => {
    const settings = await loadSettings()
    const deviceName =
      settings.deviceName + '#' + Math.floor(Math.random() * 1000) || 'Unknown device'
    console.log(`Publishing service: ${deviceName} on port ${PORT}`)
    bonjour.publish({ name: deviceName, type: 'file-transfer-app', port: PORT })
    console.log('Bonjour service published')
  }, 0)

  // Create the main window
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
      ipcMain.handle('file:tryQuickLook', async (_, filePath: string) => {
        if (process.platform === 'darwin') {
          mainWindow?.previewFile(filePath)
        }
      })
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
