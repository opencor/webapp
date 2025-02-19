<template>
  <BaseDialog header="Open Remote..." style="width: 39rem">
    <div class="flex items-center mt-2 mb-4">
      <FloatLabel class="w-full" variant="on">
        <label>URL</label>
        <InputText autofocus fluid v-model="url" @keyup.enter="emitOpenRemote()" />
      </FloatLabel>
    </div>
    <template #footer>
      <Button type="button" label="Open" :disabled="url === ''" @click="emitOpenRemote()" />
      <Button type="button" label="Cancel" severity="secondary" @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import * as vue from 'vue'

const emit = defineEmits(['openRemote', 'close'])
const url = vue.ref('')

function emitOpenRemote() {
  if (url.value === '') {
    return
  }

  emit('openRemote', url.value)

  emitClose()
}

function emitClose() {
  url.value = ''

  emit('close')
}
</script>
