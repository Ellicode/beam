import { ElectronAPI } from '@electron-toolkit/preload'

export interface Settings {
  transferOnDrop: boolean
  deviceName: string
  downloadPath: string
  superSecretPassword?: string
  passwordSalt?: string
  authKey?: string
  useHotCorners?: boolean
  hotCornerPosition?: { x: number; y: number }
  hotCornerDisplayIndex?: number
  hotCornerTriggerTimeoutMs?: number
  savedDevices?: Array<{ name: string; address: string; port: number; authKey?: string }>
}

export interface OverlayDisplayInfo {
  id: number
  index: number
  name: string
  isPrimary: boolean
  internal: boolean
  scaleFactor: number
  workArea: { x: number; y: number; width: number; height: number }
}

export interface SettingsAPI {
  load: () => Promise<Settings>
  save: (settings: Settings) => Promise<Settings>
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<Settings>
  selectDownloadPath: () => Promise<string | null>
  setPassword: (password: string) => Promise<boolean>
  verifyPassword: (password: string) => Promise<boolean>
  hasPassword: () => Promise<boolean>
  getAuthKey: (password: string) => Promise<string>
  onChanged: (callback: () => void) => () => void
  removePassword: () => Promise<Settings>
}

export interface FileAPI {
  startDrag: (files: Array<string>) => void
  getThumbnail: (filePath: string) => Promise<string | null>
  getPathForFile: (file: File) => string
  tryQuickLook: (filePath: string) => Promise<void>
}

export interface BonjourAPI {
  publish: (deviceName: string) => Promise<void>
  unpublishAll: () => Promise<void>
  restart: () => void
  findServices: () => Promise<Array<{ name: string; address: string; port: number }>>
  stopDiscovery: () => Promise<void>
  onServiceUp: (
    callback: (service: { name: string; address: string; port: number }) => void
  ) => () => void
  onServiceDown: (callback: (service: { name: string; port: number }) => void) => () => void
  getPublishedService: () => Promise<{
    published: boolean
    name?: string
    type?: string
    port?: number
  }>
}

export interface FileTransferProgress {
  fileName: string
  fileSize: number
  bytesTransferred: number
  percentage: number
  status: 'pending' | 'transferring' | 'completed' | 'error'
  error?: string
}

export interface FileTransferRequest {
  files: Array<{ name: string; path: string; size: number }>
  targetAddress: string
  targetPort: number
  authKey?: string
}

export interface TransferAPI {
  sendFiles: (request: FileTransferRequest) => Promise<string>
  checkAuthRequired: (address: string, port: number) => Promise<boolean>
  verifyPassword: (address: string, port: number, password: string) => Promise<boolean>
  getStatus: (transferId: string) => Promise<FileTransferProgress | undefined>
  cancel: (transferId: string) => Promise<void>
  receiveFile: (fileName: string, fileData: string) => Promise<string>
  receiveFileChunk: (
    fileName: string,
    chunkData: string,
    chunkIndex: number,
    totalChunks: number
  ) => Promise<void>
  onProgress: (callback: (transferId: string, progress: FileTransferProgress) => void) => () => void
  onReceiveProgress: (
    callback: (data: { fileName: string; percentage: number; status: string }) => void
  ) => () => void
  onReceiveComplete: (
    callback: (data: { fileName: string; filePath: string; fileSize?: number }) => void
  ) => () => void
}

export interface OverlayAPI {
  startGlobalMouseTracking: () => void
  stopGlobalMouseTracking: () => void
  onGlobalMouseMove: (callback: (position: { x: number; y: number }) => void) => () => void
  setPosition: (position: { x: number; y: number }) => void
  getSize: () => Promise<{ width: number; height: number; x: number; y: number }>
  getPrimaryBounds: () => Promise<{ width: number; height: number; x: number; y: number }>
  getDisplays: () => Promise<OverlayDisplayInfo[]>
  setDisplay: (
    displayIndex: number
  ) => Promise<{ width: number; height: number; x: number; y: number }>
  onBoundsChanged: (
    callback: (bounds: { width: number; height: number; x: number; y: number }) => void
  ) => () => void
  summonMainWindowAt: (position: { x: number; y: number }) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      settings: SettingsAPI
      file: FileAPI
      bonjour: BonjourAPI
      transfer: TransferAPI
      overlay: OverlayAPI
    }
  }
}
