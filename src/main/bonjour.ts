import { Bonjour, Service, Browser } from 'bonjour-service'
import { ipcMain, BrowserWindow } from 'electron'
const PORT = 4000
const SERVICE_TYPE = 'file-transfer-app'

let publishedService: Service | null = null
let activeBrowser: Browser | null = null

export function setupBonjourIPC(bonjour: Bonjour): void {
  ipcMain.handle('bonjour:publish', async (_, deviceName: string) => {
    // Unpublish any existing service first
    if (publishedService) {
      publishedService.stop?.()
      publishedService = null
    }

    console.log(`Publishing service: ${deviceName} on port ${PORT}`)
    publishedService = bonjour.publish({ name: deviceName, type: SERVICE_TYPE, port: PORT })

    publishedService.on?.('up', () => {
      console.log(`Service published successfully: ${deviceName}`)
    })

    publishedService.on?.('error', (error) => {
      console.error('Service publication error:', error)
    })

    return true
  })

  ipcMain.handle('bonjour:unpublishAll', async () => {
    if (publishedService) {
      publishedService.stop?.()
      publishedService = null
    }
    bonjour.unpublishAll(() => {
      console.log('All services unpublished')
    })
  })

  ipcMain.handle('bonjour:findServices', async () => {
    // Stop any existing browser
    if (activeBrowser) {
      activeBrowser.stop()
      activeBrowser = null
    }

    const services: Array<{ name: string; address: string; port: number }> = []
    activeBrowser = bonjour.find({ type: SERVICE_TYPE })

    console.log(`Starting service discovery for type: ${SERVICE_TYPE}`)

    activeBrowser.on('up', (service) => {
      console.log('Service found:', service.name, service.addresses, service.port)
      if (service.addresses && service.addresses.length > 0) {
        // Filter out IPv6 addresses and prefer IPv4
        const ipv4Address = service.addresses.find((addr) => {
          return addr.includes('.') && !addr.includes(':')
        })

        const address = ipv4Address || service.addresses[0]

        const newService = {
          name: service.name,
          address: address,
          port: service.port
        }

        services.push(newService)

        // Notify all windows of the new service
        BrowserWindow.getAllWindows().forEach((window) => {
          window.webContents.send('bonjour:service-up', newService)
        })
      }
    })

    activeBrowser.on('down', (service) => {
      console.log('Service down:', service.name)

      // Notify all windows of the service going down
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send('bonjour:service-down', {
          name: service.name,
          port: service.port
        })
      })
    })

    // Return immediately with empty array, services will be sent via events
    return services
  })

  ipcMain.handle('bonjour:stopDiscovery', async () => {
    if (activeBrowser) {
      activeBrowser.stop()
      activeBrowser = null
      console.log('Stopped service discovery')
    }
  })

  // Add handler to check if service is published
  ipcMain.handle('bonjour:getPublishedService', async () => {
    if (publishedService) {
      return {
        published: true,
        name: publishedService.name,
        type: publishedService.type,
        port: publishedService.port
      }
    }
    return { published: false }
  })
}
