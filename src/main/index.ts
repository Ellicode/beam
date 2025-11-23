import { app, BrowserWindow, ipcMain, Menu, nativeImage } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import {
  createAddDeviceModal,
  createMainWindow,
  createSettingsWindow,
  createPasswordSetupModal,
  createAboutWindow
} from './windows'
import { createAppMenu } from './menu'
import { loadSettings, setupSettingsIPC, ensureSettingsFile } from './settings'
import { setupFileIconIPC } from './fileIcons'
import { Bonjour } from 'bonjour-service'
import { setupBonjourIPC } from './bonjour'
import { startSignalingServer } from './signaling'
import { setupPeerTransferIPC, setupFileReceiver } from './peer'
import { setupOverlay, shutdownOverlay } from './overlay'
import { createSystemTray, destroyTray } from './tray'
import iconMac from '../../resources/icon_mac.png?asset'
import iconGeneric from '../../resources/icon.png?asset'

const icon = process.platform === 'darwin' ? iconMac : iconGeneric

let settingsWindow: BrowserWindow | null = null
let addDeviceWindow: BrowserWindow | null = null
let passwordSetupWindow: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null
let aboutWindow: BrowserWindow | null = null
const bonjour = new Bonjour()
const PORT = 4000
const SIGNALING_PORT = 4001

function bootstrapBackgroundServices(): void {
  setImmediate(() => {
    try {
      startSignalingServer(SIGNALING_PORT)
    } catch (error) {
      console.error('Failed to start signaling server', error)
    }

    try {
      setupFileReceiver(PORT)
    } catch (error) {
      console.error('Failed to start file receiver server', error)
    }
  })
}

function scheduleBonjourPublish(): void {
  setImmediate(async () => {
    try {
      const settings = await loadSettings()
      const baseName =
        settings.deviceName && settings.deviceName.trim().length > 0
          ? settings.deviceName
          : 'Unknown device'
      const deviceName = `${baseName}#${Math.floor(Math.random() * 1000)}`
      console.log(`Publishing service: ${deviceName} on port ${PORT}`)
      bonjour.publish({ name: deviceName, type: 'beam', port: PORT })
      console.log('Bonjour service published')
    } catch (error) {
      console.error('Failed to publish Bonjour service', error)
    }
  })
}

function restartBonjourServer(): void {
  try {
    console.log('Restarting Bonjour service...')
    bonjour.unpublishAll(() => {
      console.log('All Bonjour services unpublished')
      scheduleBonjourPublish()
    })
  } catch (error) {
    console.error('Failed to restart Bonjour service', error)
  }
}

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

function openAboutWindow(): void {
  if (aboutWindow) {
    aboutWindow.focus()
    return
  }

  aboutWindow = createAboutWindow()

  aboutWindow.on('closed', () => {
    aboutWindow = null
  })
}

function openPasswordSetupWindow(): void {
  if (passwordSetupWindow) {
    passwordSetupWindow.focus()
    return
  }

  passwordSetupWindow = createPasswordSetupModal(settingsWindow || undefined)

  passwordSetupWindow.on('closed', () => {
    passwordSetupWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Set app icon for macOS dock
  if (process.platform === 'darwin' && app.dock) {
    const appIcon = nativeImage.createFromPath(icon)
    app.dock.setIcon(appIcon)
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const settingsReady = ensureSettingsFile()

  // Set up application menu
  const menu = createAppMenu(openSettingsWindow, openAddDeviceWindow, openAboutWindow)
  Menu.setApplicationMenu(menu)

  // Set up IPC handlers
  settingsReady.then(() => setupSettingsIPC())
  setupBonjourIPC(bonjour)
  setupFileIconIPC()
  setupPeerTransferIPC()

  // IPC handlers
  ipcMain.on('ping', () => console.log('pong'))
  ipcMain.on('open-settings', openSettingsWindow)
  ipcMain.on('open-add-device', openAddDeviceWindow)
  ipcMain.on('open-password-setup', openPasswordSetupWindow)
  ipcMain.on('close-add-device', () => {
    if (addDeviceWindow) {
      addDeviceWindow.close()
    }
  })
  ipcMain.on('close-password-setup', () => {
    if (passwordSetupWindow) {
      passwordSetupWindow.close()
    }
  })
  ipcMain.on('restart-bonjour-server', () => {
    restartBonjourServer()
  })
  ipcMain.on('close-active-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      win.close()
    }
  })
  setupOverlay({
    ensureMainWindow: () => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        mainWindow = createMainWindow()
      }
      return mainWindow
    },
    settingsReady
  })
  // Create the main window first
  mainWindow = createMainWindow()

  // Create system tray
  createSystemTray(() => mainWindow)

  ipcMain.handle('file:tryQuickLook', async (_, filePath: string) => {
    if (process.platform === 'darwin') {
      mainWindow?.previewFile(filePath)
    }
  })
  ipcMain.on('file:ondragstart', async (event, files: string[]) => {
    event.preventDefault()
    const fileThumbnail = await nativeImage.createThumbnailFromPath(files[0], {
      width: 64,
      height: 64
    })
    const icon = fileThumbnail.isEmpty() ? undefined : fileThumbnail
    event.sender.startDrag({
      file: files[0],
      files: files,
      icon: icon ?? ''
    })
  })
  settingsReady
    .then(() => {
      scheduleBonjourPublish()
    })
    .catch((error) => {
      console.error('Failed to initialize settings file', error)
    })
    .finally(() => {
      bootstrapBackgroundServices()
    })

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
    destroyTray()
    shutdownOverlay()
    app.quit()
  }
})
