<template>
  <BackgroundComponent v-show="fileTabs.length === 0" />
  <Tabs value="0">
    <TabList>
      <Tab v-for="fileTab in fileTabs" :key="fileTab.title" :value="fileTab.value">{{ fileTab.title }}</Tab>
    </TabList>
    <TabPanels>
      <TabPanel v-for="fileTab in fileTabs" :key="fileTab.content" :value="fileTab.value">
        <p class="m-0">{{ fileTab.content }}</p>
      </TabPanel>
    </TabPanels>
  </Tabs>
</template>

<script setup lang="ts">
import * as vue from 'vue'

interface FileTab {
  title: string;
  content: string;
  value: string;
}

const fileTabs = vue.ref<FileTab[]>([])

vue.onMounted(() => {
  fileTabs.value = [
    { title: 'File 1', content: 'Content 1', value: '0' },
    { title: 'File 2', content: 'Content 2', value: '1' }
  ]
})

defineExpose({ addFile })

function addFile(): void {
  fileTabs.value.push({ title: 'File 3', content: 'Content 3', value: '2' })
}
</script>
