<script setup lang="ts">
import { useSettings } from '@renderer/composables/useSettings'
import { computed, onMounted, onUnmounted, ref } from 'vue'

const { useSetting } = useSettings()
const useHotCorners = useSetting('useHotCorners')
// Position hot corner based on user setting (as percentage of screen)
const hotCornerPosition = useSetting('hotCornerPosition')

// Track overlay bounds, including which display the overlay is on
const overlayBounds = ref({
  width: window.innerWidth,
  height: window.innerHeight,
  x: 0,
  y: 0
})

// Derive overlay dimensions for sizing calculations
const windowSize = computed(() => ({
  width: overlayBounds.value.width,
  height: overlayBounds.value.height
}))

const dragZoneSize = { width: 250, height: 250 }

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const normalizedHotCorner = computed(() => {
  const position = hotCornerPosition.value ?? { x: 1, y: 1 }
  return {
    x: clamp(position.x ?? 1, 0, 1),
    y: clamp(position.y ?? 1, 0, 1)
  }
})

const dragZonePosition = computed(() => {
  const { width, height } = windowSize.value
  const rightEdge = width * normalizedHotCorner.value.x
  const bottomEdge = height * normalizedHotCorner.value.y

  const left = clamp(
    Math.round(rightEdge - dragZoneSize.width),
    0,
    Math.max(width - dragZoneSize.width, 0)
  )
  const top = clamp(
    Math.round(bottomEdge - dragZoneSize.height),
    0,
    Math.max(height - dragZoneSize.height, 0)
  )

  return {
    left,
    top,
    right: left + dragZoneSize.width,
    bottom: top + dragZoneSize.height
  }
})

const overlayOpacity = ref(0)

const visibilityMargin = 200 // Increase margin for smoother fade

let wasInside = false
let dropzoneHidden = false
let detachMouseListener: (() => void) | null = null
let detachBoundsListener: (() => void) | null = null

const applyOverlayBounds = (bounds: {
  width: number
  height: number
  x: number
  y: number
}): void => {
  overlayBounds.value = { ...bounds }
}
let dropzoneEnterTimer: ReturnType<typeof setTimeout> | null = null
const hotCornerTriggerTimeoutMs = useSetting('hotCornerTriggerTimeoutMs')
const handleGlobalMouseMove = ({ x, y }: { x: number; y: number }): void => {
  const localX = x - overlayBounds.value.x
  const localY = y - overlayBounds.value.y

  const minX = dragZonePosition.value.left
  const minY = dragZonePosition.value.top
  const maxX = dragZonePosition.value.right
  const maxY = dragZonePosition.value.bottom

  // Fade overlay as mouse approaches drag zone
  const overlayMinX = minX - visibilityMargin
  const overlayMaxX = maxX + visibilityMargin
  const overlayMinY = minY - visibilityMargin
  const overlayMaxY = maxY + visibilityMargin

  // Calculate distance to drag zone edge
  let dx = 0
  let dy = 0
  if (localX < minX) dx = minX - localX
  else if (localX > maxX) dx = localX - maxX

  if (localY < minY) dy = minY - localY
  else if (localY > maxY) dy = localY - maxY

  const distance = Math.sqrt(dx * dx + dy * dy)

  // Only show overlay if not hidden
  let opacity = 0
  if (!dropzoneHidden) {
    if (
      localX >= overlayMinX &&
      localX <= overlayMaxX &&
      localY >= overlayMinY &&
      localY <= overlayMaxY
    ) {
      opacity = 1 - Math.min(distance / visibilityMargin, 1)
    }
  }
  overlayOpacity.value = opacity

  // Only summon when mouse is inside the drag zone for 300ms
  const isInside = localX >= minX && localX <= maxX && localY >= minY && localY <= maxY

  if (isInside && !wasInside && !dropzoneHidden && useHotCorners.value) {
    // Start timer
    dropzoneEnterTimer = setTimeout(() => {
      if (isInside && !dropzoneHidden && useHotCorners.value) {
        window.api.overlay.summonMainWindowAt({
          x: overlayBounds.value.x + minX,
          y: overlayBounds.value.y + minY
        })
        dropzoneHidden = true
        overlayOpacity.value = 0
      }
    }, hotCornerTriggerTimeoutMs.value)
  }

  // Cancel timer if mouse leaves before 300ms
  if (!isInside && wasInside) {
    if (dropzoneEnterTimer) {
      clearTimeout(dropzoneEnterTimer)
      dropzoneEnterTimer = null
    }
    if (dropzoneHidden) {
      dropzoneHidden = false
    }
  }

  wasInside = isInside
}

onMounted(() => {
  detachMouseListener = window.api.overlay.onGlobalMouseMove(handleGlobalMouseMove)
  window.api.overlay.startGlobalMouseTracking()

  window.api.overlay
    .getSize()
    .then((bounds) => {
      applyOverlayBounds(bounds)
    })
    .catch((error) => {
      console.error('Failed to fetch overlay size:', error)
    })

  detachBoundsListener = window.api.overlay.onBoundsChanged((bounds) => {
    applyOverlayBounds(bounds)
  })

  const handleResize = (): void => {
    overlayBounds.value = {
      ...overlayBounds.value,
      width: window.innerWidth,
      height: window.innerHeight
    }
  }
  window.addEventListener('resize', handleResize)
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  if (detachMouseListener) {
    detachMouseListener()
    detachMouseListener = null
  }
  if (detachBoundsListener) {
    detachBoundsListener()
    detachBoundsListener = null
  }
  window.api.overlay.stopGlobalMouseTracking()
})
</script>

<template>
  <div
    v-if="useHotCorners"
    class="absolute border-2 flex items-center justify-center border-dashed rounded-2xl border-white/30 pointer-events-none"
    :style="{
      width: dragZoneSize.width + 'px',
      height: dragZoneSize.height + 'px',
      top: dragZonePosition.top + 'px',
      left: dragZonePosition.left + 'px',
      opacity: overlayOpacity
    }"
  >
    <p class="text-white/50 text-sm select-none">Drop files here to transfer</p>
  </div>
</template>
