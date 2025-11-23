<script setup lang="ts">
const model = defineModel<boolean>({ default: false })

function toggle(): void {
  model.value = !model.value
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none dark:focus:ring-offset-neutral-900"
    :class="model ? 'bg-yellow-600 dark:bg-yellow-500' : 'bg-neutral-300 dark:bg-neutral-600'"
    @click="toggle"
  >
    <span
      class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
      :class="model ? 'translate-x-[18px]' : 'translate-x-0.5'"
    />
  </button>
</template>
