<script setup lang="ts">
import { FolderSync, UserRoundPen, FolderDown } from 'lucide-vue-next'
import Switch from '../components/Switch.vue'
import { useSettings } from '../composables/useSettings'
import { ref, watch } from 'vue'

const { useSetting } = useSettings()
const transferOnDrop = useSetting('transferOnDrop')
const deviceName = useSetting('deviceName')
const downloadPath = useSetting('downloadPath')

const displayPath = ref(downloadPath.value || '')

watch(downloadPath, (newPath) => {
  displayPath.value = newPath || ''
})

const selectDownloadFolder = async (): Promise<void> => {
  const selectedPath = await window.api.settings.selectDownloadPath()
  if (selectedPath) {
    displayPath.value = selectedPath
  }
}
</script>

<template>
  <div class="p-5 dark:text-neutral-100 text-neutral-900">
    <h2 class="uppercase text-xs mb-4 dark:text-neutral-400 text-neutral-500 select-none">
      General
    </h2>
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <FolderSync class="w-5 h-5 me-4" />
        <div>
          <h3 class="font-semibold text-sm select-none">Enable Transfer on Drop</h3>
          <p class="text-xs dark:text-neutral-400 text-neutral-500 select-none">
            Automatically transfer files when they are dropped into the application.
          </p>
        </div>
      </div>
      <Switch v-model="transferOnDrop" />
    </div>
    <h2 class="uppercase text-xs my-4 dark:text-neutral-400 text-neutral-500 select-none">Files</h2>
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center flex-1">
        <FolderDown class="w-5 h-5 me-4" />
        <div class="flex-1">
          <h3 class="font-semibold text-sm select-none">Download Location</h3>
          <p class="text-xs dark:text-neutral-400 text-neutral-500 select-none truncate max-w-md">
            {{ displayPath || 'Not set' }}
          </p>
        </div>
      </div>
      <button
        class="dark:bg-neutral-800 bg-neutral-200 dark:text-white text-black rounded-lg text-sm px-3 py-1.5 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
        @click="selectDownloadFolder"
      >
        Choose Folder
      </button>
    </div>
    <h2 class="uppercase text-xs my-4 dark:text-neutral-400 text-neutral-500 select-none">
      Connectivity
    </h2>
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <UserRoundPen class="w-5 h-5 me-4" />
        <div>
          <h3 class="font-semibold text-sm select-none">Device name</h3>
          <p class="text-xs dark:text-neutral-400 text-neutral-500 select-none">
            Use a unique name to identify your device.
          </p>
        </div>
      </div>
      <input
        v-model="deviceName"
        type="text"
        class="dark:bg-neutral-800 bg-neutral-200 dark:text-white text-black rounded-lg text-sm px-2 ms-5 w-60 py-1 outline-0 focus:ring-2 ring-offset-1 dark:ring-offset-neutral-900 ring-blue-500"
        placeholder="My computer"
      />
    </div>
  </div>
</template>
