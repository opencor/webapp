<template>
  <Background />
  <ResetAllDialog />
  <AboutDialog :version="version" :copyright="copyright" />
</template>

<script setup lang="ts">
const version = __APP_VERSION__
const currentYear = new Date().getFullYear()
const copyright = currentYear === 2024 ? '2024' : `2024-${currentYear}`
</script>
