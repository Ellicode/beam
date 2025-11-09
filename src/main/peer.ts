import { BrowserWindow, ipcMain } from 'electron'
import { promises as fs } from 'fs'

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

// Track active transfers
const activeTransfers = new Map<string, FileTransferProgress>()

// Chunk size for file transfer (256 KB)
const CHUNK_SIZE = 256 * 1024

/**
 * Notify renderer process of transfer progress
 */
function notifyProgress(transferId: string, progress: FileTransferProgress): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('file-transfer:progress', transferId, progress)
  })
}

/**
 * Setup IPC handlers for peer-to-peer file transfer
 */
export function setupPeerTransferIPC(): void {
  // Handler to initiate file transfer
  ipcMain.handle(
    'peer:transfer-files',
    async (_, request: FileTransferRequest): Promise<string> => {
      const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      try {
        // Start the transfer process
        await initiateFileTransfer(transferId, request)
        return transferId
      } catch (error) {
        console.error('Failed to initiate file transfer:', error)
        throw error
      }
    }
  )

  // Handler to get transfer status
  ipcMain.handle('peer:get-transfer-status', async (_, transferId: string) => {
    return activeTransfers.get(transferId)
  })

  // Handler to cancel transfer
  ipcMain.handle('peer:cancel-transfer', async (_, transferId: string) => {
    const transfer = activeTransfers.get(transferId)
    if (transfer) {
      transfer.status = 'error'
      transfer.error = 'Cancelled by user'
      notifyProgress(transferId, transfer)
      activeTransfers.delete(transferId)
    }
  })
}

/**
 * Initiate a file transfer to a peer
 */
async function initiateFileTransfer(
  transferId: string,
  request: FileTransferRequest
): Promise<void> {
  for (const file of request.files) {
    const progress: FileTransferProgress = {
      fileName: file.name,
      fileSize: file.size,
      bytesTransferred: 0,
      percentage: 0,
      status: 'pending'
    }

    activeTransfers.set(`${transferId}_${file.name}`, progress)
    notifyProgress(`${transferId}_${file.name}`, progress)

    try {
      // Update status to transferring
      progress.status = 'transferring'
      notifyProgress(`${transferId}_${file.name}`, progress)

      // Send file to peer
      await sendFileToPeer(file, request.targetAddress, request.targetPort, (bytes) => {
        progress.bytesTransferred = bytes
        progress.percentage = Math.round((bytes / file.size) * 100)
        notifyProgress(`${transferId}_${file.name}`, progress)
      })

      // Mark as completed
      progress.status = 'completed'
      progress.percentage = 100
      notifyProgress(`${transferId}_${file.name}`, progress)
    } catch (error) {
      progress.status = 'error'
      progress.error = error instanceof Error ? error.message : 'Unknown error'
      notifyProgress(`${transferId}_${file.name}`, progress)
      console.error(`Failed to transfer ${file.name}:`, error)
    }
  }
}

/**
 * Send a file to a peer via HTTP POST (simple approach)
 * In a full WebRTC implementation, this would use data channels
 */
async function sendFileToPeer(
  file: { name: string; path: string; size: number },
  _targetAddress: string,
  _targetPort: number,
  onProgress: (bytes: number) => void
): Promise<void> {
  // Read file in chunks
  const fileHandle = await fs.open(file.path, 'r')
  const buffer = Buffer.allocUnsafe(CHUNK_SIZE)
  let bytesRead = 0

  // Simulate sending chunks (in real implementation, this would go through WebRTC data channel)
  while (bytesRead < file.size) {
    const { bytesRead: chunkSize } = await fileHandle.read(buffer, 0, CHUNK_SIZE, bytesRead)

    if (chunkSize === 0) break

    bytesRead += chunkSize
    onProgress(bytesRead)

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 50))

    // Here you would send the chunk via WebRTC data channel
    // For now, we're just simulating the transfer
    // await sendChunkViaPeer(buffer.slice(0, chunkSize), targetAddress, targetPort)
  }

  await fileHandle.close()
}

/**
 * Setup HTTP server to receive files from peers
 * This is a placeholder - in production, use WebRTC data channels
 */
export function setupFileReceiver(port: number): void {
  // This would setup an HTTP server or WebRTC data channel listener
  // to receive incoming file transfers
  console.log(`File receiver would listen on port ${port}`)
}
