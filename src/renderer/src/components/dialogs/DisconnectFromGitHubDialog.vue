<template>
  <BaseDialog header="Disconnect from GitHub...">
    <div class="mt-2 mb-4">You are about to disconnect from GitHub. Do you want to proceed?</div>
    <template #footer>
      <Button autofocus label="Yes" severity="danger" @click="$emit('yes')" />
      <Button label="No" severity="secondary" @click="$emit('no')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
defineEmits<{
  (event: 'yes'): void;
  (event: 'no'): void;
}>();
</script>
