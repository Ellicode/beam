import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Settings from '../views/Settings.vue'
import AddDevice from '@renderer/views/AddDevice.vue'
import PasswordSetup from '@renderer/views/PasswordSetup.vue'
import Overlay from '@renderer/views/Overlay.vue'
import About from '@renderer/views/About.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      meta: {
        windowTitle: 'Beam'
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
        windowTitle: 'Add Device',
        isModal: true
      },
      component: AddDevice
    },
    {
      path: '/password-setup',
      name: 'password-setup',
      meta: {
        windowTitle: 'Password Setup',
        isModal: true
      },
      component: PasswordSetup
    },
    {
      path: '/overlay',
      name: 'overlay',
      meta: {
        windowTitle: 'Overlay',
        isOverlay: true
      },
      component: Overlay
    },
    {
      path: '/about',
      name: 'about',
      meta: {
        windowTitle: 'About'
      },
      component: About
    }
  ]
})

export default router
