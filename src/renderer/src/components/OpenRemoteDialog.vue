<template>
  <BaseDialog header="Open Remote..." style="width: 39rem">
    <div class="flex items-center mt-2 mb-4">
      <FloatLabel class="w-full" variant="on">
        <label>URL</label>
        <InputText autofocus fluid v-model="url" @update:modelValue="onUpdate()" @keyup.enter="emitOpenRemote()" />
      </FloatLabel>
    </div>
    <template #footer>
      <Button type="button" label="Open" :disabled="!validUrl" @click="emitOpenRemote()" />
      <Button type="button" label="Cancel" severity="secondary" @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import * as vue from 'vue'

const emit = defineEmits(['close', 'openRemote'])
const url = vue.ref()
const validUrl = vue.ref(false)

function onUpdate() {
  try {
    const userUrl = new URL(url.value)

    validUrl.value = userUrl.protocol === 'http:' || userUrl.protocol === 'https:'
  } catch {
    validUrl.value = false
  }
}

function emitClose() {
  url.value = ''

  emit('close')
}

function emitOpenRemote() {
  if (!validUrl.value) {
    return
  }

  emit('openRemote', url.value)

  emitClose()
}
</script>
