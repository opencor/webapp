<template>
  <div class="h-screen">
    <div class="flex flex-col h-full">
      <div v-if="!electronAPI" class="main-menu">
        <MainMenu @about="aboutVisible = true" @open="$refs.files.click()" @openRemote="openRemoteVisible = true" />
      </div>
      <div
        class="flex grow justify-center items-center"
        @dragenter.prevent="onDragEnter"
        @dragover.prevent
        @drop.prevent="onDrop"
        @dragleave.prevent="onDragLeave"
      >
        <BackgroundComponent />
      </div>
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

import { fileContents, filePath, toastLife } from './common'

import { electronAPI } from '../../electronAPI'

const toast = useToast()

// About dialog.

const aboutVisible = vue.ref(false)

electronAPI?.onAbout(() => {
  aboutVisible.value = true
})

// Open a file.

function openFile(filePath: string, fileContentsPromise?: Promise<string>): void {
  if (fileContentsPromise !== undefined) {
    fileContentsPromise
      .then((fileContents) => {
        const fileContentsShown = Math.min(100, fileContents.length)

        toast.add({
          severity: 'info',
          summary: 'Opening a file',
          detail:
            filePath +
            '\n\n' +
            fileContents.slice(0, fileContentsShown) +
            (fileContents.length > fileContentsShown ? '...' : ''),
          life: toastLife
        })
      })
      .catch((error: unknown) => {
        toast.add({
          severity: 'error',
          summary: 'Opening a file',
          detail: filePath + '\n\n' + (error instanceof Error ? error.message : String(error)),
          life: toastLife
        })
      })
  } else {
    toast.add({
      severity: 'info',
      summary: 'Opening a file',
      detail: filePath,
      life: toastLife
    })
  }
}

// Open file(s) dialog.

function onChange(event: Event) {
  const files = (event.target as HTMLInputElement).files

  if (files !== null) {
    for (const file of files) {
      openFile(filePath(file), fileContents(file))
    }
  }
}

// Drag and drop.

let dropAreaCounter = 0

function onDragEnter(event: DragEvent) {
  const dropAreaElement = event.target as HTMLElement

  // Show the drop area, but only when entering it for the first time.

  if (dropAreaCounter++ === 0) {
    dropAreaElement.classList.add('drop-area')
  }
}

function onDrop(event: DragEvent) {
  // Hide the drop area.

  const dropAreaElement = event.target as HTMLElement

  dropAreaCounter = 0

  dropAreaElement.classList.remove('drop-area')

  // Handle the dropped files.

  const files = event.dataTransfer?.files

  if (files !== undefined) {
    for (const file of Array.from(files)) {
      openFile(filePath(file), electronAPI !== undefined ? undefined : fileContents(file))
    }
  }
}

function onDragLeave(event: DragEvent) {
  const dropAreaElement = event.target as HTMLElement

  if (--dropAreaCounter === 0) {
    dropAreaElement.classList.remove('drop-area')
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

function onOpenRemote(url: string) {
  openFile(url, electronAPI !== undefined ? undefined : fileContents(url))
}

// Reset all.

const resetAllVisible = vue.ref(false)

electronAPI?.onResetAll(() => {
  resetAllVisible.value = true
})

function onResetAll() {
  electronAPI?.resetAll()
}
</script>
