<template>
  <BackgroundComponent v-show="fileTabs.length === 0" />
  <Tabs v-model:value="activeFileValue">
    <TabList>
      <Tab v-for="fileTab in fileTabs" :key="'Tab_' + fileTab.value" :value="fileTab.value">{{ fileTab.title }}</Tab>
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

  activeFileValue.value = filePath
}

function hasFile(filePath: string): boolean {
  return fileTabs.value.find((fileTab) => fileTab.value === filePath) !== undefined
}

function selectFile(filePath: string): void {
  activeFileValue.value = filePath
}

function selectNextFile(): void {
  const activeFileIndex = fileTabs.value.findIndex((fileTab) => fileTab.value === activeFileValue.value)
  const nextFileIndex = (activeFileIndex + 1) % fileTabs.value.length

  activeFileValue.value = fileTabs.value[nextFileIndex].value
}

function selectPreviousFile(): void {
  const activeFileIndex = fileTabs.value.findIndex((fileTab) => fileTab.value === activeFileValue.value)
  const nextFileIndex = (activeFileIndex - 1 + fileTabs.value.length) % fileTabs.value.length

  activeFileValue.value = fileTabs.value[nextFileIndex].value
}

function closeCurrentFile(): void {
  locAPI.fileManager.unmanage(activeFileValue.value)

  const activeFileIndex = fileTabs.value.findIndex((fileTab) => fileTab.value === activeFileValue.value)

  fileTabs.value.splice(activeFileIndex, 1)

  if (fileTabs.value.length > 0) {
    activeFileValue.value = fileTabs.value[Math.min(activeFileIndex, fileTabs.value.length - 1)].value
  } else {
    activeFileValue.value = ''
  }
}

// Keyboard shortcuts.

vueusecore.onKeyStroke((event) => {
  if (event.ctrlKey && !event.shiftKey && event.code === 'Tab') {
    selectNextFile()
  } else if (event.ctrlKey && event.shiftKey && event.code === 'Tab') {
    selectPreviousFile()
  } else if (event.ctrlKey && !event.shiftKey && event.code === 'KeyW') {
    closeCurrentFile()
  }
})
</script>
