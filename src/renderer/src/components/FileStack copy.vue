<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  files: Array<File & { path?: string }>
}

const props = defineProps<Props>()

// Show max 3 files in the stack
const displayFiles = computed(() => props.files.slice(-3).reverse())

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
  () => props.files,
  (newFiles) => {
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
</script>

<template>
  <TransitionGroup
    name="file"
    tag="div"
    class="relative w-24 h-24 flex items-center justify-center"
  >
    <div
      v-for="(file, index) in displayFiles"
      :key="file.name + file.size"
      class="absolute w-16 h-20 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-black/10 dark:border-white/10 flex flex-col items-center justify-center p-2 transition-all duration-200"
      :style="{
        transform: `rotate(${getRotation(index)}deg) translateY(${index * -2}px)`,
        zIndex: displayFiles.length - index
      }"
    >
      <img
        v-if="getThumbnailOrIcon(file)"
        :src="getThumbnailOrIcon(file)!"
        class="w-10 h-10 mb-1 rounded object-contain select-none"
        draggable="false"
        alt="File icon"
      />
      <div v-else class="text-2xl mb-1 select-none">📄</div>
      <span class="text-[8px] select-none font-medium truncate w-full text-center text-white">
        {{ file.name }}
      </span>
    </div>
  </TransitionGroup>
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

img.outlined {
  filter: drop-shadow(2px 0 0 white) drop-shadow(0 2px 0 white) drop-shadow(-2px 0 0 white)
    drop-shadow(0 -2px 0 white);
  /* You can add more drop shadows for a thicker or smoother border */
}
span.outlined {
  text-shadow:
    -1px -1px 0 #fff,
    1px -1px 0 #fff,
    -1px 1px 0 #fff,
    1px 1px 0 #fff;
}
</style>
