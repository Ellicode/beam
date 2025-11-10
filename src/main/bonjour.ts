import { Bonjour, Service } from 'bonjour-service'
import { ipcMain } from 'electron'
const PORT = 4000
const SERVICE_TYPE = 'file-transfer-app'

let publishedService: Service | null = null

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
    return new Promise((resolve) => {
      const services: Array<{ name: string; address: string; port: number }> = []
      const browser = bonjour.find({ type: SERVICE_TYPE })

      console.log(`Starting service discovery for type: ${SERVICE_TYPE}`)

      browser.on('up', (service) => {
        console.log('Service found:', service.name, service.addresses, service.port)
        if (service.addresses && service.addresses.length > 0) {
          // Filter out IPv6 addresses and prefer IPv4
          const ipv4Address = service.addresses.find((addr) => {
            return addr.includes('.') && !addr.includes(':')
          })

          const address = ipv4Address || service.addresses[0]

          services.push({
            name: service.name,
            address: address,
            port: service.port
          })
        }
      })

      browser.on('down', (service) => {
        console.log('Service down:', service.name)
      })

      // Wait for a longer period to gather services (especially on Windows)
      setTimeout(() => {
        browser.stop()
        console.log(
          `Found ${services.length} services:`,
          services.map((s) => s.name)
        )
        resolve(services)
      }, 2000)
    })
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
