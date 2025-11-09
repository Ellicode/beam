import { ElectronAPI } from '@electron-toolkit/preload'

export interface Settings {
  transferOnDrop: boolean
  deviceName?: string
  downloadPath?: string
  savedDevices?: Array<{ name: string; address: string; port: number }>
}

export interface SettingsAPI {
  load: () => Promise<Settings>
  save: (settings: Settings) => Promise<Settings>
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<Settings>
  selectDownloadPath: () => Promise<string | null>
  onChanged: (callback: () => void) => () => void
}

export interface FileAPI {
  getThumbnail: (filePath: string) => Promise<string | null>
  getPathForFile: (file: File) => string
  tryQuickLook: (filePath: string) => Promise<void>
}

export interface BonjourAPI {
  publish: (deviceName: string) => Promise<void>
  unpublishAll: () => Promise<void>
  findServices: () => Promise<Array<{ name: string; address: string; port: number }>>
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
}

export interface TransferAPI {
  sendFiles: (request: FileTransferRequest) => Promise<string>
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

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      settings: SettingsAPI
      file: FileAPI
      bonjour: BonjourAPI
      transfer: TransferAPI
    }
  }
}
