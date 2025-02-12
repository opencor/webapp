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

const aboutVisible = vue.ref(false)

electronAPI?.onAbout(() => {
  aboutVisible.value = true
})
</script>
