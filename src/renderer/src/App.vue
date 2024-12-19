<template>
  <div class="h-screen">
    <div class="flex flex-col h-full">
      <div v-if="electronAPI === undefined" class="main-menu">
        <MainMenu @about="aboutVisible = true" />
      </div>
      <FontAwesomeIcon icon="house" />
      <div class="flex grow justify-center items-center">
        <Background />
      </div>
    </div>
  </div>
  <ResetAllDialog />
  <AboutDialog v-model:visible="aboutVisible" @close="aboutVisible = false" />
</template>

<script setup lang="ts">
import { ref } from 'vue'

// @ts-ignore (window.electronAPI may or not be defined and that is why we test it)
const electronAPI = window.electronAPI
const aboutVisible = ref(false)

if (electronAPI !== undefined) {
  electronAPI.onAbout(() => {
    aboutVisible.value = true
  })
}
</script>
