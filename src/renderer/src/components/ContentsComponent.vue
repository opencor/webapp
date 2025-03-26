<template>
  <BackgroundComponent v-if="fileTabs.length === 0" />
  <Tabs v-else v-model:value="activeFile" :scrollable="true" :selectOnFocus="true">
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
          <div class="pi pi-times remove-button" @mousedown.prevent @click.stop="closeFile(fileTab.value)" />
        </div>
      </Tab>
    </TabList>
    <TabPanels>
      <TabPanel v-for="fileTab in fileTabs" :key="'TabPanel_' + fileTab.value" :value="fileTab.value">
        <div v-if="fileTab.issues.length === 0">
          <Fieldset legend="File path">
            <p class="font-mono break-all">
              {{ fileTab.value }}
            </p>
          </Fieldset>
          <Fieldset class="mt-4!" legend="Uint8Array">
            <p class="font-mono break-all">
              {{ fileTab.uint8Array }}
            </p>
          </Fieldset>
          <Fieldset class="mt-4!" legend="Base64">
            <p class="font-mono break-all">
              {{ fileTab.base64 }}
            </p>
          </Fieldset>
          <Fieldset class="mt-4!" legend="Raw contents">
            <p class="font-mono break-all">
              {{ fileTab.rawContents }}
            </p>
          </Fieldset>
        </div>
        <div v-else>
          <Fieldset legend="Issues">
            <div
              v-for="(issue, index) in fileTab.issues"
              :key="'Issue_' + issue.type + '_' + issue.description"
              :class="index > 0 ? 'mt-4!' : ''"
            >
              <Message v-if="issue.type === locAPI.IssueType.Error" severity="error" icon="pi pi-times-circle">
                {{ issue.description }}
              </Message>
              <Message v-else severity="warn" icon="pi pi-exclamation-triangle">
                {{ issue.description }}
              </Message>
            </div>
          </Fieldset>
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
  issues: locAPI.IIssue[]
  uint8Array: string
  base64: string
  rawContents: string
}

const fileTabs = vue.ref<IFileTab[]>([])
const activeFile = vue.ref<string>('')

defineExpose({ openFile, closeCurrentFile, closeAllFiles, hasFile, hasFiles, selectFile })

export interface IContentsComponent {
  openFile(file: locAPI.File): void
  closeCurrentFile(): void
  closeAllFiles(): void
  hasFile(filePath: string): boolean
  hasFiles(): boolean
  selectFile(filePath: string): void
}

function openFile(file: locAPI.File): void {
  const filePath = file.path()
  const fileContents = file.contents()

  fileTabs.value.splice(fileTabs.value.findIndex((fileTab) => fileTab.value === activeFile.value) + 1, 0, {
    value: filePath,
    title: filePath.split(/(\\|\/)/g).pop() ?? '',
    issues: file.issues(),
    uint8Array: String(fileContents),
    base64: btoa(fileContents.reduce((data, byte) => data + String.fromCharCode(byte), '')),
    rawContents: new TextDecoder().decode(fileContents)
  })

  selectFile(filePath)
}

function hasFile(filePath: string): boolean {
  return fileTabs.value.find((fileTab) => fileTab.value === filePath) !== undefined
}

function hasFiles(): boolean {
  return fileTabs.value.length > 0
}

function selectFile(filePath: string): void {
  activeFile.value = filePath

  vue
    .nextTick()
    .then(() => {
      const tabElement = document.getElementById('Tab_' + filePath)

      if (tabElement !== null) {
        // Note: when removing a tab, unless it is the last one, it will flash (whether we scroll it into view or not).
        //       To prevent this, we temporarily remove the 'p-tab' class (!?).

        tabElement.classList.remove('p-tab')
        tabElement.scrollIntoView({ block: 'nearest' })
        tabElement.classList.add('p-tab')
      }
    })
    .catch((error: unknown) => {
      console.error('Error scrolling to tab:', error)
    })
}

function selectNextFile(): void {
  const activeFileIndex = fileTabs.value.findIndex((fileTab) => fileTab.value === activeFile.value)
  const nextFileIndex = (activeFileIndex + 1) % fileTabs.value.length

  selectFile(fileTabs.value[nextFileIndex].value)
}

function selectPreviousFile(): void {
  const activeFileIndex = fileTabs.value.findIndex((fileTab) => fileTab.value === activeFile.value)
  const nextFileIndex = (activeFileIndex - 1 + fileTabs.value.length) % fileTabs.value.length

  selectFile(fileTabs.value[nextFileIndex].value)
}

function closeFile(filePath: string): void {
  locAPI.fileManager.unmanage(filePath)

  const activeFileIndex = fileTabs.value.findIndex((fileTab) => fileTab.value === filePath)

  fileTabs.value.splice(activeFileIndex, 1)

  if (activeFile.value === filePath && fileTabs.value.length > 0) {
    selectFile(fileTabs.value[Math.min(activeFileIndex, fileTabs.value.length - 1)].value)
  }
}

function closeCurrentFile(): void {
  closeFile(activeFile.value)
}

function closeAllFiles(): void {
  while (fileTabs.value.length > 0) {
    closeCurrentFile()
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
  }
})
</script>

<style scoped>
.p-tab {
  padding: 0.25rem 0.5rem;
  border-right: 1px solid var(--p-content-border-color);
  outline: none;
}

.p-tab:first-of-type {
  border-left: 1px solid var(--p-content-border-color);
}

.p-tab:hover {
  background-color: var(--p-content-hover-background) !important;
}

.p-tab .remove-button {
  visibility: hidden;
}

.p-tab:hover .remove-button,
.p-tab-active .remove-button {
  visibility: visible;
}

.p-tab-active,
.p-tab-active:hover {
  background-color: var(--p-primary-color) !important;
  color: var(--p-primary-contrast-color);
}

:deep(.p-tablist-active-bar) {
  display: none;
}

:deep(.p-tablist-prev-button),
:deep(.p-tablist-next-button),
:deep(.p-tabpanel) {
  outline: none !important;
}

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
