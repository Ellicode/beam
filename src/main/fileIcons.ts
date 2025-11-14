import { ipcMain, nativeImage } from 'electron'

export function setupFileIconIPC(): void {
  ipcMain.handle('file:getThumbnail', async (_, filePath: string) => {
    if (filePath.endsWith('.png') || filePath.endsWith('.jpg')) {
      try {
        const image = nativeImage.createFromPath(filePath)
        return image.toDataURL()
      } catch (error) {
        console.error('Error loading image file:', error)
        return null
      }
    } else {
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
    }
  })
}
