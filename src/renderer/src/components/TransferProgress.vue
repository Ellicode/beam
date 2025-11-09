<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle, XCircle, Loader2 } from 'lucide-vue-next'

interface Props {
  fileName: string
  fileSize: number
  bytesTransferred: number
  percentage: number
  status: 'pending' | 'transferring' | 'completed' | 'error'
  error?: string
}

const props = defineProps<Props>()

const formattedSize = computed(() => {
  const mb = props.fileSize / (1024 * 1024)
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`
  }
  return `${(props.fileSize / 1024).toFixed(2)} KB`
})

const formattedTransferred = computed(() => {
  const mb = props.bytesTransferred / (1024 * 1024)
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`
  }
  return `${(props.bytesTransferred / 1024).toFixed(2)} KB`
})

const statusColor = computed(() => {
  switch (props.status) {
    case 'completed':
      return 'text-green-500'
    case 'error':
      return 'text-red-500'
    case 'transferring':
      return 'text-blue-500'
    default:
      return 'text-gray-500'
  }
})
</script>

<template>
  <div
    class="w-full p-3 rounded-lg dark:bg-white/5 bg-black/5 border border-black/5 dark:border-white/5"
  >
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <Loader2
          v-if="status === 'transferring' || status === 'pending'"
          :class="['w-4 h-4 animate-spin', statusColor]"
        />
        <CheckCircle v-else-if="status === 'completed'" :class="['w-4 h-4', statusColor]" />
        <XCircle v-else-if="status === 'error'" :class="['w-4 h-4', statusColor]" />

        <span class="text-sm truncate dark:text-white/70 text-black/70">{{ fileName }}</span>
      </div>
      <span class="text-xs dark:text-white/50 text-black/50 ml-2 shrink-0">
        {{ percentage }}%
      </span>
    </div>

    <!-- Progress bar -->
    <div class="w-full h-1.5 rounded-full dark:bg-white/10 bg-black/10 overflow-hidden mb-1">
      <div
        class="h-full transition-all duration-300 rounded-full"
        :class="{
          'bg-blue-500': status === 'transferring',
          'bg-green-500': status === 'completed',
          'bg-red-500': status === 'error',
          'bg-gray-400': status === 'pending'
        }"
        :style="{ width: `${percentage}%` }"
      />
    </div>

    <!-- Size info -->
    <div class="flex justify-between text-[0.65rem] dark:text-white/40 text-black/40">
      <span v-if="status === 'transferring' || status === 'completed'">
        {{ formattedTransferred }} / {{ formattedSize }}
      </span>
      <span v-else>{{ formattedSize }}</span>

      <span v-if="error" class="text-red-500">{{ error }}</span>
      <span v-else-if="status === 'pending'">Waiting...</span>
      <span v-else-if="status === 'transferring'">Transferring...</span>
      <span v-else-if="status === 'completed'">Complete</span>
    </div>
  </div>
</template>
