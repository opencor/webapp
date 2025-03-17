<template>
  <div class="flex flex-col h-screen">
    <div v-if="!electronAPI" class="main-menu">
      <MainMenu
        @about="aboutVisible = true"
        @open="($refs.filesRef as HTMLInputElement).click()"
        @openRemote="openRemoteVisible = true"
        @settings="onSettings"
      />
    </div>
    <div class="grow" @dragenter="onDragEnter" @dragover.prevent @drop.prevent="onDrop" @dragleave="onDragLeave">
      <ContentsComponent ref="contentsRef" />
      <DragNDropComponent v-show="dropAreaCounter > 0" />
      <BlockUI :blocked="!uiEnabled" :fullScreen="true"></BlockUI>
      <ProgressSpinner v-show="spinningWheelVisible" class="spinning-wheel" />
    </div>
  </div>
  <input ref="filesRef" type="file" multiple style="display: none" @change="onChange" />
  <OpenRemoteDialog v-model:visible="openRemoteVisible" @openRemote="onOpenRemote" @close="openRemoteVisible = false" />
  <ResetAllDialog v-model:visible="resetAllVisible" @resetAll="onResetAll" @close="resetAllVisible = false" />
  <AboutDialog v-model:visible="aboutVisible" @close="aboutVisible = false" />
  <Toast />
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import * as vue from 'vue'

import { electronAPI } from '../../electronAPI'
import * as locAPI from '../../libopencor/locAPI'

import * as common from './common'
import IContentsComponent from './components/ContentsComponent.vue'

const toast = useToast()
const contentsRef = vue.ref<InstanceType<typeof IContentsComponent> | null>(null)

// Enable/disable the UI.

const uiEnabled = vue.ref<boolean>(true)

electronAPI?.onEnableUi(() => {
  enableUi()
})

function enableUi(): void {
  uiEnabled.value = true
}

electronAPI?.onDisableUi(() => {
  disableUi()
})

function disableUi(): void {
  uiEnabled.value = false
}

// Spinning wheel.

const spinningWheelVisible = vue.ref<boolean>(false)

function showSpinningWheel(): void {
  disableUi()

  spinningWheelVisible.value = true
}

function hideSpinningWheel(): void {
  enableUi()

  spinningWheelVisible.value = false
}

// Check for updates dialog.

electronAPI?.onCheckForUpdates(() => {
  toast.add({
    severity: 'info',
    summary: 'Check for updates',
    detail: 'The Check for updates dialog has yet to be implemented.',
    life: common.toastLife
  })
})

// About dialog.

const aboutVisible = vue.ref<boolean>(false)

electronAPI?.onAbout(() => {
  aboutVisible.value = true
})

// Settings dialog.

electronAPI?.onSettings(() => {
  onSettings()
})

function onSettings(): void {
  toast.add({
    severity: 'info',
    summary: 'Settings',
    detail: 'The Settings dialog has yet to be implemented.',
    life: common.toastLife
  })
}

// Open a file.

function openFile(fileOrFilePath: string | File): void {
  // Check whether the file is already open and if so then select it.

  const filePath = common.filePath(fileOrFilePath)

  if (contentsRef.value?.hasFile(filePath) ?? false) {
    contentsRef.value?.selectFile(filePath)

    return
  }

  // Retrieve a locAPI.File object for the given file or file path and add it to the contents.

  if (common.isRemoteFilePath(filePath)) {
    showSpinningWheel()
  }

  common
    .file(fileOrFilePath)
    .then((file) => {
      const fileType = file.type()

      if (fileType === locAPI.FileType.UnknownFile || fileType === locAPI.FileType.IrretrievableFile) {
        toast.add({
          severity: 'error',
          summary: 'Opening a file',
          detail:
            filePath +
            '\n\n' +
            (fileType === locAPI.FileType.UnknownFile
              ? 'Only CellML files, SED-ML files, and COMBINE archives are supported.'
              : 'The file could not be retrieved.'),
          life: common.toastLife
        })
      } else {
        contentsRef.value?.addFile(file)
      }

      if (common.isRemoteFilePath(filePath)) {
        hideSpinningWheel()
      }
    })
    .catch((error: unknown) => {
      if (common.isRemoteFilePath(filePath)) {
        hideSpinningWheel()
      }

      toast.add({
        severity: 'error',
        summary: 'Opening a file',
        detail: filePath + '\n\n' + (error instanceof Error ? error.message : String(error)),
        life: common.toastLife
      })
    })
}

// Open file(s) dialog.

function onChange(event: Event): void {
  const files = (event.target as HTMLInputElement).files

  if (files !== null) {
    for (const file of files) {
      openFile(file)
    }
  }
}

// Drag and drop.

const dropAreaCounter = vue.ref<number>(0)

function onDragEnter(): void {
  dropAreaCounter.value += 1
}

function onDrop(event: DragEvent): void {
  dropAreaCounter.value = 0

  const files = event.dataTransfer?.files

  if (files !== undefined) {
    for (const file of Array.from(files)) {
      openFile(file)
    }
  }
}

function onDragLeave(): void {
  dropAreaCounter.value -= 1
}

// Open.

electronAPI?.onOpen((filePath: string) => {
  openFile(filePath)
})

// Open remote.

const openRemoteVisible = vue.ref<boolean>(false)

electronAPI?.onOpenRemote(() => {
  openRemoteVisible.value = true
})

function onOpenRemote(url: string): void {
  // Note: no matter whether this is OpenCOR or OpenCOR's Web app, we always retrieve the file contents of a remote
  //       file. We could, in OpenCOR, rely on libOpenCOR to retrieve it for us, but this would block the UI. To
  //       retrieve the file here means that it is done asynchronously, which in turn means that the UI is not blocked
  //       and that we can show a spinning wheel to indicate that something is happening.

  openFile(url)
}

// Reset all.

const resetAllVisible = vue.ref<boolean>(false)

electronAPI?.onResetAll(() => {
  resetAllVisible.value = true
})

function onResetAll(): void {
  electronAPI?.resetAll()
}
</script>

<style scoped>
.main-menu {
  border-bottom: 1px solid var(--border-color);
}

.spinning-wheel {
  width: 50% !important;
  height: 50% !important;
  position: fixed !important;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 99999;
}
</style>
