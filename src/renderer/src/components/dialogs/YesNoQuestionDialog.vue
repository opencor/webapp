<template>
  <BaseDialog :header="title">
    <div class="mt-2 mb-4">
      {{ question }}
    </div>
    <template #footer>
      <Button autofocus label="Yes" severity="danger" @click="$emit('yes')" />
      <Button label="No" severity="secondary" @click="$emit('no')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
defineEmits(['yes', 'no']);
defineProps<{
  title: string;
  question: string;
}>();
</script>
