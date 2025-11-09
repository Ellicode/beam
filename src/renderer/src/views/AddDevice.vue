<script lang="ts" setup>
import Loader from '@renderer/components/Loader.vue'
import { useSettings } from '@renderer/composables/useSettings'
import { ChevronRight, GlobeLock, Laptop2 } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

const bonjourDevices = ref<Array<{ name: string; address: string; port: number }> | null>(null)

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

const addDevice = (device: { name: string; address: string; port: number }): void => {
  savedDevices.value = [
    ...(savedDevices.value || []),
    { name: formatName(device.name), address: device.address, port: device.port }
  ]
  window.electron.ipcRenderer.send('close-add-device')
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
        @click="addDevice(device)"
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
    <div v-else class="flex flex-col items-center justify-center w-full h-full py-8">
      <GlobeLock class="w-8 h-8 mb-4 dark:text-neutral-400 text-neutral-500" />
      <h1 class="font-semibold select-none">No devices found on your local network</h1>
      <p class="text-center mt-2 text-xs px-5 dark:text-neutral-400 text-neutral-500 select-none">
        Make sure both devices are on the same network.
      </p>
      <button
        class="mt-4 px-4 py-2 rounded-lg text-sm dark:bg-white/10 bg-black/10 hover:dark:bg-white/20 hover:bg-black/20 transition-colors"
        @click="fetchBonjourDevices"
      >
        Refresh
      </button>
      <details class="mt-6 text-xs dark:text-neutral-400 text-neutral-500 px-5 max-w-md">
        <summary class="cursor-pointer select-none font-semibold mb-2">
          Troubleshooting Windows
        </summary>
        <ol class="list-decimal list-inside space-y-1 select-none">
          <li>Ensure both devices are on the same WiFi network</li>
          <li>Check Windows Firewall allows the app (port 4000)</li>
          <li>Install Bonjour Print Services for Windows if needed</li>
          <li>Disable VPN or proxy if active</li>
          <li>Try manually adding device by IP address</li>
        </ol>
      </details>
    </div>
  </div>
</template>
