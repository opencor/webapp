<template>
  <div id="app">
    <OpenCOR />
    <!-- <OpenCOR omex="https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/lorenz.omex"/> -->
    <!-- <OpenCOR omex="https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/ui/lorenz.omex"/> -->
    <!-- <OpenCOR omex="https://models.physiomeproject.org/workspace/b7c/rawfile/e0ae8d2d56aaaa091e23e1ee7e84cacbda1dfb6b/lorenz.omex"/> -->
  </div>
</template>

<script setup lang="ts">
import OpenCOR from './components/OpenCOR.vue'

function updateViewportHeight() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
}

window.addEventListener('resize', updateViewportHeight)

updateViewportHeight()
</script>

<style scoped>
#app {
  width: 100%;
  height: calc(100 * var(--vh, 1vh));
}
</style>
