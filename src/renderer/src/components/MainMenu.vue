<template>
  <Menubar id="mainMenu" :model="items" />
</template>

<script setup lang="ts">
import * as vue from 'vue'

const emit = defineEmits(['about', 'open', 'openRemote', 'settings'])

const items = [
  {
    label: 'File',
    items: [
      {
        label: 'Open...',
        command: () => {
          emit('open')
        }
      },
      {
        label: 'Open Remote...',
        command: () => {
          emit('openRemote')
        }
      }
    ]
  },
  {
    label: 'Tools',
    items: [
      {
        label: 'Settings...',
        command: () => {
          emit('settings')
        }
      }
    ]
  },
  {
    label: 'Help',
    items: [
      {
        label: 'Home Page',
        command: () => {
          window.open('https://opencor.ws/')
        }
      },
      { separator: true },
      {
        label: 'Report Issue',
        command: () => {
          window.open('https://github.com/opencor/webapp/issues/new')
        }
      },
      { separator: true },
      {
        label: 'About OpenCOR',
        command: () => {
          emit('about')
        }
      }
    ]
  }
]

// Never display our menu as a hamburger menu.

vue.onMounted(() => {
  const mainMenu = document.getElementById('mainMenu')

  if (mainMenu) {
    const observer = new MutationObserver(() => {
      if (mainMenu.className.includes('p-menubar-mobile')) {
        mainMenu.classList.remove('p-menubar-mobile')
      }
    })

    observer.observe(mainMenu, { attributes: true })
  }
})
</script>
