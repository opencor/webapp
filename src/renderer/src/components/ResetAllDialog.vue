<template>
  <ConfirmDialog style="width: 37rem" />
</template>

<script setup>
import { useConfirm } from 'primevue/useconfirm'

const confirm = useConfirm()

if (window.electronAPI !== undefined) {
  window.electronAPI.onResetAll(() => {
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
        window.electronAPI.resetAll()
      }
    })
  })
}
</script>
