<template>
  <BaseDialog v-model:visible="visible" header=" " style="width: 39rem">
    <div class="space-y-7">
      <div class="text-center">
        <div class="text-3xl font-bold">OpenCOR {{ version }}</div>
        <div class="italic">Copyright {{ copyright }}</div>
      </div>
      <div class="space-y-2">
        <div>
          <a href="https://opencor.ws/" target="_blank" rel="noopener">OpenCOR</a> is a frontend to
          <a href="https://opencor.ws/libopencor/" target="_blank" rel="noopener">libOpenCOR</a> {{ ocVersion }}, a
          library that can be used to organise, edit, simulate, and analyse
          <a href="https://cellml.org/" target="_blank" rel="noopener">CellML</a> files.
        </div>

        <div class="space-y-0">
          <div>There are two versions of OpenCOR:</div>

          <ol class="list-decimal list-inside ml-2">
            <li>
              <span class="font-bold">OpenCOR:</span> a desktop application that can be run on
              <a href="https://en.wikipedia.org/wiki/Microsoft_Windows" target="_blank" rel="noopener">Windows</a>,
              <a href="https://en.wikipedia.org/wiki/Linux" target="_blank" rel="noopener">Linux</a>, and
              <a href="https://en.wikipedia.org/wiki/MacOS" target="_blank" rel="noopener">macOS</a>; and
            </li>
            <li>
              <span class="font-bold">OpenCOR's Web app:</span> a
              <a href="https://en.wikipedia.org/wiki/Web_application" target="_blank" rel="noopener">Web app</a> that
              can be run using a Web browser.
            </li>
          </ol>
        </div>

        <div>
          The main difference between the two versions is that models in OpenCOR are, by default, compiled while they
          can only be interpreted in OpenCOR's Web app.
        </div>
      </div>
    </div>
    <template #footer>
      <Button label="OK" autofocus @click="closeAbout" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
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

import * as oc from '../libOpenCOR'

const ocVersion = oc.version()

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
