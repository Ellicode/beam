import { ref } from 'vue'

type Platform = 'darwin' | 'win32' | 'linux' | 'unknown'
type OSName = 'macOS' | 'Windows' | 'Linux' | 'Unknown'

interface OSInfo {
  platform: Platform
  name: OSName
  isMac: boolean
  isWindows: boolean
  isLinux: boolean
}

const platform = ref<Platform>('unknown')
const initialized = ref(false)

/**
 * Composable to detect the current operating system
 */
export function useOS(): OSInfo {
  if (!initialized.value) {
    // Detect platform from user agent
    const userAgent = navigator.userAgent.toLowerCase()

    if (userAgent.includes('mac')) {
      platform.value = 'darwin'
    } else if (userAgent.includes('win')) {
      platform.value = 'win32'
    } else if (userAgent.includes('linux')) {
      platform.value = 'linux'
    }

    initialized.value = true
  }

  const osName = ref<OSName>('Unknown')
  const isMac = ref(false)
  const isWindows = ref(false)
  const isLinux = ref(false)

  switch (platform.value) {
    case 'darwin':
      osName.value = 'macOS'
      isMac.value = true
      break
    case 'win32':
      osName.value = 'Windows'
      isWindows.value = true
      break
    case 'linux':
      osName.value = 'Linux'
      isLinux.value = true
      break
    default:
      osName.value = 'Unknown'
  }

  const osInfo: OSInfo = {
    platform: platform.value,
    name: osName.value,
    isMac: isMac.value,
    isWindows: isWindows.value,
    isLinux: isLinux.value
  }

  return osInfo
}
