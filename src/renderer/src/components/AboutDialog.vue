<template>
  <Dialog v-model:visible="visible" header=" " style="width: 36rem" :modal="true" @show="onShow" @hide="onHide">
    <div class="space-y-7">
      <div class="text-center">
        <div class="text-3xl font-bold">OpenCOR {{ version }}</div>
        <div class="italic">Copyright {{ copyright }}</div>
      </div>
      <div>
        <a href="https://opencor.ws/" target="_blank" rel="noopener">OpenCOR</a> is a Web-based modelling environment,
        which can be used to organise, edit, simulate, and analyse
        <a href="https://cellml.org/" target="_blank" rel="noopener">CellML</a> files. It can be used both as a
        standalone application (on Windows, Linux, and macOS) and on the Web.
      </div>
    </div>
    <template #footer>
      <Button label="OK" autofocus @click="closeAbout" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { onShow, onHide } from './common.js'
import { ref } from 'vue'

defineProps({
  version: {
    type: String,
    required: true
  },
  copyright: {
    type: String,
    required: true
  }
})

// @ts-ignore (window.electronAPI may or not be defined and that is why we test it)
const electronAPI = window.electronAPI
const visible = ref(false)

if (electronAPI !== undefined) {
  electronAPI.onAbout(() => {
    visible.value = true
  })
}

const closeAbout = () => {
  visible.value = false
}
</script>
