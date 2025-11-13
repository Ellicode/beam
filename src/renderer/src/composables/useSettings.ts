import { ref, onMounted, computed, type Ref, type WritableComputedRef } from 'vue'

interface Settings {
  transferOnDrop: boolean
  deviceName: string
  downloadPath: string
  superSecretPassword?: string
  passwordSalt?: string
  authKey?: string
  useHotCorners?: boolean
  hotCornerPosition?: { x: number; y: number }
  hotCornerDisplayIndex?: number
  savedDevices?: Array<{ name: string; address: string; port: number; authKey?: string }>
}

type SettingKey = keyof Settings

const settings = ref<Settings>({
  transferOnDrop: false,
  deviceName: '',
  downloadPath: '',
  useHotCorners: false,
  hotCornerPosition: { x: 0, y: 0 },
  hotCornerDisplayIndex: 0,
  savedDevices: []
})

let isInitialized = false
let loadingPromise: Promise<void> | null = null
let unsubscribe: (() => void) | null = null

async function initializeSettings(): Promise<void> {
  if (isInitialized) return
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    const loadedSettings = await window.api.settings.load()
    settings.value = loadedSettings
    isInitialized = true

    // Set up listener for settings changes from other windows
    if (!unsubscribe) {
      unsubscribe = window.api.settings.onChanged(async () => {
        const updatedSettings = await window.api.settings.load()
        settings.value = updatedSettings
      })
    }
  })()

  await loadingPromise
  loadingPromise = null
}

interface UseSettingsReturn {
  settings: Ref<Settings>
  useSetting: <K extends SettingKey>(key: K) => WritableComputedRef<Settings[K]>
}

export function useSettings(): UseSettingsReturn {
  // Initialize settings immediately when composable is used
  onMounted(() => {
    initializeSettings()
  })

  function useSetting<K extends SettingKey>(key: K): WritableComputedRef<Settings[K]> {
    return computed({
      get() {
        return settings.value[key]
      },
      set(newValue: Settings[K]) {
        settings.value[key] = newValue
        if (isInitialized) {
          window.api.settings.update(key as K, newValue).then((updatedSettings) => {
            settings.value = updatedSettings
          })
        }
      }
    })
  }

  return {
    settings,
    useSetting
  }
}
