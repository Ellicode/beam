<script setup lang="ts">
// package.json version will be injected at build time
const appVersion = (import.meta.env.VITE_APP_VERSION as string) || '1.-.- DEV'
</script>

<template>
  <div
    class="flex flex-col justify-center h-full items-center text-center dark:text-neutral-100 p-5"
  >
    <img src="../assets/electron.svg" alt="App Logo" class="w-12 h-12 mb-4" />
    <h1 class="text-xl font-bold mb-4">File Transfer App</h1>
    <p class="mb-4 text-sm dark:text-neutral-300 text-neutral-600">
      File Transfer App is an open-source application that allows you to easily transfer files
      between devices on the same network.
    </p>

    <p class="mb-4 text-sm dark:text-neutral-300 text-neutral-600">
      Made with ❤️ by
      <a href="https://ellicode.com" class="text-blue-500 underline" target="_blank">Ellicode</a>.
    </p>
    <p class="mb-4 text-xs dark:text-neutral-500 text-neutral-400">Version {{ appVersion }}</p>
  </div>
</template>
