import { BrowserWindow, ipcMain } from 'electron'
import { createReadStream } from 'fs'
import path from 'path'
import { loadSettings } from './settings'
import { request as httpRequest } from 'http'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { generateAuthKey } from './crypto'

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
  // Handler to check if a peer requires authentication
  ipcMain.handle('peer:check-auth-required', async (_, address: string, port: number) => {
    return checkIfPeerRequiresAuth(address, port)
  })

  // Handler to verify a password with a peer
  ipcMain.handle(
    'peer:verify-password',
    async (_, address: string, port: number, password: string) => {
      return verifyPasswordWithPeer(address, port, password)
    }
  )

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
      await sendFileToPeer(
        file,
        request.targetAddress,
        request.targetPort,
        (bytes) => {
          progress.bytesTransferred = bytes
          progress.percentage = Math.round((bytes / file.size) * 100)
          notifyProgress(`${transferId}_${file.name}`, progress)
        },
        request.authKey
      )

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
 * Send a file to a peer via HTTP POST
 */
async function sendFileToPeer(
  file: { name: string; path: string; size: number },
  targetAddress: string,
  targetPort: number,
  onProgress: (bytes: number) => void,
  authKey?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
      'X-File-Size': file.size.toString()
    }

    // Include auth key if provided
    if (authKey) {
      headers['X-Auth-Key'] = authKey
    }

    const options = {
      hostname: targetAddress,
      port: targetPort,
      path: '/transfer',
      method: 'POST',
      headers
    }

    const req = httpRequest(options)

    let completed = false
    const finalize = (error?: Error): void => {
      if (completed) {
        return
      }
      completed = true
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    }

    req.on('response', (res) => {
      if (res.statusCode !== 200) {
        finalize(new Error(`Transfer failed with status ${res.statusCode}`))
        res.resume()
        return
      }
      res.on('data', () => {})
      res.on('end', () => finalize())
    })

    req.on('error', (error) => {
      finalize(error)
    })

    const readStream = createReadStream(file.path, { highWaterMark: CHUNK_SIZE })
    let bytesSent = 0

    readStream.on('data', (chunk) => {
      bytesSent += chunk.length
      onProgress(bytesSent)
      const canContinue = req.write(chunk)
      if (!canContinue) {
        readStream.pause()
      }
    })

    req.on('drain', () => {
      if (!readStream.destroyed) {
        readStream.resume()
      }
    })

    readStream.on('end', () => {
      req.end()
    })

    readStream.on('error', (error) => {
      req.destroy(error)
      finalize(error)
    })
  })
}

/**
 * Check if a peer requires authentication
 */
async function checkIfPeerRequiresAuth(address: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`Checking if peer ${address}:${port} requires auth...`)

    const options = {
      hostname: address,
      port: port,
      path: '/auth-status',
      method: 'GET',
      timeout: 3000
    }

    const req = httpRequest(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          console.log(`Peer ${address}:${port} auth status:`, response)
          resolve(response.requiresAuth === true)
        } catch (error) {
          console.error(`Failed to parse auth status from ${address}:${port}:`, error)
          resolve(false)
        }
      })
    })

    req.on('error', (error) => {
      console.error(`Error checking auth status for ${address}:${port}:`, error)
      resolve(false)
    })

    req.on('timeout', () => {
      console.log(`Timeout checking auth status for ${address}:${port}`)
      req.destroy()
      resolve(false)
    })

    req.end()
  })
}

/**
 * Verify a password with a peer by testing the auth key
 */
async function verifyPasswordWithPeer(
  address: string,
  port: number,
  password: string
): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`Verifying password with peer ${address}:${port}`)

    const authKey = generateAuthKey(password)

    const options = {
      hostname: address,
      port: port,
      path: '/verify-auth',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Key': authKey
      },
      timeout: 3000
    }

    const req = httpRequest(options, (res) => {
      if (res.statusCode === 200) {
        console.log(`Password verified successfully for ${address}:${port}`)
        resolve(true)
      } else {
        console.log(`Password verification failed for ${address}:${port}: status ${res.statusCode}`)
        resolve(false)
      }
    })

    req.on('error', (error) => {
      console.error(`Error verifying password for ${address}:${port}:`, error)
      resolve(false)
    })

    req.on('timeout', () => {
      console.log(`Timeout verifying password for ${address}:${port}`)
      req.destroy()
      resolve(false)
    })

    req.end()
  })
}

/**
 * Setup HTTP server to receive files from peers
 */
export function setupFileReceiver(port: number): void {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Handle auth status check
    if (req.method === 'GET' && req.url === '/auth-status') {
      try {
        const settings = await loadSettings()
        const requiresAuth = !!settings.authKey
        console.log(`Auth status check: requiresAuth = ${requiresAuth}`)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ requiresAuth }))
      } catch (error) {
        console.error('Error checking auth status:', error)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ requiresAuth: false }))
      }
      return
    }

    // Handle password verification
    if (req.method === 'POST' && req.url === '/verify-auth') {
      try {
        const settings = await loadSettings()
        const authKey = req.headers['x-auth-key'] as string | undefined

        if (!settings.authKey) {
          // No password set, verification succeeds
          console.log('Auth verification: no password set, allowing')
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ valid: true }))
          return
        }

        if (!authKey) {
          console.log('Auth verification: missing auth key')
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ valid: false }))
          return
        }

        if (authKey === settings.authKey) {
          console.log('Auth verification: valid auth key')
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ valid: true }))
        } else {
          console.log('Auth verification: invalid auth key')
          res.writeHead(403, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ valid: false }))
        }
      } catch (error) {
        console.error('Error verifying auth:', error)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ valid: false }))
      }
      return
    }

    // Handle file transfer
    if (req.method === 'POST' && req.url === '/transfer') {
      const fileName = decodeURIComponent(req.headers['x-file-name'] as string)
      const fileSize = parseInt(req.headers['x-file-size'] as string, 10)
      const authKey = req.headers['x-auth-key'] as string | undefined

      if (!fileName || !fileSize) {
        res.writeHead(400, { 'Content-Type': 'text/plain' })
        res.end('Missing file metadata')
        return
      }

      try {
        const settings = await loadSettings()

        // Verify authentication if this device has a password set
        if (settings.authKey) {
          if (!authKey) {
            console.log('Rejected file transfer: Missing authentication')
            res.writeHead(401, { 'Content-Type': 'text/plain' })
            res.end('Authentication required')
            return
          }

          // Verify the auth key matches this device's auth key
          if (authKey !== settings.authKey) {
            console.log('Rejected file transfer: Invalid authentication')
            res.writeHead(403, { 'Content-Type': 'text/plain' })
            res.end('Invalid authentication')
            return
          }

          console.log('File transfer authenticated successfully')
        }

        const downloadPath = settings.downloadPath
        const filePath = path.join(downloadPath, fileName)

        console.log(`Receiving file: ${fileName} (${fileSize} bytes) -> ${filePath}`)

        // Create write stream using fs.createWriteStream for proper buffering
        const { createWriteStream } = await import('fs')
        const writeStream = createWriteStream(filePath)
        let bytesReceived = 0

        req.on('data', (chunk: Buffer) => {
          bytesReceived += chunk.length

          // Notify progress
          const percentage = Math.round((bytesReceived / fileSize) * 100)
          BrowserWindow.getAllWindows().forEach((window) => {
            window.webContents.send('file-receive:progress', {
              fileName,
              fileSize,
              bytesReceived,
              percentage,
              status: 'receiving'
            })
          })
        })

        // Pipe the request to the write stream
        req.pipe(writeStream)

        writeStream.on('finish', () => {
          console.log(`File saved successfully: ${filePath} (${bytesReceived} bytes)`)

          // Notify completion
          BrowserWindow.getAllWindows().forEach((window) => {
            window.webContents.send('file-receive:complete', {
              fileName,
              filePath,
              fileSize: bytesReceived
            })
          })

          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end('File received successfully')
        })

        writeStream.on('error', (error) => {
          console.error('Error writing file:', error)
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end('Error writing file')
        })

        req.on('error', (error) => {
          console.error('Error receiving file:', error)
          writeStream.destroy()
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end('Error receiving file')
        })
      } catch (error) {
        console.error('Error saving file:', error)
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('Error saving file')
      }
      return
    }

    // Handle unknown routes
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  })

  server.listen(port, '0.0.0.0', () => {
    console.log(`File receiver listening on port ${port}`)
  })

  server.on('error', (error) => {
    console.error('File receiver server error:', error)
  })
}
