<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  percentage: number
  size?: number
  strokeWidth?: number
  color?: string
  backgroundColor?: string
  animated?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 120,
  strokeWidth: 8,
  color: '#f0b100',
  backgroundColor: '#e5e7eb',
  animated: true
})

const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const strokeDashoffset = computed(() => {
  const progress = Math.min(Math.max(props.percentage, 0), 100)
  return circumference.value - (progress / 100) * circumference.value
})

const centerX = computed(() => props.size / 2)
const centerY = computed(() => props.size / 2)
</script>

<template>
  <div
    class="relative inline-flex items-center justify-center"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <svg :width="size" :height="size" class="transform -rotate-90">
      <!-- Background circle -->
      <!-- <circle
        :cx="centerX"
        :cy="centerY"
        :r="radius"
        :stroke="backgroundColor"
        :stroke-width="strokeWidth"
        fill="none"
      /> -->

      <!-- Progress circle -->
      <circle
        :cx="centerX"
        :cy="centerY"
        :r="radius"
        :stroke="color"
        :stroke-width="strokeWidth"
        fill="none"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="strokeDashoffset"
        stroke-linecap="round"
        :class="{ 'transition-all duration-300 ease-out': animated }"
      />
    </svg>

    <!-- Slot for custom content in center -->
    <div class="absolute inset-0 flex items-center justify-center">
      <slot />
    </div>
  </div>
</template>
