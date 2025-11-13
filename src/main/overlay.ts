import { BrowserWindow, ipcMain, screen } from 'electron'
import { createOverlayWindow } from './windows'
import { loadSettings, updateSetting } from './settings'

interface OverlaySetupOptions {
  ensureMainWindow: () => BrowserWindow
  settingsReady: Promise<void>
}

interface OverlayBounds {
  width: number
  height: number
  x: number
  y: number
}

interface OverlayDisplayInfo {
  id: number
  index: number
  name: string
  isPrimary: boolean
  internal: boolean
  scaleFactor: number
  workArea: { x: number; y: number; width: number; height: number }
}

let overlayWindow: BrowserWindow | null = null
let overlayMouseTrackingTimer: NodeJS.Timeout | null = null
let lastCursorPoint: { x: number; y: number } | null = null
let currentOverlayDisplayIndex = 0
let isInitialized = false

function stopOverlayMouseTracking(): void {
  if (overlayMouseTrackingTimer) {
    clearInterval(overlayMouseTrackingTimer)
    overlayMouseTrackingTimer = null
  }
  lastCursorPoint = null
}

function sendCursorPosition(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    stopOverlayMouseTracking()
    return
  }

  const { webContents } = overlayWindow
  if (webContents.isDestroyed()) {
    stopOverlayMouseTracking()
    return
  }

  const point = screen.getCursorScreenPoint()

  if (lastCursorPoint && lastCursorPoint.x === point.x && lastCursorPoint.y === point.y) {
    return
  }

  lastCursorPoint = point
  webContents.send('overlay:mouse-move', point)
}

function startOverlayMouseTracking(): void {
  if (overlayMouseTrackingTimer) {
    return
  }

  sendCursorPosition()
  overlayMouseTrackingTimer = setInterval(sendCursorPosition, 16)
}

function getDisplayLabel(display: Electron.Display, index: number): string {
  const potentialLabel = (display as Partial<{ label?: string }>).label
  if (typeof potentialLabel === 'string' && potentialLabel.trim().length > 0) {
    return potentialLabel
  }

  if (display.internal) {
    return 'Built-in Display'
  }

  const primaryId = screen.getPrimaryDisplay().id
  if (display.id === primaryId) {
    return 'Primary Display'
  }

  return `Display ${index + 1}`
}

function getOverlayDisplays(): OverlayDisplayInfo[] {
  const primaryId = screen.getPrimaryDisplay().id
  return screen.getAllDisplays().map((display, index) => ({
    id: display.id,
    index,
    name: getDisplayLabel(display, index),
    isPrimary: display.id === primaryId,
    internal: display.internal,
    scaleFactor: display.scaleFactor,
    workArea: {
      x: display.workArea.x,
      y: display.workArea.y,
      width: display.workArea.width,
      height: display.workArea.height
    }
  }))
}

function emitOverlayBounds(bounds: OverlayBounds): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return
  }

  const { webContents } = overlayWindow
  if (!webContents.isDestroyed()) {
    webContents.send('overlay:bounds-changed', bounds)
  }
}

function applyOverlayDisplay(targetIndex?: number): OverlayBounds | null {
  const displays = getOverlayDisplays()
  if (displays.length === 0) {
    return null
  }

  const maxIndex = displays.length - 1
  const rawIndex =
    typeof targetIndex === 'number' && Number.isFinite(targetIndex)
      ? Math.round(targetIndex)
      : currentOverlayDisplayIndex

  const clampedIndex = Math.min(Math.max(rawIndex, 0), maxIndex)
  const targetDisplay = displays[clampedIndex]

  currentOverlayDisplayIndex = clampedIndex

  const bounds: OverlayBounds = {
    width: targetDisplay.workArea.width,
    height: targetDisplay.workArea.height,
    x: targetDisplay.workArea.x,
    y: targetDisplay.workArea.y
  }

  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return bounds
  }

  overlayWindow.setBounds(
    {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    },
    false
  )
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setIgnoreMouseEvents(true, { forward: true })

  emitOverlayBounds(bounds)

  return bounds
}

async function applyOverlayDisplayFromSettings(): Promise<void> {
  try {
    const settings = await loadSettings()
    const applied = applyOverlayDisplay(settings.hotCornerDisplayIndex)
    if (!applied) {
      applyOverlayDisplay()
    }
  } catch (error) {
    console.error('Failed to apply overlay display from settings:', error)
  }
}

async function ensureOverlayDisplayIndexInRange(): Promise<void> {
  const displays = getOverlayDisplays()
  if (displays.length === 0) {
    return
  }

  const maxIndex = displays.length - 1
  if (currentOverlayDisplayIndex > maxIndex) {
    currentOverlayDisplayIndex = maxIndex
    applyOverlayDisplay(currentOverlayDisplayIndex)
    try {
      await updateSetting('hotCornerDisplayIndex', currentOverlayDisplayIndex)
    } catch (error) {
      console.error('Failed to persist adjusted hot corner display index:', error)
    }
    return
  }

  applyOverlayDisplay(currentOverlayDisplayIndex)
}

function registerDisplayListeners(): void {
  const handleDisplayChange = (): void => {
    ensureOverlayDisplayIndexInRange().catch((error) => {
      console.error('Failed to respond to display change:', error)
    })
  }

  screen.on('display-added', handleDisplayChange)
  screen.on('display-removed', handleDisplayChange)
  screen.on('display-metrics-changed', handleDisplayChange)
}

function animateMainWindowToPosition(
  targetWindow: BrowserWindow,
  targetX: number,
  targetY: number
): void {
  const duration = 220
  const fps = 75
  const steps = Math.round((duration / 1000) * fps)
  const [startX, startY] = targetWindow.getPosition()
  const deltaX = targetX - startX
  const deltaY = targetY - startY

  let step = 0

  function springEase(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  const animate = (): void => {
    if (targetWindow.isDestroyed()) {
      return
    }

    step++
    const progress = springEase(step / steps)
    const newX = Math.round(startX + deltaX * progress)
    const newY = Math.round(startY + deltaY * progress)

    try {
      targetWindow.setPosition(newX, newY)
    } catch (error) {
      console.error('Error setting window position during animation:', error)
      return
    }

    if (step < steps) {
      setTimeout(animate, 1000 / fps)
    } else {
      try {
        if (!targetWindow.isDestroyed()) {
          targetWindow.setPosition(targetX, targetY)
        }
      } catch (error) {
        console.error('Error setting final window position:', error)
      }
    }
  }

  animate()
}

function registerIPCHandlers(options: OverlaySetupOptions): void {
  ipcMain.on('overlay:start-mouse-tracking', (event) => {
    overlayWindow = BrowserWindow.fromWebContents(event.sender) || overlayWindow
    startOverlayMouseTracking()
  })

  ipcMain.on('overlay:stop-mouse-tracking', () => {
    stopOverlayMouseTracking()
  })

  ipcMain.handle('overlay:get-size', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      const bounds = overlayWindow.getBounds()
      return { width: bounds.width, height: bounds.height, x: bounds.x, y: bounds.y }
    }

    const fallbackArea = screen.getPrimaryDisplay().workArea
    return {
      width: fallbackArea.width,
      height: fallbackArea.height,
      x: fallbackArea.x,
      y: fallbackArea.y
    }
  })

  ipcMain.handle('overlay:get-primary-bounds', () => {
    const workArea = screen.getPrimaryDisplay().workArea
    return {
      width: workArea.width,
      height: workArea.height,
      x: workArea.x,
      y: workArea.y
    }
  })

  ipcMain.handle('overlay:get-displays', () => {
    return getOverlayDisplays()
  })

  ipcMain.handle('overlay:set-display', (_, displayIndex: number) => {
    const applied = applyOverlayDisplay(displayIndex)
    if (applied) {
      return applied
    }

    const fallbackArea = screen.getPrimaryDisplay().workArea
    return {
      width: fallbackArea.width,
      height: fallbackArea.height,
      x: fallbackArea.x,
      y: fallbackArea.y
    }
  })

  ipcMain.on('overlay:summon-main-window-at', (_, data: { x: number; y: number }) => {
    const mainWindow = options.ensureMainWindow()
    mainWindow.setPosition(data.x, data.y)
    mainWindow.show()
    mainWindow.focus()
  })

  ipcMain.on('overlay:set-position', (_, data: { x: number; y: number }) => {
    const mainWindow = options.ensureMainWindow()

    const targetX = Math.round(Number(data.x) || 0)
    const targetY = Math.round(Number(data.y) || 0)

    if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
      console.error('Invalid target position:', data)
      return
    }

    mainWindow.show()
    mainWindow.focus()

    animateMainWindowToPosition(mainWindow, targetX, targetY)
  })
}

export function setupOverlay(options: OverlaySetupOptions): void {
  if (isInitialized) {
    return
  }

  isInitialized = true

  overlayWindow = createOverlayWindow()
  overlayWindow.on('closed', () => {
    overlayWindow = null
    stopOverlayMouseTracking()
  })

  registerDisplayListeners()
  registerIPCHandlers(options)

  applyOverlayDisplay()

  void options.settingsReady.then(() => applyOverlayDisplayFromSettings())
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow
}

export function shutdownOverlay(): void {
  stopOverlayMouseTracking()
  overlayWindow = null
}
