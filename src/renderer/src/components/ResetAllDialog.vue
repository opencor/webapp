<template>
  <BaseConfirmDialog style="width: 37rem" />
</template>

<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm'

// @ts-ignore (window.electronAPI may or not be defined and that is why we test it)
const electronAPI = window.electronAPI

if (electronAPI !== undefined) {
  const confirm = useConfirm()

  electronAPI.onResetAll(() => {
    confirm.require({
      header: 'OpenCOR',
      icon: 'pi pi-question-circle',
      message: 'You are about to reset all of your settings. Do you want to proceed?',
      acceptProps: {
        severity: 'danger'
      },
      rejectProps: {
        severity: 'secondary',
        outlined: true
      },
      accept: () => {
        electronAPI.resetAll()
      }
    })
  })
}
</script>
