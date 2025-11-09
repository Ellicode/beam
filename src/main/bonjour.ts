import { Bonjour } from 'bonjour-service'
import { ipcMain } from 'electron'
const PORT = 4000

export function setupBonjourIPC(bonjour: Bonjour): void {
  ipcMain.handle('bonjour:publish', async (_, deviceName: string) => {
    bonjour.publish({ name: deviceName, type: 'http', port: PORT })
  })

  ipcMain.handle('bonjour:unpublishAll', async () => {
    bonjour.unpublishAll(() => {
      console.log('All services unpublished')
    })
  })

  ipcMain.handle('bonjour:findServices', async () => {
    return new Promise((resolve) => {
      const services: Array<{ name: string; address: string; port: number }> = []
      const browser = bonjour.find({ type: 'file-transfer-app' })

      browser.on('up', (service) => {
        if (service.addresses.length > 0) {
          services.push({
            name: service.name,
            address: service.addresses[0],
            port: service.port
          })
        }
      })

      // Wait for a short period to gather services, then resolve
      setTimeout(() => {
        browser.stop()
        resolve(services)
      }, 2000)
    })
  })
}
