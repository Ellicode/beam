import { BrowserWindow, nativeTheme, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 250,
    height: 250,
    show: false,
    resizable: false,
    minimizable: false,
    titleBarStyle: 'hidden',
    vibrancy: 'fullscreen-ui', // on MacOS
    backgroundMaterial: 'acrylic', // on Windows 11
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (is.dev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

export function createSettingsWindow(): BrowserWindow {
  const settingsWindow = new BrowserWindow({
    width: 600,
    height: 500,
    show: false,
    resizable: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#171717' : '#ffffff',
    titleBarStyle: 'hidden',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  settingsWindow.on('ready-to-show', () => {
    settingsWindow.show()
  })

  settingsWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/settings')
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'settings'
    })
  }

  return settingsWindow
}

export function createAddDeviceModal(mainWindow?: BrowserWindow): BrowserWindow {
  const addDeviceModal = new BrowserWindow({
    width: 400,
    height: 300,
    parent: mainWindow || BrowserWindow.getFocusedWindow() || undefined,
    modal: true,
    show: false,
    resizable: false,
    titleBarStyle: 'hidden',
    vibrancy: 'fullscreen-ui', // on MacOS
    backgroundMaterial: 'acrylic', // on Windows 11
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  addDeviceModal.on('ready-to-show', () => {
    addDeviceModal.show()
  })

  addDeviceModal.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // press esc to close the modal
  addDeviceModal.webContents.on('before-input-event', (_, input) => {
    if (input.key === 'Escape') {
      addDeviceModal.close()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    addDeviceModal.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/add-device')
  } else {
    addDeviceModal.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'add-device'
    })
  }

  return addDeviceModal
}
