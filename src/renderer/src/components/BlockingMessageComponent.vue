<template>
  <Message
    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-[1rem] pt-[1.5rem] pb-[0.75rem] z-[99999]"
    severity="secondary"
  >
    <i class="block! pi pi-cog pi-spin text-center! text-[3rem]!" />
    <br />
    <span class="block text-center text-[1.5rem]">{{ message }}</span>
  </Message>
</template>

<script setup lang="ts">
defineProps<{
  message: string;
}>();
</script>
