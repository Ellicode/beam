import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Settings from '../views/Settings.vue'
import AddDevice from '@renderer/views/AddDevice.vue'
import PasswordSetup from '@renderer/views/PasswordSetup.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      meta: {
        windowTitle: 'File Transfer App'
      },
      component: Home
    },
    {
      path: '/settings',
      name: 'settings',
      meta: {
        windowTitle: 'Settings'
      },
      component: Settings
    },
    {
      path: '/add-device',
      name: 'add-device',
      meta: {
        windowTitle: 'Add Device'
      },
      component: AddDevice
    },
    {
      path: '/password-setup',
      name: 'password-setup',
      meta: {
        windowTitle: 'Password Setup'
      },
      component: PasswordSetup
    }
  ]
})

export default router
