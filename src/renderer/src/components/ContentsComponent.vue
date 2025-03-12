<template>
  <BackgroundComponent v-if="fileTabs.length === 0" />
  <Tabs v-else v-model:value="activeFileValue" :scrollable="true" :selectOnFocus="true">
    <TabList class="tablist">
      <Tab
        v-for="fileTab in fileTabs"
        :id="'Tab_' + fileTab.value"
        :key="'Tab_' + fileTab.value"
        :value="fileTab.value"
      >
        <div class="flex gap-2 items-center">
          <div>
            {{ fileTab.title }}
          </div>
          <div class="pi pi-times remove-button" />
        </div>
      </Tab>
    </TabList>
    <TabPanels>
      <TabPanel v-for="fileTab in fileTabs" :key="'TabPanel_' + fileTab.value" :value="fileTab.value">
        <div class="font-bold">
          <Panel header="File path">
            <p class="font-mono break-all">
              {{ fileTab.value }}
            </p>
          </Panel>
        </div>
        <div style="margin-top: 1rem">
          <Panel header="Uint8Array">
            <p class="font-mono break-all">
              {{ fileTab.uint8Array }}
            </p>
          </Panel>
        </div>
        <div style="margin-top: 1rem">
          <Panel header="Base64">
            <p class="font-mono break-all">
              {{ fileTab.base64 }}
            </p>
          </Panel>
        </div>
        <div style="margin-top: 1rem">
          <Panel header="Raw contents">
            <p class="font-mono break-all">
              {{ fileTab.rawContents }}
            </p>
          </Panel>
        </div>
      </TabPanel>
    </TabPanels>
  </Tabs>
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core'

import * as vue from 'vue'

import * as locAPI from '../../../libopencor/locAPI'

import * as common from '../common'

interface IFileTab {
  value: string
  title: string
  uint8Array: string
  base64: string
  rawContents: string
}

const fileTabs = vue.ref<IFileTab[]>([])
const activeFileValue = vue.ref<string>('')

defineExpose({ addFile, hasFile, selectFile })

export interface IContentsComponent {
  addFile(file: locAPI.File): void
  hasFile(filePath: string): boolean
  selectFile(filePath: string): void
}

function addFile(file: locAPI.File): void {
  function topContents(contents: string): string {
    const numberOfBytesShown = 1024

    return (
      contents.slice(0, Math.min(numberOfBytesShown, contents.length)) +
      (contents.length > numberOfBytesShown ? '...' : '')
    )
  }

  const filePath = file.path()
  const fileContents = file.contents()

  fileTabs.value.splice(fileTabs.value.findIndex((fileTab) => fileTab.value === activeFileValue.value) + 1, 0, {
    value: filePath,
    title: filePath.split('/').pop() ?? '',
    uint8Array: topContents(String(fileContents)),
    base64: topContents(btoa(fileContents.reduce((data, byte) => data + String.fromCharCode(byte), ''))),
    rawContents: topContents(new TextDecoder().decode(fileContents))
  })

  selectFile(filePath)
}

function hasFile(filePath: string): boolean {
  return fileTabs.value.find((fileTab) => fileTab.value === filePath) !== undefined
}

function selectFile(filePath: string): void {
  activeFileValue.value = filePath

  vue
    .nextTick()
    .then(() => {
      const tabElement = document.getElementById('Tab_' + filePath)

      if (tabElement !== null) {
        tabElement.scrollIntoView({ block: 'nearest' })
      }
    })
    .catch((error: unknown) => {
      console.error('Error scrolling to tab:', error)
    })
}

function selectNextFile(): void {
  const activeFileIndex = fileTabs.value.findIndex((fileTab) => fileTab.value === activeFileValue.value)
  const nextFileIndex = (activeFileIndex + 1) % fileTabs.value.length

  selectFile(fileTabs.value[nextFileIndex].value)
}

function selectPreviousFile(): void {
  const activeFileIndex = fileTabs.value.findIndex((fileTab) => fileTab.value === activeFileValue.value)
  const nextFileIndex = (activeFileIndex - 1 + fileTabs.value.length) % fileTabs.value.length

  selectFile(fileTabs.value[nextFileIndex].value)
}

function closeCurrentFile(): void {
  locAPI.fileManager.unmanage(activeFileValue.value)

  const activeFileIndex = fileTabs.value.findIndex((fileTab) => fileTab.value === activeFileValue.value)

  fileTabs.value.splice(activeFileIndex, 1)

  if (fileTabs.value.length > 0) {
    selectFile(fileTabs.value[Math.min(activeFileIndex, fileTabs.value.length - 1)].value)
  } else {
    selectFile('')
  }
}

// Keyboard shortcuts.

vueusecore.onKeyStroke((event: KeyboardEvent) => {
  if (fileTabs.value.length === 0) {
    return
  }

  if (event.ctrlKey && !event.shiftKey && event.code === 'Tab') {
    selectNextFile()
  } else if (event.ctrlKey && event.shiftKey && event.code === 'Tab') {
    selectPreviousFile()
  } else if (common.isCtrlOrCmd(event) && !event.shiftKey && event.code === 'KeyW') {
    closeCurrentFile()
  }
})
</script>

<style scoped>
.remove-button {
  padding: 0.15rem;
  font-size: 0.75rem;
}

.remove-button:hover {
  border-radius: var(--p-border-radius-sm);
  background-color: var(--p-red-500);
  color: var(--p-red-50);
}

@media (prefers-color-scheme: dark) {
  .remove-button:hover {
    background-color: var(--p-red-400);
  }
}

.tablist {
  border-bottom: 1px solid var(--p-primary-color);
}
</style>
