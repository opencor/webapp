<template>
  <BaseDialog header=" " class="w-169"
    :closeButtonProps="{ severity: 'secondary', text: true, rounded: true, disabled: reloading }"
    :closeOnEscape="!reloading"
  >
    <div class="space-y-7">
      <div class="text-center">
        <div class="text-3xl font-bold">OpenCOR <span class="highlight highlight-version">{{ latestVersion }}</span> is available!</div>
      </div>
      <div class="space-y-2">
        <div class="text-center">
          <span class="text-lg">Feel free to reload OpenCOR whenever you are ready.</span><br />
          <em >(Please note that any unsaved work will be lost.)</em>
        </div>
      </div>
    </div>
    <template #footer>
      <Button :label="reloading?'Reloading...':'Reload'" autofocus :loading="reloading" @click="onReloadNow" />
      <Button label="Cancel" severity="secondary" :disabled="reloading" @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import { forceReload, latestVersion } from '../../common/version';

defineEmits<{
  close: [];
}>();

const reloading = vue.ref(false);

const onReloadNow = (): void => {
  reloading.value = true;

  void forceReload();
};
</script>

<style scoped>
.highlight {
  display: inline-flex;
  align-items: center;
  height: 1em;
  padding: 0.125em 0.25em;
  border: 1px solid var(--p-content-border-color);
  border-radius: 9999px;
  background-color: var(--p-content-hover-background);
  color: var(--p-text-muted-color);
  font-style: normal;
}

.highlight-version {
  background-color: var(--p-message-success-background);
  border-color: var(--p-message-success-border);
  color: var(--p-message-success-color);
}
</style>
