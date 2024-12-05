<template>
  <Background />
  <ResetAllDialog />
  <AboutDialog :version="version" :copyright="copyright" />
</template>

<script setup lang="ts">
// @ts-ignore (window.electronAPI may or not be defined and that is why we test it)
const electronAPI = window.electronAPI

// Some global constants.

const version = __APP_VERSION__
const currentYear = new Date().getFullYear()
const copyright = currentYear === 2024 ? '2024' : `2024-${currentYear}`

// Handle drag and drop events.

const dropArea = document.getElementById('app')
let draggingCounter: number = 0

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
