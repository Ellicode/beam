import { BrowserWindow, nativeTheme, shell, screen } from 'electron'
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

    ...(process.platform !== 'darwin'
      ? {
          titleBarOverlay: {
            color: '#00000000',
            symbolColor: nativeTheme.shouldUseDarkColors ? '#ffffff' : '#000000',
            height: 32
          }
        }
      : {}),

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
    mainWindow.setAlwaysOnTop(true)
    // if (is.dev) {
    //   mainWindow.webContents.openDevTools({ mode: 'detach' })
    // }
  })

  mainWindow.on('close', (event) => {
    event.preventDefault()
    mainWindow.hide()
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

export function createOverlayWindow(): BrowserWindow {
  const screenSize = {
    width: screen.getPrimaryDisplay().workAreaSize.width,
    height: screen.getPrimaryDisplay().workAreaSize.height
  }

  const overlayWindow = new BrowserWindow({
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    width: screenSize.width,
    height: screenSize.height,
    acceptFirstMouse: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  overlayWindow.on('ready-to-show', () => {
    overlayWindow.show()
  })
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setIgnoreMouseEvents(true, { forward: true }) // Let clicks pass through

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/overlay')
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'overlay'
    })
  }

  return overlayWindow
}

export function createSettingsWindow(): BrowserWindow {
  const settingsWindow = new BrowserWindow({
    width: 600,
    height: 500,
    show: false,
    resizable: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#171717' : '#ffffff',
    titleBarStyle: 'hidden',

    ...(process.platform !== 'darwin'
      ? {
          titleBarOverlay: {
            color: '#00000000',
            symbolColor: nativeTheme.shouldUseDarkColors ? '#ffffff' : '#000000',
            height: 32
          }
        }
      : {}),
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

    ...(process.platform !== 'darwin'
      ? {
          titleBarOverlay: {
            color: '#00000000',
            symbolColor: nativeTheme.shouldUseDarkColors ? '#ffffff' : '#000000',
            height: 32
          }
        }
      : {}),
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

export function createPasswordSetupModal(parentWindow?: BrowserWindow): BrowserWindow {
  const passwordModal = new BrowserWindow({
    width: 450,
    height: 350,
    parent: parentWindow || BrowserWindow.getFocusedWindow() || undefined,
    modal: true,
    show: false,
    resizable: false,
    titleBarStyle: 'hidden',

    ...(process.platform !== 'darwin'
      ? {
          titleBarOverlay: {
            color: '#00000000',
            symbolColor: nativeTheme.shouldUseDarkColors ? '#ffffff' : '#000000',
            height: 32
          }
        }
      : {}),
    vibrancy: 'fullscreen-ui', // on MacOS
    backgroundMaterial: 'acrylic', // on Windows 11
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  passwordModal.on('ready-to-show', () => {
    passwordModal.show()
  })

  passwordModal.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Press esc to close the modal
  passwordModal.webContents.on('before-input-event', (_, input) => {
    if (input.key === 'Escape') {
      passwordModal.close()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    passwordModal.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/password-setup')
  } else {
    passwordModal.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'password-setup'
    })
  }

  return passwordModal
}

export function createAboutWindow(): BrowserWindow {
  const aboutWindow = new BrowserWindow({
    width: 300,
    height: 400,
    show: false,
    resizable: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#171717' : '#ffffff',
    titleBarStyle: 'hidden',
    ...(process.platform !== 'darwin'
      ? {
          titleBarOverlay: {
            color: '#00000000',
            symbolColor: nativeTheme.shouldUseDarkColors ? '#ffffff' : '#000000',
            height: 32
          }
        }
      : {}),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  aboutWindow.on('ready-to-show', () => {
    aboutWindow.show()
  })

  aboutWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    aboutWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/about')
  } else {
    aboutWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'about'
    })
  }

  return aboutWindow
}
