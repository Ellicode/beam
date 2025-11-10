<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useOS } from './composables/useOS'

const route = useRoute()

const os = useOS()
</script>

<template>
  <div class="w-screen h-screen flex flex-col">
    <header
      class="w-full h-8 px-3 flex items-center shrink-0"
      :class="{
        'justify-end': os.isMac,
        'justify-start': !os.isMac
      }"
      style="-webkit-app-region: drag"
    >
      <h1 class="text-sm select-none font-medium dark:text-white/50 text-black/50">
        {{ route.meta.windowTitle }}
      </h1>
    </header>
    <router-view />
  </div>
</template>
