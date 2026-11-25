<template>
  <BaseDialog header="Disconnect from GitHub">
    <div class="mt-2 mb-4">You are about to disconnect from GitHub. Do you want to continue?</div>
    <template #footer>
      <DialogButtons>
        <Button autofocus label="Disconnect" severity="danger" @click="$emit('yes')" />
        <Button label="Cancel" severity="secondary" @click="$emit('no')" />
      </DialogButtons>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
defineEmits<{
  yes: [];
  no: [];
}>();
</script>
