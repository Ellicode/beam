import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import { join } from 'path'

const isMac = process.platform === 'darwin'

let tray: Tray | null = null

export function createSystemTray(getMainWindow: () => BrowserWindow | null): Tray {
  // Use a simple icon - you may want to replace this with a custom icon
  const icon = nativeImage.createEmpty()

  // Try to load icon from resources, fallback to empty
  try {
    const iconPath = isMac
      ? join(__dirname, '../../resources/tray_mac.png')
      : join(__dirname, '../../resources/tray_windows.png')
    const loadedIcon = nativeImage.createFromPath(iconPath)
    if (!loadedIcon.isEmpty()) {
      // Resize for tray (16x16 or 32x32 depending on platform)
      tray = new Tray(loadedIcon.resize({ width: 16, height: 16 }))
    } else {
      tray = new Tray(icon)
    }
  } catch {
    tray = new Tray(icon)
  }

  tray.setToolTip('Beam')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        const mainWindow = getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        destroyTray()
        app.exit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  // Click on tray icon to show/focus main window
  tray.on('click', () => {
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  return tray
}

export function getTray(): Tray | null {
  return tray
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
