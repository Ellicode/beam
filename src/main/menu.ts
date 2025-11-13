import { Menu, MenuItemConstructorOptions } from 'electron'

export function createAppMenu(onSettingsClick: () => void, onAddDeviceClick: () => void): Menu {
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [
          {
            role: 'appMenu' as const,
            submenu: [
              {
                label: 'Preferences...',
                click: onSettingsClick,
                accelerator: 'CommandOrControl+,'
              }
            ]
          }
        ]
      : []),
    ...(process.platform !== 'darwin'
      ? [
          {
            role: 'fileMenu' as const,
            submenu: [
              {
                label: 'Preferences...',
                click: onSettingsClick,
                accelerator: 'CommandOrControl+,'
              },
              {
                label: 'Add Device',
                click: onAddDeviceClick,
                accelerator: 'CommandOrControl+N'
              },
              { role: 'quit' as const }
            ]
          }
        ]
      : [
          {
            role: 'fileMenu' as const,
            submenu: [
              {
                label: 'Add Device',
                click: onAddDeviceClick,
                accelerator: 'CommandOrControl+N'
              },
              { role: 'quit' as const }
            ]
          }
        ]),
    { role: 'editMenu' as const },
    { role: 'viewMenu' as const },
    { role: 'windowMenu' as const },
    {
      role: 'help' as const
    }
  ]

  return Menu.buildFromTemplate(template)
}
