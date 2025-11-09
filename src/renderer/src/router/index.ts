import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Settings from '../views/Settings.vue'
import AddDevice from '@renderer/views/AddDevice.vue'

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
    }
  ]
})

export default router
