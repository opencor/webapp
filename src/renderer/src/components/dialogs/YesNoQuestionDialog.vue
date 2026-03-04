<template>
  <BaseDialog :header="title">
    <div class="mt-2 mb-4" v-html="question"></div>
    <template #footer>
      <Button autofocus label="Yes" :severity="severity" @click="$emit('yes')" />
      <Button label="No" severity="secondary" @click="$emit('no')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    question: string;
    severity?: 'danger' | 'warning' | 'info';
  }>(),
  {
    severity: 'warning'
  }
);

defineEmits<{
  (event: 'yes'): void;
  (event: 'no'): void;
}>();
</script>
