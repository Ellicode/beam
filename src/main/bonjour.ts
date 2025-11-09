import { Bonjour } from 'bonjour-service'
import { ipcMain } from 'electron'
const PORT = 4000
const SERVICE_TYPE = 'file-transfer-app'

export function setupBonjourIPC(bonjour: Bonjour): void {
  ipcMain.handle('bonjour:publish', async (_, deviceName: string) => {
    bonjour.publish({ name: deviceName, type: SERVICE_TYPE, port: PORT })
  })

  ipcMain.handle('bonjour:unpublishAll', async () => {
    bonjour.unpublishAll(() => {
      console.log('All services unpublished')
    })
  })

  ipcMain.handle('bonjour:findServices', async () => {
    return new Promise((resolve) => {
      const services: Array<{ name: string; address: string; port: number }> = []
      const browser = bonjour.find({ type: SERVICE_TYPE })

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
        console.log(`Found ${services.length} services`)
        resolve(services)
      }, 3000)
    })
  })
}
