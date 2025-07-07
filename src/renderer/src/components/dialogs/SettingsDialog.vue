<template>
  <BaseDialog header="Settings..." @hide="initialiseDialog">
    <div v-if="electronApi !== undefined" class="flex gap-2 items-center">
      <Checkbox inputId="checkForUpdatesAtStartup" :binary="true" v-model="checkForUpdatesAtStartup" />
      <label for="checkForUpdatesAtStartup">Check for updates at startup</label>
    </div>
    <div v-else>There are currently no settings.</div>
    <template #footer>
      <Button autofocus label="OK" @click="onOk" />
      <Button label="Cancel" severity="secondary" @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import * as vue from 'vue'

import { electronApi } from '../../../../electronApi'
import { settings } from '../../../../settings'

const emit = defineEmits(['close'])

const checkForUpdatesAtStartup = vue.ref(settings.general.checkForUpdatesAtStartup)

function initialiseDialog() {
  // Note: we can come here as a result of hiding the dialog and this in case the dialog gets opened multiple times. We
  //       could do this when showing the dialog, but it might result in the UI flashing (e.g., a checkbox was checked
  //       and then it gets unchecked), hence we do it when hiding the dialog.

  checkForUpdatesAtStartup.value = settings.general.checkForUpdatesAtStartup
}

settings.onInitialised(() => {
  initialiseDialog()
})

function onOk() {
  settings.general.checkForUpdatesAtStartup = checkForUpdatesAtStartup.value

  settings.save()

  emit('close')
}
</script>
