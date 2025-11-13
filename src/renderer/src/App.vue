<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useOS } from './composables/useOS'
import { X } from 'lucide-vue-next'

const route = useRoute()

const closeActiveWindow = (): void => {
  window.electron.ipcRenderer.send('close-active-window')
}

const os = useOS()
</script>

<template>
  <div class="w-screen h-screen flex flex-col" v-if="!route.meta.isOverlay">
    <header
      class="w-full h-8 px-3 flex items-center justify-between shrink-0"
      :class="{
        'flex-row': os.isMac,
        'flex-row-reverse': !os.isMac
      }"
      style="-webkit-app-region: drag"
    >
      <button
        v-if="route.meta.isModal"
        style="-webkit-app-region: no-drag"
        class="w-5 h-5 rounded-md flex items-center justify-center dark:text-white/50 text-black/50 dark:hover:bg-white/10 hover:bg-black/10"
        @click="closeActiveWindow"
      >
        <X class="w-4 h-4" />
      </button>
      <h1
        class="text-sm select-none font-medium dark:text-white/50 text-black/50"
        :class="{
          'ms-auto': os.isMac && !route.meta.isModal,
          'me-auto': !os.isMac && !route.meta.isModal
        }"
      >
        {{ route.meta.windowTitle }}
      </h1>
    </header>
    <div class="flex-1 overflow-auto">
      <router-view />
    </div>
  </div>
  <router-view v-else />
</template>
