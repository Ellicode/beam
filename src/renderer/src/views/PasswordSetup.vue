<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'

const hasPassword = ref(false)
const showPassword = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const passwordSuccess = ref('')

onMounted(async () => {
  hasPassword.value = await window.api.settings.hasPassword()
})

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
    passwordSuccess.value = 'Password set successfully!'
    setTimeout(() => {
      window.electron.ipcRenderer.send('close-password-setup')
    }, 1500)
  } catch (error) {
    passwordError.value = 'Failed to set password'
    console.error('Password setup error:', error)
  }
}

const closeModal = (): void => {
  window.electron.ipcRenderer.send('close-password-setup')
}
</script>

<template>
  <div class="h-screen flex flex-col dark:text-white text-black">
    <!-- Content -->
    <div class="flex-1 p-3 flex flex-col">
      <div class="mb-3">
        <h2 class="text-sm font-semibold mb-1">
          {{ hasPassword ? 'Change Password' : 'Set Password' }}
        </h2>
        <p v-if="passwordError" class="text-xs dark:text-red-400 text-red-500">
          {{ passwordError }}
        </p>

        <p v-else class="text-xs dark:text-neutral-400 text-neutral-500">
          {{
            hasPassword
              ? 'Update your super secret password to secure peer connections.'
              : 'Set a super secret password to secure peer connections. Other devices will need this password to send files to you.'
          }}
        </p>
      </div>

      <div class="space-y-4 flex-1">
        <div>
          <label class="text-xs dark:text-neutral-400 text-neutral-500 select-none mb-1 block"
            >New Password</label
          >
          <div class="relative">
            <input
              v-model="newPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Enter password (min 8 characters)"
              class="w-full dark:bg-white/5 bg-black/5 dark:text-white text-black rounded-lg text-sm px-3 py-2.5 outline-0 focus:ring-2 ring-blue-500 pr-10"
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

        <div>
          <label class="text-xs dark:text-neutral-400 text-neutral-500 select-none mb-1 block"
            >Confirm Password</label
          >
          <input
            v-model="confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Re-enter password"
            class="w-full dark:bg-white/5 bg-black/5 dark:text-white text-black rounded-lg text-sm px-3 py-2.5 outline-0 focus:ring-2 ring-blue-500"
            @keyup.enter="setPassword"
          />
        </div>
      </div>

      <div class="flex gap-2 mt-6">
        <button
          class="flex-1 px-4 py-2.5 rounded-xl text-sm dark:bg-white/10 bg-black/10 transition-colors"
          @click="closeModal"
        >
          Cancel
        </button>
        <button
          class="flex-1 px-4 py-2.5 rounded-xl text-sm bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!newPassword || !confirmPassword"
          @click="setPassword"
        >
          {{ hasPassword ? 'Update Password' : 'Set Password' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drag-region {
  -webkit-app-region: drag;
}

.no-drag {
  -webkit-app-region: no-drag;
}
</style>
