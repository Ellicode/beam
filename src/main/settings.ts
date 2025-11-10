import { app, ipcMain, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { watch } from 'fs'
import os from 'os'
import { generateSalt, hashPassword, verifyPassword, generateAuthKey } from './crypto'

const hostname = os.hostname()

export interface Settings {
  transferOnDrop: boolean
  deviceName: string
  downloadPath: string
  superSecretPassword?: string
  passwordSalt?: string
  authKey?: string
  savedDevices?: Array<{ name: string; address: string; port: number; authKey?: string }>
}

const defaultSettings: Settings = {
  transferOnDrop: false,
  deviceName: hostname,
  downloadPath: app.getPath('downloads'),
  savedDevices: []
}

let settingsCache: Settings | null = null
let fileWatcher: ReturnType<typeof watch> | null = null

function notifySettingsChanged(): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('settings:changed')
  })
}

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

async function ensureSettingsFile(): Promise<void> {
  const settingsPath = getSettingsPath()
  console.log(settingsPath)

  try {
    await fs.access(settingsPath)
  } catch {
    await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2))
  }
}

export async function loadSettings(): Promise<Settings> {
  await ensureSettingsFile()
  const settingsPath = getSettingsPath()
  const data = await fs.readFile(settingsPath, 'utf-8')
  settingsCache = { ...defaultSettings, ...JSON.parse(data) }
  return settingsCache as Settings
}

export async function saveSettings(settings: Settings): Promise<void> {
  const settingsPath = getSettingsPath()
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2))
  settingsCache = settings
  notifySettingsChanged()
}

export async function updateSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<Settings> {
  const settings = settingsCache || (await loadSettings())
  settings[key] = value
  await saveSettings(settings)
  return { ...settings }
}

export function setupSettingsIPC(): void {
  ipcMain.handle('settings:load', async () => {
    return await loadSettings()
  })

  ipcMain.handle('settings:save', async (_, settings: Settings) => {
    await saveSettings(settings)
    return settings
  })

  ipcMain.handle('settings:update', async (_, key: keyof Settings, value: unknown) => {
    return await updateSetting(key, value as Settings[typeof key])
  })

  ipcMain.handle('settings:selectDownloadPath', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Download Folder',
      buttonLabel: 'Select Folder'
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0]
      await updateSetting('downloadPath', selectedPath)
      return selectedPath
    }

    return null
  })

  // Set up password
  ipcMain.handle('settings:set-password', async (_, password: string) => {
    const settings = await loadSettings()
    const salt = generateSalt()
    const hashedPassword = hashPassword(password, salt)
    const authKey = generateAuthKey(password)

    settings.superSecretPassword = hashedPassword
    settings.passwordSalt = salt
    settings.authKey = authKey

    await saveSettings(settings)
    return true
  })

  // Verify password
  ipcMain.handle('settings:verifyPassword', async (_, password: string) => {
    const settings = settingsCache || (await loadSettings())

    if (!settings.superSecretPassword || !settings.passwordSalt) {
      return false
    }

    return verifyPassword(password, settings.passwordSalt, settings.superSecretPassword)
  })

  // Check if password is set
  ipcMain.handle('settings:hasPassword', async () => {
    const settings = settingsCache || (await loadSettings())
    return !!(settings.superSecretPassword && settings.passwordSalt)
  })

  // Get auth key for current password
  ipcMain.handle('settings:getAuthKey', async (_, password: string) => {
    const settings = settingsCache || (await loadSettings())

    if (!settings.superSecretPassword || !settings.passwordSalt) {
      throw new Error('No password set')
    }

    const isValid = verifyPassword(password, settings.passwordSalt, settings.superSecretPassword)
    if (!isValid) {
      throw new Error('Invalid password')
    }

    return generateAuthKey(password)
  })

  // Set up file watcher
  const settingsPath = getSettingsPath()
  if (fileWatcher) {
    fileWatcher.close()
  }

  fileWatcher = watch(settingsPath, async (eventType) => {
    if (eventType === 'change') {
      // Reload settings and notify all windows
      await loadSettings()
      notifySettingsChanged()
    }
  })
}
