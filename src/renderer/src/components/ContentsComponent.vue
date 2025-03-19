<template>
  <BackgroundComponent v-if="fileTabs.length === 0" />
  <Tabs v-else v-model:value="activeFile" :scrollable="true" :selectOnFocus="true">
    <TabList class="tablist">
      <Tab v-for="fileTab in fileTabs" :key="'Tab_' + fileTab.value" :value="fileTab.value">
        <div class="flex gap-2 items-center">
          <div>
            {{ fileTab.title }}
          </div>
          <div class="pi pi-times remove-button" @mousedown.prevent @click.stop="removeFile(fileTab.value)" />
        </div>
      </Tab>
    </TabList>
    <TabPanels>
      <TabPanel v-for="fileTab in fileTabs" :key="'TabPanel_' + fileTab.value" :value="fileTab.value">
        <div v-if="fileTab.issues.length === 0">
          <div class="font-bold">
            <Fieldset legend="File path">
              <p class="font-mono break-all">
                {{ fileTab.value }}
              </p>
            </Fieldset>
          </div>
          <div style="margin-top: 1rem">
            <Fieldset legend="Uint8Array">
              <p class="font-mono break-all">
                {{ fileTab.uint8Array }}
              </p>
            </Fieldset>
          </div>
          <div style="margin-top: 1rem">
            <Fieldset legend="Base64">
              <p class="font-mono break-all">
                {{ fileTab.base64 }}
              </p>
            </Fieldset>
          </div>
          <div style="margin-top: 1rem">
            <Fieldset legend="Raw contents">
              <p class="font-mono break-all">
                {{ fileTab.rawContents }}
              </p>
            </Fieldset>
          </div>
        </div>
        <div v-else>
          <Fieldset legend="Issues">
            <div v-for="issue in fileTab.issues" :key="'Issue_' + issue.type + '_' + issue.description">
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

import * as common from '../common'

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

  fileTabs.value.splice(fileTabs.value.findIndex((fileTab) => fileTab.value === activeFile.value) + 1, 0, {
    value: filePath,
    title: filePath.split(/(\\|\/)/g).pop() ?? '',
    issues: file.issues(),
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

function removeFile(filePath: string): void {
  locAPI.fileManager.unmanage(filePath)

  const activeFileIndex = fileTabs.value.findIndex((fileTab) => fileTab.value === filePath)

  fileTabs.value.splice(activeFileIndex, 1)

  if (activeFile.value === filePath && fileTabs.value.length > 0) {
    selectFile(fileTabs.value[Math.min(activeFileIndex, fileTabs.value.length - 1)].value)
  }
}

function removeCurrentFile(): void {
  removeFile(activeFile.value)
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
    removeCurrentFile()
  }
})
</script>

<style scoped>
.p-tab .remove-button {
  visibility: hidden;
}

.p-tab:hover .remove-button,
.p-tab-active .remove-button {
  visibility: visible;
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
