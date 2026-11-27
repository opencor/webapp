<template>
  <MessageDialog kind="message" :title="title" :text="message" :severity="severity">
    <template v-if="$slots.default" #default>
      <slot />
    </template>
    <template #footer>
      <Button autofocus label="OK" @click="$emit('ok')" />
    </template>
  </MessageDialog>
</template>

<script setup lang="ts">
import type { MessageDialogSeverity } from './MessageDialog.vue';

// Note: our message is either given as some (HTML) text, using our message property, or as some content (e.g., a list),
//       using our default slot, in which case our message property is ignored.

defineEmits<{
  ok: [];
}>();

withDefaults(
  defineProps<{
    title: string;
    message?: string;
    severity?: MessageDialogSeverity;
  }>(),
  {
    message: '',
    severity: 'info'
  }
);
</script>
