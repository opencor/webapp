<template>
  <div id="app" class="h-screen">
    <div class="flex flex-col h-full">
      <div v-if="!electronAPI" class="main-menu">
        <MainMenu @about="aboutVisible = true" @open="open()" />
      </div>
      <div class="flex grow justify-center items-center">
        <BackgroundComponent />
      </div>
    </div>
  </div>
  <input id="file" type="file" style="display: none" />
  <ResetAllDialog />
  <AboutDialog v-model:visible="aboutVisible" @close="aboutVisible = false" />
</template>

<script setup lang="ts">
import { fileOpen } from 'browser-fs-access'
import * as vue from 'vue'

import { electronAPI } from '../../electronAPI'

// About dialog.

const aboutVisible = vue.ref(false)

electronAPI?.onAbout(() => {
  aboutVisible.value = true
})

// Open file(s) dialog.

function open() {
  fileOpen([
    {
      multiple: true
    }
  ])
    .then((files) => {
      for (const file of files) {
        console.log(file)
        file
          .arrayBuffer()
          .then((arrayBuffer) => {
            const uint8Array = new Uint8Array(arrayBuffer)
            const base64 = btoa(uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), ''))

            console.log(`---[ ${file.name} ]---[BEGIN]`)
            console.log(base64)
            console.log(`---[ ${file.name} ]---[END]`)
          })
          .catch((error: unknown) => {
            console.log('Failed to read file:', error)
          })
      }
    })
    .catch((error: unknown) => {
      console.log('Failed to open file(s):', error)
    })
}

const fileInput = document.getElementById('file') as HTMLInputElement | null

if (fileInput !== null) {
  fileInput.addEventListener('click', (event: Event) => {
    event.stopPropagation()
    event.preventDefault()

    const files = fileInput.files

    if (files !== null) {
      for (const file of Array.from(files)) {
        console.log('---------')
        console.log(file.name)

        if (electronAPI !== undefined) {
          console.log(electronAPI.filePath(file))
        }
      }
    }
  })
}

// Handle drag and drop events.

const dropArea = document.getElementById('app')
let draggingCounter = 0

if (dropArea !== null) {
  dropArea.addEventListener('dragenter', (event: Event) => {
    event.stopPropagation()
    event.preventDefault()

    // Show the drop area, but only when entering it for the first time.

    if (draggingCounter++ === 0) {
      dropArea.classList.add('dragging')
    }
  })

  dropArea.addEventListener('dragover', (event: Event) => {
    event.stopPropagation()
    event.preventDefault()
  })

  dropArea.addEventListener('drop', (event: Event) => {
    event.stopPropagation()
    event.preventDefault()

    // Hide the drop area.

    draggingCounter = 0

    dropArea.classList.remove('dragging')

    // Handle the dropped files.

    const files = (event as DragEvent).dataTransfer?.files

    if (files !== undefined) {
      for (const file of Array.from(files)) {
        console.log('---------')
        console.log(file.name)

        if (electronAPI !== undefined) {
          console.log(electronAPI.filePath(file))
        }
      }
    }
  })

  dropArea.addEventListener('dragleave', (event: Event) => {
    event.stopPropagation()
    event.preventDefault()

    // Hide the drop area, but only when leaving it for the last time.

    if (--draggingCounter === 0) {
      dropArea.classList.remove('dragging')
    }
  })
}
</script>
