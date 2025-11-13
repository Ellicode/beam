<script setup lang="ts">
import { useSettings } from '@renderer/composables/useSettings'
import { useDropZone } from '@vueuse/core'
import { ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Plus, X } from 'lucide-vue-next'
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import FileStack from '../components/FileStack.vue'
import ProgressRing from '@renderer/components/ProgressRing.vue'

interface FileTransferProgress {
  fileName: string
  fileSize: number
  bytesTransferred: number
  percentage: number
  status: 'pending' | 'transferring' | 'completed' | 'error'
  error?: string
}

const dropZoneRef = ref<HTMLDivElement>()
const filePool = ref<Array<File & { path?: string }>>([])
const transferProgress = ref<Map<string, FileTransferProgress>>(new Map())
const isTransferring = ref(false)
let progressUnsubscribe: (() => void) | null = null

async function onDrop(files: File[] | null): Promise<void> {
  if (files) {
    const windowBounds = await window.api.overlay.getPrimaryBounds()
    console.log(windowBounds)

    window.api.overlay.setPosition({
      x: windowBounds.x + (windowBounds.width - 250) / 2,
      y: windowBounds.y + (windowBounds.height - 250) / 2
    })
    console.log('Files dropped', files)
    // Check if files already exists

    // Add file paths using webUtils
    const filesWithPaths = files.map((file) => {
      const fileWithPath = file as File & { path?: string }
      try {
        fileWithPath.path = window.api.file.getPathForFile(file)
      } catch (err) {
        console.error('Could not get path for file:', err)
      }
      return fileWithPath
    })
    filePool.value.push(...filesWithPaths)

    // Auto-transfer if setting is enabled
    if (transferOnDrop.value && selectedDevice.value && !isTransferring.value) {
      handleTransfer()
    }
  }
}

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop,
  multiple: true,
  preventDefaultForUnhandled: false
})

const addDevice = (): void => {
  // Logic to add a new device
  window.electron.ipcRenderer.send('open-add-device')
}

const { useSetting } = useSettings()
const transferOnDrop = useSetting('transferOnDrop')
const savedDevices = useSetting('savedDevices')
const currentView = ref<'home' | 'files'>('home')
const overallProgress = computed(() => {
  const progresses = Array.from(transferProgress.value.values())
  if (progresses.length === 0) {
    return 0
  }
  const total = progresses.reduce((sum, p) => {
    const percent = typeof p.percentage === 'number' && !isNaN(p.percentage) ? p.percentage : 0
    return sum + percent
  }, 0)
  return total / progresses.length
})
const selectedDevice = ref<string>('')

// Computed to check if we have a valid peer selected
const hasValidPeer = computed(() => {
  if (!selectedDevice.value || !savedDevices.value || savedDevices.value.length === 0) {
    return false
  }
  return savedDevices.value.some(
    (device) => `${device.address}:${device.port}` === selectedDevice.value
  )
})

// Computed to check if transfer button should be disabled
const isTransferDisabled = computed(() => {
  return filePool.value.length === 0 || !hasValidPeer.value || isTransferring.value
})
watch(
  () => savedDevices.value,
  (newDevices) => {
    if (newDevices && newDevices.length > 0 && !selectedDevice.value) {
      selectedDevice.value = newDevices[0].address + ':' + newDevices[0].port
    }
  },
  { immediate: true }
)

const thunmbnails = ref<Map<string, string>>(new Map())

const getThumbnails = async (): Promise<void> => {
  for (const file of filePool.value) {
    if (file.path && !thunmbnails.value.has(file.name)) {
      const thumbnail = await window.api.file.getThumbnail(file.path)
      if (thumbnail) {
        thunmbnails.value.set(file.name, thumbnail)
      }
    }
  }
}

const goToFiles = async (): Promise<void> => {
  currentView.value = 'files'
  await getThumbnails()
}

const showQuickLook = async (file: File & { path?: string }): Promise<void> => {
  if (!file.path) {
    console.log('No path for file:', file.name)
    return
  }

  try {
    await window.api.file.tryQuickLook(file.path)
  } catch (error) {
    console.error('Failed to open Quick Look:', error)
  }
}

// Handle file transfer
const handleTransfer = async (): Promise<void> => {
  if (isTransferDisabled.value) {
    console.warn('Transfer blocked: no valid peer or no files')
    return
  }

  isTransferring.value = true
  transferProgress.value.clear()

  try {
    // Parse selected device
    const [address, portStr] = selectedDevice.value.split(':')
    const port = parseInt(portStr, 10)

    // Find the selected device to get its authKey
    const device = savedDevices.value?.find(
      (d) => `${d.address}:${d.port}` === selectedDevice.value
    )

    // Prepare files for transfer
    const filesToTransfer = filePool.value
      .filter((f) => f.path)
      .map((f) => ({
        name: f.name,
        path: f.path!,
        size: f.size
      }))

    if (filesToTransfer.length === 0) {
      console.error('No valid files to transfer')
      isTransferring.value = false
      return
    }

    // Initiate transfer with authKey if available
    await window.api.transfer.sendFiles({
      files: filesToTransfer,
      targetAddress: address,
      targetPort: port,
      authKey: device?.authKey
    })

    console.log('Transfer initiated successfully')
  } catch (error) {
    console.error('Transfer failed:', error)
    isTransferring.value = false
  }
}

// Setup progress listener
onMounted(() => {
  progressUnsubscribe = window.api.transfer.onProgress((transferId, progress) => {
    transferProgress.value.set(transferId, progress)

    // Check if all transfers are complete
    const allProgress = Array.from(transferProgress.value.values())
    const allComplete = allProgress.every((p) => p.status === 'completed' || p.status === 'error')

    if (allComplete && allProgress.length > 0) {
      filePool.value = []
      setTimeout(() => {
        isTransferring.value = false
      }, 500)
    }
  })
})

onUnmounted(() => {
  if (progressUnsubscribe) {
    progressUnsubscribe()
  }
})

const clearFiles = (): void => {
  filePool.value = []
  transferProgress.value.clear()
  currentView.value = 'home'
}
</script>

<template>
  <div class="relative w-full h-full flex-1 overflow-hidden">
    <div
      class="absolute w-full h-full flex flex-col transition-all duration-300"
      :class="{
        'left-0': currentView === 'home',
        '-left-full': currentView === 'files'
      }"
    >
      <div
        ref="dropZoneRef"
        class="flex flex-col items-center justify-center flex-1 transition-colors duration-200"
        :class="{
          'text-black/30 dark:text-white/30': !isOverDropZone,
          'text-blue-600 dark:text-blue-400': isOverDropZone
        }"
      >
        <FileStack v-model="filePool" />
        <p
          class="select-none text-sm mt-3 flex items-center gap-2"
          :class="{
            'animate-pulse': filePool.length > 0
          }"
        >
          {{
            filePool.length > 0
              ? `${filePool.length} file(s) ready to transfer`
              : isOverDropZone
                ? 'Release to add files'
                : 'Drop files here '
          }}

          <button
            v-if="filePool.length > 0"
            class="inline-flex w-3 h-3 rounded-full items-center justify-center bg-black/30 dark:bg-white/30 active:bg-black/50 dark:active:bg-white/50"
            @click="goToFiles"
          >
            <ChevronRight stroke-width="2.5" class="w-3 h-3 text-white dark:text-neutral-800" />
          </button>
        </p>
      </div>
      <div class="flex items-center p-2">
        <label
          for="deviceSelect"
          class="rounded-full text-sm dark:bg-white/10 bg-black/10 dark:text-white/75 text-black/75"
        >
          <select
            id="deviceSelect"
            v-model="selectedDevice"
            class="ps-2 py-1 w-20 truncate select-none appearance-none outline-0"
          >
            <option v-if="savedDevices?.length === 0" disabled>No device found</option>
            <option
              v-for="device in savedDevices"
              :key="device.address"
              :value="device.address + ':' + device.port"
            >
              {{ device.name }}
            </option>
          </select>
          <ChevronDown class="w-4 h-4 me-2 inline-block ml-1 text-black/50 dark:text-white/50" />
        </label>
        <button
          class="rounded-full ms-2 dark:bg-white/10 bg-black/10 dark:text-white/75 text-black/75 flex items-center justify-center w-7 h-7"
          @click="addDevice"
        >
          <Plus class="w-5 h-5" />
        </button>
        <button
          class="rounded-full ms-auto dark:bg-white/10 bg-black/10 dark:text-white/75 text-black/75 flex items-center justify-center w-7 h-7"
          @click="clearFiles"
        >
          <X class="w-5 h-5" />
        </button>
        <button
          v-if="!transferOnDrop && !isTransferring"
          :disabled="isTransferDisabled"
          class="rounded-full ms-2 disabled:dark:bg-white/10 disabled:bg-black/10 disabled:dark:text-white/50 disabled:text-black/50 dark:bg-white dark:text-black bg-black text-white transition-colors duration-200 flex items-center justify-center w-7 h-7"
          @click="handleTransfer"
        >
          <ArrowUp class="w-5 h-5" />
        </button>
        <ProgressRing
          v-if="isTransferring"
          :percentage="overallProgress"
          :size="28"
          :stroke-width="5"
          class="ms-2"
        />
      </div>
    </div>
    <div
      class="absolute w-full h-full flex flex-col transition-all duration-300"
      :class="{
        'left-0': currentView === 'files',
        'left-full': currentView === 'home'
      }"
    >
      <button
        class="rounded-full shrink-0 ms-2 dark:bg-white/10 bg-black/10 dark:text-white/55 text-black/55 flex items-center justify-center w-5 h-5"
        @click="currentView = 'home'"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>
      <ul
        class="dark:bg-white/5 bg-black/5 border border-black/5 dark:border-white/5 mx-2 my-3 rounded-lg overflow-auto max-h-60"
      >
        <li
          v-for="(file, index) in filePool"
          :key="file.name + file.size + index"
          class="not-last:border-b w-full dark:active:bg-white/5 active:bg-black/5 border-black/5 dark:border-white/5 px-3 py-2 flex"
          @click="showQuickLook(file)"
        >
          <img
            :src="thunmbnails.get(file.name) || ''"
            class="w-8 h-8 rounded rotate-3 object-contain select-none me-3"
            draggable="false"
            alt="File icon"
          />
          <div class="max-w-40">
            <h3 class="flex-1 text-sm truncate select-none dark:text-white/70 text-black/70">
              {{ file.name }}
            </h3>
            <p class="text-[0.6rem] dark:text-white/50 text-black/50 select-none">
              {{ (file.size / 1024).toFixed(2) }} KB
            </p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
