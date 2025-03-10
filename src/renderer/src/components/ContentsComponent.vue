<template>
  <BackgroundComponent v-show="fileTabs.length === 0" />
  <Tabs v-model:value="activeFileValue">
    <TabList>
      <Tab v-for="fileTab in fileTabs" :key="'Tab_' + fileTab.value" :value="fileTab.value">{{ fileTab.title }}</Tab>
    </TabList>
    <TabPanels>
      <TabPanel v-for="fileTab in fileTabs" :key="'TabPanel_' + fileTab.value" :value="fileTab.value">
        <div>
          <strong>File path:</strong>
          <pre style="margin-top: 0.1rem">{{ fileTab.value }}</pre>
        </div>
        <div style="margin-top: 1rem">
          <strong>Uint8Array:</strong>
          <pre style="margin-top: 0.1rem">{{ fileTab.uint8Array }}</pre>
        </div>
        <div style="margin-top: 1rem">
          <strong>Base64:</strong>
          <pre style="margin-top: 0.1rem">{{ fileTab.base64 }}</pre>
        </div>
        <div style="margin-top: 1rem">
          <strong>Raw contents:</strong>
          <pre style="margin-top: 0.1rem">{{ fileTab.rawContents }}</pre>
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
  const filePath = file.path()
  const fileContents = file.contents()

  fileTabs.value.push({
    value: filePath,
    title: filePath.split('/').pop() ?? '',
    uint8Array: String(fileContents),
    base64: btoa(fileContents.reduce((data, byte) => data + String.fromCharCode(byte), '')),
    rawContents: new TextDecoder().decode(fileContents)
  })

  activeFileValue.value = filePath
}

function hasFile(filePath: string): boolean {
  return fileTabs.value.some((fileTab) => fileTab.value === filePath)
}

function selectFile(filePath: string): void {
  activeFileValue.value = filePath
}
</script>
