<template>
  <Menubar id="mainMenu" :model="items">
    <template #item="{ item, props }">
      <a v-bind="props.action">
        <span>{{ item.label }}</span>
        <span
          v-if="item.shortcut"
          class="ml-auto border border-surface rounded bg-emphasis text-muted-color text-xs p-1"
          >{{ item.shortcut }}</span
        >
      </a>
    </template>
  </Menubar>
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core'

import * as vue from 'vue'

import * as common from '../common'

const emit = defineEmits(['about', 'open', 'openRemote', 'settings'])

const items = [
  {
    label: 'File',
    items: [
      {
        label: 'Open...',
        shortcut: common.isMacOS() ? '⌘⌥O' : 'Ctrl+Alt+O',
        command: () => {
          emit('open')
        }
      },
      {
        label: 'Open Remote...',
        shortcut: common.isMacOS() ? '⇧⌘⌥O' : 'Ctrl+Shift+Alt+O',
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

  if (mainMenu !== null) {
    const observer = new MutationObserver(() => {
      if (mainMenu.className.includes('p-menubar-mobile')) {
        mainMenu.classList.remove('p-menubar-mobile')
      }
    })

    observer.observe(mainMenu, { attributes: true })
  }
})

// Keyboard shortcuts.

vueusecore.onKeyStroke((event) => {
  if (common.isCtrlOrCmd(event) && !event.shiftKey && event.code === 'KeyO') {
    emit('open')
  } else if (common.isCtrlOrCmd(event) && event.shiftKey && event.code === 'KeyO') {
    emit('openRemote')
  }
})
</script>
