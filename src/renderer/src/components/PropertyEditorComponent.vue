<template>
  <Fieldset :legend="name" />
</template>

<script setup lang="ts">
defineProps<{
  name: string
}>()
</script>
