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
  <OpenRemoteDialog v-model:visible="openRemoteVisible" @openRemote="onOpenRemote" @close="onClose" />
  <ResetAllDialog />
  <AboutDialog v-model:visible="aboutVisible" @close="aboutVisible = false" />
</template>

<script setup lang="ts">
import * as vue from 'vue'

import { electronAPI } from '../../electronAPI'

// About dialog.

const aboutVisible = vue.ref(false)

electronAPI?.onAbout(() => {
  aboutVisible.value = true
})

// Show the contents of a file.

function showFileContents(file: File) {
  file
    .arrayBuffer()
    .then((arrayBuffer) => {
      const uint8Array = new Uint8Array(arrayBuffer)
      const base64 = btoa(uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), ''))
      const filePathOrName = electronAPI !== undefined ? electronAPI.filePath(file) : file.name

      console.log(`---[ ${filePathOrName} ]---[BEGIN]`)
      console.log(base64)
      console.log(`---[ ${filePathOrName} ]---[END]`)
    })
    .catch((error: unknown) => {
      console.log('Failed to read file:', error)
    })
}

// Open file(s) dialog.

function onChange(event: Event) {
  const files = (event.target as HTMLInputElement).files

  if (files !== null) {
    for (const file of files) {
      showFileContents(file)
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
      showFileContents(file)
    }
  }
}

function onDragLeave(event: DragEvent) {
  const dropAreaElement = event.target as HTMLElement

  if (--dropAreaCounter === 0) {
    dropAreaElement.classList.remove('drop-area')
  }
}

// Open remote.

const openRemoteVisible = vue.ref(false)

electronAPI?.onOpenRemote(() => {
  openRemoteVisible.value = true
})

function onOpenRemote(url: string) {
  console.log('Open remote:', url)
}

function onClose() {
  openRemoteVisible.value = false
}
</script>
