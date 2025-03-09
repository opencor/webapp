<template>
  <BackgroundComponent v-show="fileTabs.length === 0" />
  <Tabs v-model:value="activeFileValue">
    <TabList>
      <Tab v-for="fileTab in fileTabs" :key="'Tab_' + fileTab.value" :value="fileTab.value">{{ fileTab.title }}</Tab>
    </TabList>
    <TabPanels>
      <TabPanel v-for="fileTab in fileTabs" :key="'TabPanel_' + fileTab.value" :value="fileTab.value">
        <p class="m-0">{{ fileTab.contents }}</p>
      </TabPanel>
    </TabPanels>
  </Tabs>
</template>

<script setup lang="ts">
import * as vue from 'vue'

import * as locAPI from '../../../libopencor/locAPI'

interface FileTab {
  title: string
  contents: string
  value: string
}

const fileTabs = vue.ref<FileTab[]>([])
const activeFileValue = vue.ref()

defineExpose({ addFile })

export interface ContentsComponent {
  addFile(file: locAPI.File): void
}

function addFile(file: locAPI.File): void {
  const fileTab = fileTabs.value.find(fileTab => fileTab.value === file.path())

  if (fileTab !== undefined) {
    activeFileValue.value = fileTab.value

    return
  }

  const fileName = file.path().split('/').pop() ?? ''

  fileTabs.value.push({ title: fileName, contents: new TextDecoder().decode(file.contents()), value: file.path() })

  activeFileValue.value = file.path()
}
</script>
