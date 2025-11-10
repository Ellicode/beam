import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Settings } from '../main/settings'

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

// Custom APIs for renderer
const api = {
  settings: {
    load: (): Promise<Settings> => ipcRenderer.invoke('settings:load'),
    save: (settings: Settings): Promise<Settings> => ipcRenderer.invoke('settings:save', settings),
    update: <K extends keyof Settings>(key: K, value: Settings[K]): Promise<Settings> =>
      ipcRenderer.invoke('settings:update', key, value),
    selectDownloadPath: (): Promise<string | null> =>
      ipcRenderer.invoke('settings:selectDownloadPath'),
    setPassword: (password: string): Promise<boolean> =>
      ipcRenderer.invoke('settings:setPassword', password),
    verifyPassword: (password: string): Promise<boolean> =>
      ipcRenderer.invoke('settings:verifyPassword', password),
    hasPassword: (): Promise<boolean> => ipcRenderer.invoke('settings:hasPassword'),
    getAuthKey: (password: string): Promise<string> =>
      ipcRenderer.invoke('settings:getAuthKey', password),
    onChanged: (callback: () => void) => {
      ipcRenderer.on('settings:changed', callback)
      return () => ipcRenderer.removeListener('settings:changed', callback)
    }
  },
  file: {
    getThumbnail: (filePath: string): Promise<string | null> =>
      ipcRenderer.invoke('file:getThumbnail', filePath),
    getPathForFile: (file: File): string => webUtils.getPathForFile(file),
    tryQuickLook: (filePath: string): Promise<void> =>
      ipcRenderer.invoke('file:tryQuickLook', filePath)
  },
  bonjour: {
    publish: (deviceName: string): Promise<void> =>
      ipcRenderer.invoke('bonjour:publish', deviceName),
    unpublishAll: (): Promise<void> => ipcRenderer.invoke('bonjour:unpublishAll'),
    findServices: (): Promise<Array<{ name: string; address: string; port: number }>> =>
      ipcRenderer.invoke('bonjour:findServices'),
    getPublishedService: (): Promise<{
      published: boolean
      name?: string
      type?: string
      port?: number
    }> => ipcRenderer.invoke('bonjour:getPublishedService')
  },
  transfer: {
    sendFiles: (request: FileTransferRequest): Promise<string> =>
      ipcRenderer.invoke('peer:transfer-files', request),
    checkAuthRequired: (address: string, port: number): Promise<boolean> =>
      ipcRenderer.invoke('peer:check-auth-required', address, port),
    getStatus: (transferId: string): Promise<FileTransferProgress | undefined> =>
      ipcRenderer.invoke('peer:get-transfer-status', transferId),
    cancel: (transferId: string): Promise<void> =>
      ipcRenderer.invoke('peer:cancel-transfer', transferId),
    receiveFile: (fileName: string, fileData: string): Promise<string> =>
      ipcRenderer.invoke('peer:receive-file', fileName, fileData),
    receiveFileChunk: (
      fileName: string,
      chunkData: string,
      chunkIndex: number,
      totalChunks: number
    ): Promise<void> =>
      ipcRenderer.invoke('peer:receive-file-chunk', fileName, chunkData, chunkIndex, totalChunks),
    onProgress: (
      callback: (transferId: string, progress: FileTransferProgress) => void
    ): (() => void) => {
      const listener = (_: unknown, transferId: string, progress: FileTransferProgress): void => {
        callback(transferId, progress)
      }
      ipcRenderer.on('file-transfer:progress', listener)
      return () => ipcRenderer.removeListener('file-transfer:progress', listener)
    },
    onReceiveProgress: (
      callback: (data: { fileName: string; percentage: number; status: string }) => void
    ): (() => void) => {
      const listener = (
        _: unknown,
        data: { fileName: string; percentage: number; status: string }
      ): void => {
        callback(data)
      }
      ipcRenderer.on('file-receive:progress', listener)
      return () => ipcRenderer.removeListener('file-receive:progress', listener)
    },
    onReceiveComplete: (
      callback: (data: { fileName: string; filePath: string; fileSize?: number }) => void
    ): (() => void) => {
      const listener = (
        _: unknown,
        data: { fileName: string; filePath: string; fileSize?: number }
      ): void => {
        callback(data)
      }
      ipcRenderer.on('file-receive:complete', listener)
      return () => ipcRenderer.removeListener('file-receive:complete', listener)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
