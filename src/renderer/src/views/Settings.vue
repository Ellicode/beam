<script setup lang="ts">
import { FolderSync, UserRoundPen, FolderDown, Lock, Eye, EyeOff } from 'lucide-vue-next'
import Switch from '../components/Switch.vue'
import { useSettings } from '../composables/useSettings'
import { ref, watch, onMounted } from 'vue'

const { useSetting } = useSettings()
const transferOnDrop = useSetting('transferOnDrop')
const deviceName = useSetting('deviceName')
const downloadPath = useSetting('downloadPath')

const displayPath = ref(downloadPath.value || '')
const hasPassword = ref(false)
const showPasswordSetup = ref(false)
const showPassword = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const passwordSuccess = ref('')

watch(downloadPath, (newPath) => {
  displayPath.value = newPath || ''
})

onMounted(async () => {
  hasPassword.value = await window.api.settings.hasPassword()
})

const selectDownloadFolder = async (): Promise<void> => {
  const selectedPath = await window.api.settings.selectDownloadPath()
  if (selectedPath) {
    displayPath.value = selectedPath
  }
}

const togglePasswordSetup = (): void => {
  showPasswordSetup.value = !showPasswordSetup.value
  newPassword.value = ''
  confirmPassword.value = ''
  passwordError.value = ''
  passwordSuccess.value = ''
  showPassword.value = false
}

const setPassword = async (): Promise<void> => {
  passwordError.value = ''
  passwordSuccess.value = ''

  if (newPassword.value.length < 8) {
    passwordError.value = 'Password must be at least 8 characters'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Passwords do not match'
    return
  }

  try {
    await window.api.settings.setPassword(newPassword.value)
    hasPassword.value = true
    passwordSuccess.value = 'Password set successfully'
    setTimeout(() => {
      showPasswordSetup.value = false
      newPassword.value = ''
      confirmPassword.value = ''
      passwordSuccess.value = ''
    }, 1500)
  } catch (error) {
    passwordError.value = 'Failed to set password'
    console.error('Password setup error:', error)
  }
}
</script>

<template>
  <div class="p-5 dark:text-neutral-100 text-neutral-900">
    <h2 class="uppercase text-xs mb-4 dark:text-neutral-400 text-neutral-500 select-none">
      General
    </h2>
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <FolderSync class="w-5 h-5 me-4" />
        <div>
          <h3 class="font-semibold text-sm select-none">Enable Transfer on Drop</h3>
          <p class="text-xs dark:text-neutral-400 text-neutral-500 select-none">
            Automatically transfer files when they are dropped into the application.
          </p>
        </div>
      </div>
      <Switch v-model="transferOnDrop" />
    </div>
    <h2 class="uppercase text-xs my-4 dark:text-neutral-400 text-neutral-500 select-none">Files</h2>
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center flex-1">
        <FolderDown class="w-5 h-5 me-4" />
        <div class="flex-1">
          <h3 class="font-semibold text-sm select-none">Download Location</h3>
          <p class="text-xs dark:text-neutral-400 text-neutral-500 select-none truncate max-w-md">
            {{ displayPath || 'Not set' }}
          </p>
        </div>
      </div>
      <button
        class="dark:bg-neutral-800 bg-neutral-200 dark:text-white text-black rounded-lg text-sm px-3 py-1.5 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
        @click="selectDownloadFolder"
      >
        Choose Folder
      </button>
    </div>
    <h2 class="uppercase text-xs my-4 dark:text-neutral-400 text-neutral-500 select-none">
      Connectivity
    </h2>
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center">
        <UserRoundPen class="w-5 h-5 me-4" />
        <div>
          <h3 class="font-semibold text-sm select-none">Device name</h3>
          <p class="text-xs dark:text-neutral-400 text-neutral-500 select-none">
            Use a unique name to identify your device.
          </p>
        </div>
      </div>
      <input
        v-model="deviceName"
        type="text"
        class="dark:bg-neutral-800 bg-neutral-200 dark:text-white text-black rounded-lg text-sm px-2 ms-5 w-60 py-1 outline-0 focus:ring-2 ring-offset-1 dark:ring-offset-neutral-900 ring-blue-500"
        placeholder="My computer"
      />
    </div>
    <h2 class="uppercase text-xs my-4 dark:text-neutral-400 text-neutral-500 select-none">
      Security
    </h2>
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center flex-1">
        <Lock class="w-5 h-5 me-4" />
        <div>
          <h3 class="font-semibold text-sm select-none">Super Secret Password</h3>
          <p class="text-xs dark:text-neutral-400 text-neutral-500 select-none">
            {{ hasPassword ? 'Password is set' : 'Set a password to secure peer connections' }}
          </p>
        </div>
      </div>
      <button
        class="dark:bg-neutral-800 bg-neutral-200 dark:text-white text-black rounded-lg text-sm px-3 py-1.5 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
        @click="togglePasswordSetup"
      >
        {{ hasPassword ? 'Change Password' : 'Set Password' }}
      </button>
    </div>

    <!-- Password Setup Form -->
    <div
      v-if="showPasswordSetup"
      class="mt-3 p-4 dark:bg-neutral-800 bg-neutral-100 rounded-lg border dark:border-white/10 border-black/10"
    >
      <div class="mb-3">
        <label class="text-xs dark:text-neutral-400 text-neutral-500 select-none mb-1 block"
          >New Password</label
        >
        <div class="relative">
          <input
            v-model="newPassword"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Enter password (min 8 characters)"
            class="w-full dark:bg-neutral-900 bg-white dark:text-white text-black rounded-lg text-sm px-3 py-2 outline-0 focus:ring-2 ring-blue-500 pr-10"
            @keyup.enter="setPassword"
          />
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 dark:text-neutral-400 text-neutral-500 hover:dark:text-white hover:text-black transition-colors"
            @click="showPassword = !showPassword"
          >
            <Eye v-if="!showPassword" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
        </div>
      </div>
      <div class="mb-3">
        <label class="text-xs dark:text-neutral-400 text-neutral-500 select-none mb-1 block"
          >Confirm Password</label
        >
        <input
          v-model="confirmPassword"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Re-enter password"
          class="w-full dark:bg-neutral-900 bg-white dark:text-white text-black rounded-lg text-sm px-3 py-2 outline-0 focus:ring-2 ring-blue-500"
          @keyup.enter="setPassword"
        />
      </div>
      <p v-if="passwordError" class="text-xs text-red-500 mb-2">{{ passwordError }}</p>
      <p v-if="passwordSuccess" class="text-xs text-green-500 mb-2">{{ passwordSuccess }}</p>
      <div class="flex gap-2">
        <button
          class="flex-1 px-4 py-2 rounded-lg text-sm dark:bg-white/10 bg-black/10 hover:dark:bg-white/20 hover:bg-black/20 transition-colors"
          @click="togglePasswordSetup"
        >
          Cancel
        </button>
        <button
          class="flex-1 px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!newPassword || !confirmPassword"
          @click="setPassword"
        >
          Save Password
        </button>
      </div>
    </div>
  </div>
</template>
