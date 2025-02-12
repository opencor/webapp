<template>
  <div class="h-screen">
    <div class="flex flex-col h-full">
      <div v-if="!electronAPI" class="main-menu">
        <MainMenu @about="aboutVisible = true" />
      </div>
      <div class="flex grow justify-center items-center">
        <BackgroundComponent />
      </div>
    </div>
  </div>
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

// Handle drag and drop events.

const dropArea = document.getElementById('app')
let draggingCounter = 0

if (dropArea !== null) {
  dropArea.addEventListener('dragenter', (event: Event) => {
    // Show the drop area, but only when entering it for the first time.

    if (event.target === dropArea && draggingCounter === 0) {
      dropArea.classList.add('dragging')
    }

    ++draggingCounter
  })

  dropArea.addEventListener('dragover', (event: Event) => {
    // Prevent the default behavior to enable dropping.

    event.preventDefault()
  })

  dropArea.addEventListener('drop', (event: Event) => {
    // Prevent the default behavior to enable dropping.

    event.preventDefault()

    // Hide the drop area.

    draggingCounter = 0

    dropArea.classList.remove('dragging')

    // Handle the dropped files.

    const files = (event as DragEvent).dataTransfer?.files

    if (files !== undefined) {
      for (const file of Array.from(files)) {
        console.log("---------")
        console.log(file.name)

        if (electronAPI !== undefined) {
          console.log(electronAPI.filePath(file))
        }
      }
    }
  })

  dropArea.addEventListener('dragleave', (event: Event) => {
    // Hide the drop area, but only when leaving it for the last time.

    --draggingCounter

    if (event.target === dropArea && draggingCounter === 0) {
      dropArea.classList.remove('dragging')
    }
  })
}
</script>
