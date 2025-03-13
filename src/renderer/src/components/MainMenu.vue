<template>
  <Menubar id="mainMenu" :model="items">
    <template #item="{ item, props }">
      <a v-bind="props.action">
        <span class="p-menubar-item-label">{{ item.label }}</span>
        <svg v-if="item.items" width="14" height="14" viewBox="0 0 14 14" class="ml-auto p-icon p-menubar-submenu-icon">
          <path
            d="M5.25 11.1728C5.14929 11.1694 5.05033 11.1455 4.9592 11.1025C4.86806 11.0595 4.78666 10.9984 4.72 10.9228C4.57955 10.7822 4.50066 10.5916 4.50066 10.3928C4.50066 10.1941 4.57955 10.0035 4.72 9.86283L7.72 6.86283L4.72 3.86283C4.66067 3.71882 4.64765 3.55991 4.68275 3.40816C4.71785 3.25642 4.79932 3.11936 4.91585 3.01602C5.03238 2.91268 5.17819 2.84819 5.33305 2.83149C5.4879 2.81479 5.64411 2.84671 5.78 2.92283L9.28 6.42283C9.42045 6.56346 9.49934 6.75408 9.49934 6.95283C9.49934 7.15158 9.42045 7.34221 9.28 7.48283L5.78 10.9228C5.71333 10.9984 5.63193 11.0595 5.5408 11.1025C5.44966 11.1455 5.35071 11.1694 5.25 11.1728Z"
            fill="currentColor"
          />
        </svg>
        <span v-if="item.shortcut" class="ml-auto border border-surface rounded bg-emphasis text-xs/3">{{
          item.shortcut
        }}</span>
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
