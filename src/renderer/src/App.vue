<template>
  <div class="flex flex-col h-screen">
    <div v-if="!electronAPI" class="main-menu">
      <MainMenu
        @about="aboutVisible = true"
        @open="($refs.files as HTMLInputElement).click()"
        @openRemote="openRemoteVisible = true"
        @settings="onSettings"
      />
    </div>
    <div
      class="grow"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @drop.prevent="onDrop"
      @dragleave.prevent="onDragLeave"
    >
      <BackgroundComponent />
      <BlockUI :blocked="spinningWheelVisible" :fullScreen="true"></BlockUI>
      <ProgressSpinner v-show="spinningWheelVisible" class="spinning-wheel" />
    </div>
  </div>
  <input ref="files" type="file" multiple style="display: none" @change.prevent="onChange" />
  <OpenRemoteDialog v-model:visible="openRemoteVisible" @openRemote="onOpenRemote" @close="openRemoteVisible = false" />
  <ResetAllDialog v-model:visible="resetAllVisible" @resetAll="onResetAll" @close="resetAllVisible = false" />
  <AboutDialog v-model:visible="aboutVisible" @close="aboutVisible = false" />
  <Toast />
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import * as vue from 'vue'

import { fileContents, filePath, isRemoteFilePath, toastLife } from './common'

import { electronAPI } from '../../electronAPI'

const toast = useToast()

// Spinning wheel.

const spinningWheelVisible = vue.ref(false)

function showSpinningWheel(): void {
  spinningWheelVisible.value = true
}

function hideSpinningWheel(): void {
  spinningWheelVisible.value = false
}

// Check for updates dialog.

electronAPI?.onCheckForUpdates(() => {
  toast.add({
    severity: 'info',
    summary: 'Check for updates',
    detail: 'The Check for updates dialog has yet to be implemented.',
    life: toastLife
  })
})

// About dialog.

const aboutVisible = vue.ref(false)

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
    life: toastLife
  })
}

// Open a file.

function openFile(filePath: string, fileContentsPromise?: Promise<Uint8Array>): void {
  if (fileContentsPromise !== undefined) {
    function topContents(contents: string): string {
      const numberOfBytesShown = 100

      return (
        contents.slice(0, Math.min(numberOfBytesShown, contents.length)) +
        (contents.length > numberOfBytesShown ? '...' : '')
      )
    }

    showSpinningWheel()

    fileContentsPromise
      .then((fileContents) => {
        hideSpinningWheel()

        toast.add({
          severity: 'info',
          summary: 'Opening a file',
          detail:
            filePath +
            '\n\nRaw contents:\n' +
            topContents(new TextDecoder().decode(fileContents)) +
            '\n\nUint8Array:\n' +
            topContents(String(fileContents)) +
            '\n\nBase64:\n' +
            topContents(btoa(fileContents.reduce((data, byte) => data + String.fromCharCode(byte), ''))),
          life: toastLife
        })
      })
      .catch((error: unknown) => {
        hideSpinningWheel()

        toast.add({
          severity: 'error',
          summary: 'Opening a file',
          detail: filePath + '\n\n' + (error instanceof Error ? error.message : String(error)),
          life: toastLife
        })
      })
  } else {
    if (isRemoteFilePath(filePath)) {
      showSpinningWheel()
    }

    if (isRemoteFilePath(filePath)) {
      hideSpinningWheel()
    }

    toast.add({
      severity: 'info',
      summary: 'Opening a file',
      detail: filePath,
      life: toastLife
    })
  }
}

// Open file(s) dialog.

function onChange(event: Event): void {
  const files = (event.target as HTMLInputElement).files

  if (files !== null) {
    for (const file of files) {
      openFile(filePath(file), fileContents(file))
    }
  }
}

// Drag and drop.

let dropAreaCounter = 0

function onDragEnter(event: DragEvent): void {
  // Show the drop area, but only when entering it for the first time.

  if (dropAreaCounter++ === 0) {
    ;(event.target as HTMLElement).classList.add('drop-area')
  }
}

function onDrop(event: DragEvent): void {
  // Hide the drop area.

  dropAreaCounter = 0
  ;(event.target as HTMLElement).classList.remove('drop-area')

  // Handle the dropped files.

  const files = event.dataTransfer?.files

  if (files !== undefined) {
    for (const file of Array.from(files)) {
      openFile(filePath(file), electronAPI !== undefined ? undefined : fileContents(file))
    }
  }
}

function onDragLeave(event: DragEvent): void {
  if (--dropAreaCounter === 0) {
    ;(event.target as HTMLElement).classList.remove('drop-area')
  }
}

// Open.

electronAPI?.onOpen((filePath: string) => {
  openFile(filePath)
})

// Open remote.

const openRemoteVisible = vue.ref(false)

electronAPI?.onOpenRemote(() => {
  openRemoteVisible.value = true
})

function onOpenRemote(url: string): void {
  openFile(url, electronAPI !== undefined ? undefined : fileContents(url))
}

// Reset all.

const resetAllVisible = vue.ref(false)

electronAPI?.onResetAll(() => {
  resetAllVisible.value = true
})

function onResetAll(): void {
  electronAPI?.resetAll()
}
</script>
