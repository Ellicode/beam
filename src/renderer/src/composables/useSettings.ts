import { ref, onMounted, computed, type Ref, type WritableComputedRef } from 'vue'

export interface Settings {
  transferOnDrop: boolean
  deviceName?: string
  savedDevices?: Array<{ name: string; address: string; port: number }>
}

type SettingKey = keyof Settings

const settings = ref<Settings>({
  transferOnDrop: false,
  deviceName: '',
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
