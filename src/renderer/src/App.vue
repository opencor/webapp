<template>
  <div class="h-screen">
    <div class="flex flex-col h-full">
      <div v-if="!electronAPI" class="main-menu">
        <MainMenu @about="aboutVisible = true" @open="$refs.files.click()" />
      </div>
      <div ref="dropArea" class="flex grow justify-center items-center">
        <BackgroundComponent />
      </div>
    </div>
  </div>
  <input ref="files" type="file" multiple style="display: none" @change.prevent="onChange" />
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

// Open file(s) dialog.

function onChange(event: Event) {
  const files = (event.target as HTMLInputElement).files

  if (files !== null) {
    for (const file of files) {
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
  }
}

// Handle drag and drop events.

const dropArea = vue.useTemplateRef('dropArea')

vue.onMounted(() => {
  const dropAreaElement = dropArea.value as HTMLInputElement
  let dropAreaCounter = 0

  dropAreaElement.ondragenter = (event: DragEvent) => {
    event.stopPropagation()
    event.preventDefault()

    // Show the drop area, but only when entering it for the first time.

    if (dropAreaCounter++ === 0) {
      dropAreaElement.classList.add('drop-area')
    }
  }

  dropAreaElement.ondragover = (event: DragEvent) => {
    event.stopPropagation()
    event.preventDefault()
  }

  dropAreaElement.ondrop = (event: DragEvent) => {
    event.stopPropagation()
    event.preventDefault()

    // Hide the drop area.

    dropAreaCounter = 0

    dropAreaElement.classList.remove('drop-area')

    // Handle the dropped files.

    const files = event.dataTransfer?.files

    if (files !== undefined) {
      for (const file of Array.from(files)) {
        console.log('---------')
        console.log(file.name)

        if (electronAPI !== undefined) {
          console.log(electronAPI.filePath(file))
        }
      }
    }
  }

  dropAreaElement.ondragleave = (event: DragEvent) => {
    event.stopPropagation()
    event.preventDefault()

    // Hide the drop area, but only when leaving it for the last time.

    if (--dropAreaCounter === 0) {
      dropAreaElement.classList.remove('drop-area')
    }
  }
})
</script>
