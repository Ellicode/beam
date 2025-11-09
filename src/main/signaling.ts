import { WebSocketServer, WebSocket } from 'ws'

interface SignalingMessage {
  type: 'offer' | 'answer' | 'signal' | 'ready' | 'join' | 'leave'
  from?: string
  to?: string
  signal?: string
  peerId?: string
}

export class SignalingServer {
  private wss: WebSocketServer | null = null
  private clients: Map<string, WebSocket> = new Map()
  private port: number

  constructor(port: number) {
    this.port = port
  }

  start(): void {
    if (this.wss) {
      console.log('Signaling server already running')
      return
    }

    this.wss = new WebSocketServer({ port: this.port })

    this.wss.on('listening', () => {
      console.log(`Signaling server listening on port ${this.port}`)
    })

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = this.generateClientId()
      this.clients.set(clientId, ws)

      console.log(`Client connected: ${clientId}`)

      // Send the client their ID
      ws.send(JSON.stringify({ type: 'ready', peerId: clientId }))

      ws.on('message', (data: Buffer) => {
        try {
          const message: SignalingMessage = JSON.parse(data.toString())
          this.handleMessage(clientId, message)
        } catch (error) {
          console.error('Failed to parse message:', error)
        }
      })

      ws.on('close', () => {
        this.clients.delete(clientId)
        console.log(`Client disconnected: ${clientId}`)
        this.broadcastPeerList()
      })

      ws.on('error', (error) => {
        console.error(`WebSocket error for ${clientId}:`, error)
      })

      // Broadcast updated peer list
      this.broadcastPeerList()
    })

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error)
    })
  }

  private handleMessage(fromClientId: string, message: SignalingMessage): void {
    switch (message.type) {
      case 'signal':
        // Forward signaling data to the target peer
        if (message.to && this.clients.has(message.to)) {
          const targetClient = this.clients.get(message.to)
          targetClient?.send(
            JSON.stringify({
              type: 'signal',
              from: fromClientId,
              signal: message.signal
            })
          )
        }
        break

      case 'join':
        // Peer is ready to connect
        this.broadcastPeerList()
        break

      default:
        console.log('Unknown message type:', message.type)
    }
  }

  private broadcastPeerList(): void {
    const peerList = Array.from(this.clients.keys())
    const message = JSON.stringify({ type: 'peers', peers: peerList })

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }

  private generateClientId(): string {
    return `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  stop(): void {
    if (!this.wss) return

    this.clients.forEach((client) => {
      client.close()
    })
    this.clients.clear()

    this.wss.close(() => {
      console.log('Signaling server stopped')
    })
    this.wss = null
  }

  getConnectedPeers(): string[] {
    return Array.from(this.clients.keys())
  }
}

// Global signaling server instance
let signalingServer: SignalingServer | null = null

export function startSignalingServer(port = 4001): SignalingServer {
  if (!signalingServer) {
    signalingServer = new SignalingServer(port)
  }
  signalingServer.start()
  return signalingServer
}

export function stopSignalingServer(): void {
  if (signalingServer) {
    signalingServer.stop()
    signalingServer = null
  }
}

export function getSignalingServer(): SignalingServer | null {
  return signalingServer
}
