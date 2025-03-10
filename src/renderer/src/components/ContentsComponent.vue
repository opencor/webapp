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
</script>
