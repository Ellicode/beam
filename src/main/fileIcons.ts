import { ipcMain, nativeImage } from 'electron'

export function setupFileIconIPC(): void {
  ipcMain.handle('file:getThumbnail', async (_, filePath: string) => {
    try {
      const thumbnail = await nativeImage.createThumbnailFromPath(filePath, {
        width: 64,
        height: 64
      })
      return thumbnail.toDataURL()
    } catch (error) {
      console.error('Error generating thumbnail:', error)
      return null
    }
  })
}
