<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  min?: number
  max?: number
  step?: number
  localUpdate?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 0,
  localUpdate: false,
  disabled: false,
  width: '100%'
})

const model = defineModel<number>({ default: 0 })

const isDragging = ref(false)
const sliderRef = ref<HTMLDivElement | null>(null)
const localValue = ref<number>(0)

// Calculate step positions for dots (only if step > 0)
const steps = computed(() => {
  if (props.step <= 0) return []

  const stepCount = Math.floor((props.max - props.min) / props.step) + 1
  const positions: number[] = []
  for (let i = 0; i < stepCount; i++) {
    positions.push((i / (stepCount - 1)) * 100)
  }
  return positions
})

// Use local value while dragging if localUpdate is enabled, otherwise use model
const displayValue = computed(() => {
  return props.localUpdate && isDragging.value ? localValue.value : model.value
})

// Calculate thumb position as percentage
const thumbPosition = computed(() => {
  const range = props.max - props.min
  const normalizedValue = displayValue.value - props.min
  return (normalizedValue / range) * 100
})

function updateValue(clientX: number, commitImmediately = false): void {
  if (!sliderRef.value) return

  const rect = sliderRef.value.getBoundingClientRect()
  const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  const range = props.max - props.min
  const rawValue = percentage * range + props.min

  // Snap to nearest step if step > 0, otherwise use continuous value
  const finalValue = props.step > 0 ? Math.round(rawValue / props.step) * props.step : rawValue
  const clampedValue = Math.max(props.min, Math.min(props.max, finalValue))

  if (props.localUpdate && !commitImmediately) {
    // Update local value only while dragging
    localValue.value = clampedValue
  } else {
    // Update model immediately
    model.value = clampedValue
  }
}

function handleMouseDown(event: MouseEvent): void {
  if (props.disabled) return

  isDragging.value = true
  localValue.value = model.value // Initialize local value
  updateValue(event.clientX)

  const handleMouseMove = (e: MouseEvent): void => {
    if (isDragging.value) {
      updateValue(e.clientX)
    }
  }

  const handleMouseUp = (): void => {
    isDragging.value = false
    // Commit the local value to model when releasing
    if (props.localUpdate) {
      model.value = localValue.value
    }
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function handleKeyDown(event: KeyboardEvent): void {
  if (props.disabled) return

  // Use step for keyboard navigation, or 1% of range if step is 0
  const keyStep = props.step > 0 ? props.step : (props.max - props.min) * 0.01

  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    event.preventDefault()
    model.value = Math.max(props.min, model.value - keyStep)
  } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    event.preventDefault()
    model.value = Math.min(props.max, model.value + keyStep)
  } else if (event.key === 'Home') {
    event.preventDefault()
    model.value = props.min
  } else if (event.key === 'End') {
    event.preventDefault()
    model.value = props.max
  }
}
</script>

<template>
  <div
    ref="sliderRef"
    role="slider"
    :tabindex="disabled ? -1 : 0"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="displayValue"
    :aria-disabled="disabled"
    class="relative flex h-5 items-center focus:outline-none transition-opacity"
    :class="disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'"
    :style="{ width: typeof width === 'number' ? width + 'px' : width }"
    @mousedown="handleMouseDown"
    @keydown="handleKeyDown"
  >
    <!-- Track -->
    <div class="relative h-1 w-full rounded-full bg-neutral-300 dark:bg-neutral-600">
      <!-- Active track -->
      <div
        class="absolute h-full rounded-full"
        :class="
          disabled ? 'bg-neutral-400 dark:bg-neutral-500' : 'bg-yellow-600 dark:bg-yellow-500'
        "
        :style="{ width: `${thumbPosition}%` }"
      />

      <!-- Step dots -->
      <div
        v-for="(position, index) in steps"
        :key="index"
        class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-1 w-1 rounded-full transition-colors"
        :class="
          position <= thumbPosition
            ? 'bg-yellow-800 dark:bg-yellow-300'
            : 'bg-neutral-400 dark:bg-neutral-500'
        "
        :style="{ left: `${position}%` }"
      />
    </div>

    <!-- Thumb -->
    <div
      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-white shadow-md transition-transform"
      :class="isDragging ? 'scale-110' : 'scale-100'"
      :style="{ left: `${thumbPosition}%` }"
    />
  </div>
</template>
