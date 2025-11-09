<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="w-screen h-screen flex flex-col">
    <header class="w-full h-8 px-3 flex items-center justify-end" style="-webkit-app-region: drag">
      <h1 class="text-sm select-none font-medium dark:text-white/50 text-black/50">
        {{ route.meta.windowTitle }}
      </h1>
    </header>
    <router-view />
  </div>
</template>
