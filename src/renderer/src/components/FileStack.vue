<script setup lang="ts">
import { Cloud } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

const files = defineModel<Array<File & { path?: string }>>()
// Show max 3 files in the stack
const displayFiles = computed(() => files.value?.slice(-3).reverse())

// Store thumbnails for each file
const thumbnails = ref<Map<string, string>>(new Map())

// Generate random rotation for each file (between -8 and 8 degrees)
const getRotation = (index: number): number => {
  const rotations = [3, -4, 6, -2, 5, -6, 4, -3]
  return rotations[index % rotations.length]
}

// Load thumbnail for a file
async function loadThumbnail(file: File & { path?: string }): Promise<void> {
  console.log('Loading thumbnail for:', file.name, 'path:', file.path)
  if (!file.path) {
    console.log('No path for file:', file.name)
    return
  }

  try {
    const dataUrl = await window.api.file.getThumbnail(file.path)
    console.log('Got thumbnail for:', file.name, 'dataUrl length:', dataUrl?.length)
    if (dataUrl) {
      thumbnails.value.set(file.name, dataUrl)
    }
  } catch (error) {
    console.error('Failed to load thumbnail:', error)
  }
}

// Get thumbnail or fallback emoji
const getThumbnailOrIcon = (file: File & { path?: string }): string | null => {
  return thumbnails.value.get(file.name) || null
}

// Watch for file changes and load thumbnails
watch(
  () => files.value,
  (newFiles) => {
    if (!newFiles) return
    console.log('Files changed, count:', newFiles.length, 'files:', newFiles)
    newFiles.forEach((file) => {
      console.log(
        'Processing file:',
        file.name,
        'has path?',
        'path' in file,
        'path value:',
        file.path
      )
      if (file.path && !thumbnails.value.has(file.name)) {
        loadThumbnail(file)
      }
    })
  },
  { immediate: true, deep: true }
)

const quickLookFile = async (file: File & { path?: string }): Promise<void> => {
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

const onDragStart = (event: DragEvent): void => {
  console.log(event)
  files.value = []
  event.preventDefault()
  const fileData = files.value?.map((file) => file.path || '').filter((path) => path !== '')
  window.api.file.startDrag(fileData || [])
}
</script>

<template>
  <div class="flex flex-col items-center" @dragstart="onDragStart">
    <TransitionGroup
      name="file"
      tag="div"
      class="relative w-16 h-16 flex items-center justify-center mb-3"
    >
      <Cloud v-if="files?.length === 0" class="w-16 h-16" />

      <template v-for="(file, index) in displayFiles" :key="file.name + file.size">
        <img
          v-if="getThumbnailOrIcon(file)"
          :src="getThumbnailOrIcon(file)!"
          class="absolute w-14 h-14 rounded object-contain select-none drop-shadow-lg drop-shadow-black/20 dark:drop-shadow-black/50 transition-all duration-200 cursor-grab active:cursor-grabbing"
          draggable="true"
          alt="File icon"
          :style="{
            transform: `rotate(${getRotation(index)}deg)`,
            zIndex: displayFiles ? displayFiles.length - index : 0,
            left: `${index * 2}px`,
            top: `${index * 2}px`
          }"
          @click="quickLookFile(file)"
        />
        <div
          v-else
          class="absolute w-14 h-14 text-4xl select-none transition-all duration-200 outlined cursor-grab active:cursor-grabbing"
          draggable="true"
          :style="{
            transform: `rotate(${getRotation(index)}deg)`,
            zIndex: displayFiles ? displayFiles.length - index : 0,
            left: `${index * 2}px`,
            top: `${index * 2}px`
          }"
        >
          📄
        </div>
      </template>
    </TransitionGroup>
    <p
      v-if="displayFiles && displayFiles.length > 0"
      class="text-xs select-none font-medium text-center dark:text-white/70 text-black/70"
    >
      <span
        class="inline-block truncate align-middle"
        title="{{ displayFiles[0].name }}"
        :class="{
          'max-w-[4em]': files && files.length > 1,
          'max-w-[16em]': files && files.length === 1
        }"
      >
        {{ displayFiles[0].name }}
      </span>
      {{ files && files.length > 1 ? `and ${files.length - 1} more file(s)` : '' }}
    </p>
  </div>
</template>

<style scoped>
.file-enter-active,
.file-leave-active {
  transition: all 0.4s ease;
}

.file-enter-from,
.file-leave-to {
  opacity: 0;
  filter: blur(6px);
  scale: 0.5;
}

.outlined {
  filter: drop-shadow(1px 0 0 white) drop-shadow(0 1px 0 white) drop-shadow(-1px 0 0 white)
    drop-shadow(0 -1px 0 white);
  /* You can add more drop shadows for a thicker or smoother border */
}
</style>
