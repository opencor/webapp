<template>
  <!--
  Note: our changelog is scrolled with the rest of our contents (rather than on its own), so that we never have nested
        scrollbars (e.g., when OpenCOR is embedded in a short container), hence we limit our height instead.
  -->
  <BaseDialog header="Changelog" size="md" class="max-h-[min(90%,40rem)]!">
    <ChangelogComponent v-if="entries.length" class="changelog-list" :entries="entries" />
    <div v-else class="changelog-empty">
      <i class="pi pi-info-circle" />
      <span>No changelog is available.</span>
    </div>
    <template #footer>
      <Button label="OK" autofocus @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { changelog } from '../../common/changelog';

defineEmits<{
  close: [];
}>();

const entries = changelog();
</script>

<style scoped>
.changelog-list {
  font-size: 0.875rem;
}

.changelog-empty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.25rem 0 0.5rem;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}
</style>
