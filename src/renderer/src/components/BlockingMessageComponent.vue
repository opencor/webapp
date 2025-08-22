<template>
  <Message class="message" severity="secondary">
    <i class="message-icon pi pi-spin pi-cog" />
    <br />
    <span class="message-text">{{ message }}</span>
  </Message>
</template>

<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<style scoped>
.message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 1.5rem 1rem 0.75rem;
  z-index: 99999;
}

.message-icon {
  text-align: center;
  display: block;
  font-size: 3rem;
}

.message-text {
  font-size: 1.5rem;
}
</style>
