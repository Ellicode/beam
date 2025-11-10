<script lang="ts" setup>
import Loader from '@renderer/components/Loader.vue'
import { useSettings } from '@renderer/composables/useSettings'
import { ChevronRight, GlobeLock, Laptop2 } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

const bonjourDevices = ref<Array<{ name: string; address: string; port: number }> | null>(null)
const showPasswordPrompt = ref(false)
const selectedDeviceToAdd = ref<{ name: string; address: string; port: number } | null>(null)
const devicePassword = ref('')
const passwordError = ref('')

async function fetchBonjourDevices(): Promise<void> {
  bonjourDevices.value = null
  try {
    console.log('Searching for devices...')
    const services = await window.api.bonjour.findServices()
    console.log('Services found:', services)
    bonjourDevices.value = services
  } catch (error) {
    console.error('Failed to fetch Bonjour devices:', error)
    bonjourDevices.value = []
  }
}

const formatName = (name: string): string => {
  return name.replace(/#\d+$/, '')
}

const { useSetting } = useSettings()
const savedDevices = useSetting('savedDevices')
const deviceName = useSetting('deviceName')

const promptForPassword = async (device: {
  name: string
  address: string
  port: number
}): Promise<void> => {
  selectedDeviceToAdd.value = device
  devicePassword.value = ''
  passwordError.value = ''

  try {
    // Check if the peer requires authentication
    console.log(`Checking auth status for ${device.address}:${device.port}`)
    const requiresAuth = await window.api.transfer.checkAuthRequired(device.address, device.port)
    console.log(`Peer requires auth: ${requiresAuth}`)

    if (requiresAuth) {
      // Show password prompt
      showPasswordPrompt.value = true
    } else {
      // Add device directly without password
      await addDeviceDirectly()
    }
  } catch (error) {
    console.error('Failed to check auth status:', error)
    // If we can't check, add without password
    await addDeviceDirectly()
  }
}

const addDeviceDirectly = async (): Promise<void> => {
  if (!selectedDeviceToAdd.value) return

  savedDevices.value = [
    ...(savedDevices.value || []),
    {
      name: formatName(selectedDeviceToAdd.value.name),
      address: selectedDeviceToAdd.value.address,
      port: selectedDeviceToAdd.value.port,
      authKey: undefined
    }
  ]

  showPasswordPrompt.value = false
  selectedDeviceToAdd.value = null
  window.electron.ipcRenderer.send('close-add-device')
}

const addDevice = async (withPassword: boolean = true): Promise<void> => {
  if (!selectedDeviceToAdd.value) return

  let authKey: string | undefined

  // Only generate auth key if password is provided
  if (withPassword && devicePassword.value) {
    try {
      // Verify the password with the peer before adding
      const isValid = await window.api.transfer.verifyPassword(
        selectedDeviceToAdd.value.address,
        selectedDeviceToAdd.value.port,
        devicePassword.value
      )

      if (!isValid) {
        passwordError.value = 'Incorrect password'
        return
      }

      authKey = await window.api.settings.getAuthKey(devicePassword.value)
    } catch (error) {
      passwordError.value = 'Failed to verify password'
      console.error('Failed to verify password:', error)
      return
    }
  }

  savedDevices.value = [
    ...(savedDevices.value || []),
    {
      name: formatName(selectedDeviceToAdd.value.name),
      address: selectedDeviceToAdd.value.address,
      port: selectedDeviceToAdd.value.port,
      authKey: authKey
    }
  ]

  showPasswordPrompt.value = false
  selectedDeviceToAdd.value = null
  devicePassword.value = ''
  passwordError.value = ''
  window.electron.ipcRenderer.send('close-add-device')
}

const cancelPasswordPrompt = (): void => {
  showPasswordPrompt.value = false
  selectedDeviceToAdd.value = null
  devicePassword.value = ''
  passwordError.value = ''
}

const filteredBonjourDevices = computed(() => {
  if (bonjourDevices.value == null) {
    return []
  }
  const saved = new Set(
    (savedDevices.value || []).map((d) => `${d.name.toLowerCase()}|${d.address}|${d.port}`)
  )
  return bonjourDevices.value.filter(
    (device) =>
      !saved.has(`${formatName(device.name).toLowerCase()}|${device.address}|${device.port}`) &&
      formatName(device.name) !== deviceName.value
  )
})

onMounted(() => {
  fetchBonjourDevices()
})
</script>
<template>
  <div v-if="bonjourDevices == null" class="flex-1 w-full flex justify-center items-center">
    <Loader :size="30" class="dark:text-white text-black" />
  </div>
  <div v-else class="p-3 dark:text-neutral-100 text-neutral-900">
    <h2 class="uppercase text-xs mb-2 dark:text-neutral-400 text-neutral-500 select-none">
      Available Devices
    </h2>
    <ul v-if="filteredBonjourDevices.length > 0">
      <li
        v-for="device in filteredBonjourDevices"
        :key="device.name + device.address + device.port"
        class="mb-3 p-2 flex items-center rounded-lg cursor-pointer dark:bg-white/5 bg-black/5 active:dark:bg-white/10 active:bg-black/10 border dark:border-white/10 border-black/10"
        @click="promptForPassword(device)"
      >
        <Laptop2 class="w-6 h-6 me-3 shrink-0 dark:text-neutral-300 text-neutral-700" />
        <div class="flex flex-col">
          <h3 class="font-semibold text-sm select-none">{{ formatName(device.name) }}</h3>
          <p class="text-xs dark:text-neutral-400 text-neutral-500 select-none">
            {{ device.address }}:{{ device.port }}
          </p>
        </div>
        <ChevronRight class="w-5 h-5 ms-auto dark:text-neutral-400 text-neutral-500" />
      </li>
      <li v-if="bonjourDevices.length === 0" class="text-sm dark:text-neutral-400 text-neutral-500">
        No devices found.
      </li>
    </ul>
    <div
      v-else
      class="flex flex-col items-center justify-center w-full max-h-[calc(100vh-5rem)] py-8"
    >
      <GlobeLock class="w-5 h-5 mb-4 dark:text-neutral-400 text-neutral-500" />
      <h1 class="font-semibold text-sm select-none">No devices found on your local network</h1>
      <p class="text-center mt-2 text-xs px-5 dark:text-neutral-400 text-neutral-500 select-none">
        Make sure both devices are on the same network.
      </p>
      <button
        class="mt-4 px-2 py-1 rounded-lg text-sm dark:bg-white/10 bg-black/10 hover:dark:bg-white/20 hover:bg-black/20 transition-colors"
        @click="fetchBonjourDevices"
      >
        Refresh
      </button>
    </div>

    <!-- Password Prompt Modal -->
    <div
      v-if="showPasswordPrompt"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="cancelPasswordPrompt"
    >
      <div
        class="dark:bg-neutral-900 bg-white rounded-2xl p-3 w-80 border dark:border-white/10 border-black/10 inset-shadow-2xs"
      >
        <div class="flex items-center mb-3">
          <h2 class="font-semibold">Device Password</h2>
        </div>
        <p v-if="passwordError" class="text-xs text-red-500 mb-3">{{ passwordError }}</p>

        <p v-else class="text-xs dark:text-neutral-400 text-neutral-500 mb-4">
          <span class="font-semibold">{{ selectedDeviceToAdd?.name }}</span> requires a password.
          Enter their super secret password to add them.
        </p>
        <input
          v-model="devicePassword"
          type="password"
          placeholder="Super secret password"
          class="w-full dark:bg-neutral-800 bg-neutral-100 dark:text-white text-black rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-500 mb-2"
          @keyup.enter="addDevice()"
          @keyup.esc="cancelPasswordPrompt"
        />
        <div class="flex gap-2">
          <button
            class="flex-1 px-4 py-2 rounded-lg text-sm dark:bg-white/10 bg-black/10 transition-colors"
            @click="cancelPasswordPrompt"
          >
            Cancel
          </button>
          <button
            class="flex-1 px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!devicePassword"
            @click="addDevice()"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
