<script setup lang="ts">
import {
  FolderSync,
  UserRoundPen,
  FolderDown,
  Lock,
  MousePointerClick,
  MonitorDot
} from 'lucide-vue-next'
import Switch from '../components/Switch.vue'
import { useSettings } from '../composables/useSettings'
import { ref, watch, onMounted, computed } from 'vue'

interface OverlayDisplayInfo {
  id: number
  index: number
  name: string
  isPrimary: boolean
  internal: boolean
  scaleFactor: number
  workArea: { x: number; y: number; width: number; height: number }
}

const { useSetting } = useSettings()
const transferOnDrop = useSetting('transferOnDrop')
const deviceName = useSetting('deviceName')
const downloadPath = useSetting('downloadPath')
const useHotCorners = useSetting('useHotCorners')
const hotCornerPosition = useSetting('hotCornerPosition')
const hotCornerDisplayIndex = useSetting('hotCornerDisplayIndex')
const screenSize = ref({ width: 0, height: 0 })
const availableDisplays = ref<OverlayDisplayInfo[]>([])
const selectedDisplayIndex = ref(0)
const displayPath = ref(downloadPath.value || '')
const hasPassword = ref(false)
const scaleFactor = 8
const previewWindowSize = 250 / scaleFactor
const dockHeight = 30
const previewMargin = 2

const containerRef = ref<HTMLElement | null>(null)
const handleRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const draggingPointerId = ref<number | null>(null)
const dragOffset = ref({ x: 0, y: 0 })
const localHotCorner = ref<{ x: number; y: number }>({ x: 1, y: 1 })

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

let isInitializingDisplaySelection = true

const sanitizeDisplayIndex = (value: unknown): number => {
  const numericValue = typeof value === 'number' ? value : Number.parseInt(String(value ?? 0), 10)
  const safeNumber = Number.isFinite(numericValue) ? numericValue : 0
  const rounded = Math.round(safeNumber)
  const maxIndex = Math.max(availableDisplays.value.length - 1, 0)
  return clamp(rounded, 0, maxIndex)
}

const containerWidth = computed(() => {
  const width = screenSize.value.width / scaleFactor
  const minWidth = previewWindowSize + previewMargin * 2
  return Number.isFinite(width) && width > 0 ? Math.max(width, minWidth) : minWidth
})

const screenAreaHeight = computed(() => {
  const height = screenSize.value.height / scaleFactor
  const minHeight = previewWindowSize + previewMargin * 2
  return Number.isFinite(height) && height > 0 ? Math.max(height, minHeight) : minHeight
})

const containerHeight = computed(() => screenAreaHeight.value + dockHeight)

const containerStyle = computed(() => ({
  width: `${containerWidth.value}px`,
  height: `${containerHeight.value}px`
}))

watch(downloadPath, (newPath) => {
  displayPath.value = newPath || ''
})

watch(
  () => hotCornerDisplayIndex.value,
  (value) => {
    const sanitized = sanitizeDisplayIndex(value)
    if (selectedDisplayIndex.value !== sanitized) {
      selectedDisplayIndex.value = sanitized
    }
  },
  { immediate: true }
)

watch(selectedDisplayIndex, async (value) => {
  if (isInitializingDisplaySelection) {
    return
  }

  const sanitized = sanitizeDisplayIndex(value)
  if (sanitized !== value) {
    selectedDisplayIndex.value = sanitized
    return
  }

  if (hotCornerDisplayIndex.value !== sanitized) {
    hotCornerDisplayIndex.value = sanitized
  }

  const targetDisplay = availableDisplays.value[sanitized]
  if (!targetDisplay) {
    return
  }

  screenSize.value = {
    width: targetDisplay.workArea.width,
    height: targetDisplay.workArea.height
  }

  try {
    const bounds = await window.api.overlay.setDisplay(sanitized)
    if (selectedDisplayIndex.value === sanitized) {
      screenSize.value = { width: bounds.width, height: bounds.height }
    }
  } catch (error) {
    console.error('Failed to set overlay display:', error)
  }
})

onMounted(async () => {
  hasPassword.value = await window.api.settings.hasPassword()
  try {
    const [bounds, displays] = await Promise.all([
      window.api.overlay.getSize(),
      window.api.overlay.getDisplays()
    ])
    screenSize.value = { width: bounds.width, height: bounds.height }
    if (Array.isArray(displays)) {
      availableDisplays.value = displays as OverlayDisplayInfo[]
    }
  } catch (error) {
    console.error('Failed to initialize hot corner display settings:', error)
  }

  const initialIndex = sanitizeDisplayIndex(hotCornerDisplayIndex.value)
  selectedDisplayIndex.value = initialIndex

  const targetDisplay = availableDisplays.value[initialIndex]
  if (targetDisplay) {
    try {
      const bounds = await window.api.overlay.setDisplay(initialIndex)
      screenSize.value = { width: bounds.width, height: bounds.height }
    } catch (error) {
      console.error('Failed to apply initial hot corner display:', error)
    }
  }

  isInitializingDisplaySelection = false
})

watch(
  () => hotCornerPosition.value,
  (value) => {
    if (isDragging.value) {
      return
    }
    if (!value) {
      localHotCorner.value = { x: 1, y: 1 }
      return
    }
    localHotCorner.value = {
      x: clamp(value.x ?? 1, 0, 1),
      y: clamp(value.y ?? 1, 0, 1)
    }
  },
  { immediate: true, deep: true }
)

const previewStyle = computed(() => {
  const width = containerWidth.value
  const height = screenAreaHeight.value
  const handleWidth = previewWindowSize
  const handleHeight = previewWindowSize

  const maxLeft = Math.max(previewMargin, width - handleWidth - previewMargin)
  const maxTop = Math.max(previewMargin, height - handleHeight - previewMargin)

  const scaledRight = clamp(
    localHotCorner.value.x * width,
    handleWidth + previewMargin,
    width - previewMargin
  )
  const scaledBottom = clamp(
    localHotCorner.value.y * height,
    handleHeight + previewMargin,
    height - previewMargin
  )

  const left = clamp(scaledRight - handleWidth, previewMargin, maxLeft)
  const top = clamp(scaledBottom - handleHeight, previewMargin, maxTop)

  return {
    width: `${handleWidth}px`,
    height: `${handleHeight}px`,
    left: `${left}px`,
    top: `${top}px`,
    transition: isDragging.value ? 'none' : 'all 200ms ease-in-out'
  }
})

const updateLocalHotCorner = (left: number, top: number): void => {
  const width = containerWidth.value
  const height = screenAreaHeight.value
  const handleWidth = previewWindowSize
  const handleHeight = previewWindowSize

  const safeLeft = clamp(left, -handleWidth, width - handleWidth)
  const safeTop = clamp(top, -handleHeight, height - handleHeight)

  const rightEdge = clamp(safeLeft + handleWidth, 0, width)
  const bottomEdge = clamp(safeTop + handleHeight, 0, height)

  localHotCorner.value = {
    x: width > 0 ? rightEdge / width : 1,
    y: height > 0 ? bottomEdge / height : 1
  }
}

const onDragEnd = (): void => {
  if (!isDragging.value) return
  isDragging.value = false
  if (draggingPointerId.value !== null) {
    handleRef.value?.releasePointerCapture(draggingPointerId.value)
    draggingPointerId.value = null
  }
  dragOffset.value = { x: 0, y: 0 }
  hotCornerPosition.value = { ...localHotCorner.value }
}

const onDragMove = (event: PointerEvent): void => {
  if (!isDragging.value || !containerRef.value) return
  event.preventDefault()
  const containerRect = containerRef.value.getBoundingClientRect()
  const left = event.clientX - containerRect.left - dragOffset.value.x
  const top = event.clientY - containerRect.top - dragOffset.value.y
  updateLocalHotCorner(left, top)
}

const onDragStart = (event: PointerEvent): void => {
  if (!containerRef.value || !handleRef.value) return
  event.preventDefault()
  isDragging.value = true
  draggingPointerId.value = event.pointerId
  const handleRect = handleRef.value.getBoundingClientRect()
  dragOffset.value = {
    x: event.clientX - handleRect.left,
    y: event.clientY - handleRect.top
  }
  handleRef.value.setPointerCapture(event.pointerId)
}

const selectDownloadFolder = async (): Promise<void> => {
  const selectedPath = await window.api.settings.selectDownloadPath()
  if (selectedPath) {
    displayPath.value = selectedPath
  }
}

const openPasswordSetup = (): void => {
  window.electron.ipcRenderer.send('open-password-setup')
}

const removePassword = async (): Promise<void> => {
  await window.api.settings.removePassword()
  hasPassword.value = false
}

// Listen for settings changes to update password status
window.api.settings.onChanged(() => {
  window.api.settings.hasPassword().then((status) => {
    hasPassword.value = status
  })
})
</script>

<template>
  <div class="p-5 dark:text-neutral-100 text-neutral-900">
    <h2 class="uppercase text-xs mb-4 dark:text-neutral-400 text-neutral-500 select-none">
      General
    </h2>
    <div class="flex items-center justify-between mb-5">
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
    <div class="flex items-center justify-between mb-5">
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
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center">
        <MousePointerClick class="w-5 h-5 me-4" />
        <div>
          <h3 class="font-semibold text-sm select-none">Hot corners</h3>
          <p class="text-xs dark:text-neutral-400 text-neutral-500 select-none">
            Automatically transfer files when they are dropped into the application.
          </p>
        </div>
      </div>
      <Switch v-model="useHotCorners" />
    </div>
    <div v-if="availableDisplays.length > 0" class="flex items-center justify-between mb-5">
      <MonitorDot class="w-5 h-5 me-4" />
      <div class="flex items-center flex-1">
        <div>
          <h3 class="font-semibold text-sm select-none">Hot corner display</h3>
          <p class="text-xs dark:text-neutral-400 text-neutral-500 select-none max-w-md">
            Choose which monitor should host the hot corners.
          </p>
        </div>
      </div>
      <select
        v-model.number="selectedDisplayIndex"
        class="dark:bg-neutral-800 bg-neutral-200 dark:text-white text-black rounded-lg text-sm px-2 ms-5 w-60 py-1 outline-0 focus:ring-2 ring-offset-1 dark:ring-offset-neutral-900 ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="!useHotCorners"
      >
        <option v-for="display in availableDisplays" :key="display.id" :value="display.index">
          {{ display.name }}{{ display.isPrimary ? ' (Primary)' : '' }}
        </option>
      </select>
    </div>
    <div
      v-if="useHotCorners && screenSize.width > 0 && screenSize.height > 0"
      ref="containerRef"
      class="bg-linear-to-tr transition-all duration-300 from-blue-300 mx-auto shadow-xl border-neutral-100 dark:border-neutral-700 to-blue-100 rounded-xl relative overflow-visible"
      :style="containerStyle"
    >
      <!-- Main window representation (scaled down) -->
      <div
        ref="handleRef"
        class="absolute rounded-lg border-2 border-dashed border-black/30 bg-black/10 backdrop-blur-sm transition-colors"
        :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
        :style="previewStyle"
        @pointerdown="onDragStart"
        @pointermove="onDragMove"
        @pointerup="onDragEnd"
        @pointercancel="onDragEnd"
        @lostpointercapture="onDragEnd"
      ></div>
      <!-- Dock-like indicator -->
      <div
        class="absolute flex items-center bg-black/10 rounded bottom-2 left-1/2 -translate-x-1/2 p-1 gap-1"
      >
        <div class="bg-red-400 rounded-sm w-3 h-3 shadow-sm"></div>
        <div class="bg-yellow-400 rounded-sm w-3 h-3 shadow-sm"></div>
        <div class="bg-green-400 rounded-sm w-3 h-3 shadow-sm"></div>
        <div class="bg-blue-400 rounded-sm w-3 h-3 shadow-sm"></div>
      </div>
    </div>
    <h2 class="uppercase text-xs my-4 dark:text-neutral-400 text-neutral-500 select-none">
      Connectivity
    </h2>
    <div class="flex items-center justify-between mb-5">
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

    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center flex-1">
        <Lock class="w-5 h-5 me-4" />
        <div>
          <h3 class="font-semibold text-sm select-none">Super Secret Password</h3>
          <p class="text-xs dark:text-neutral-400 text-neutral-500 select-none">
            {{ hasPassword ? 'Password is set' : 'Set a password to secure peer connections' }}
          </p>
        </div>
      </div>
      <button
        class="dark:bg-neutral-800 bg-neutral-200 dark:text-white text-black rounded-lg text-sm px-3 py-1.5 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
        @click="openPasswordSetup"
      >
        {{ hasPassword ? 'Change Password' : 'Set Password' }}
      </button>
      <button
        v-if="hasPassword"
        class="dark:bg-neutral-800 bg-neutral-200 dark:text-red-400 ms-2 text-red-500 rounded-lg text-sm px-3 py-1.5 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
        @click="removePassword"
      >
        Remove Password
      </button>
    </div>
  </div>
</template>
