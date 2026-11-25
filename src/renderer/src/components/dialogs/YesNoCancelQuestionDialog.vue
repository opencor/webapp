<template>
  <MessageDialog kind="question" :title="title" :text="question" :severity="severity">
    <template #footer>
      <DialogButtons>
        <Button :autofocus="severity !== 'danger'"
          :label="yesLabel"
          :severity="severity === 'danger' ? 'danger' : undefined"
          @click="$emit('yes')"
        />
        <Button :label="noLabel" severity="secondary" @click="$emit('no')" />
        <Button :autofocus="severity === 'danger'"
          :label="cancelLabel"
          severity="secondary"
          @click="$emit('cancel')"
        />
      </DialogButtons>
    </template>
  </MessageDialog>
</template>

<script setup lang="ts">
import type { QuestionDialogSeverity } from './MessageDialog.vue';

// Note: same as for YesNoQuestionDialog.vue when it comes to the labels of our buttons, the colour of our yes button,
//       and which button has the focus by default, except that it is our cancel button (rather than our no button)
//       that has the focus by default if our question is about something dangerous, since it is the safest option.

withDefaults(
  defineProps<{
    title: string;
    question: string;
    severity?: QuestionDialogSeverity;
    yesLabel?: string;
    noLabel?: string;
    cancelLabel?: string;
  }>(),
  {
    severity: 'warning',
    yesLabel: 'Yes',
    noLabel: 'No',
    cancelLabel: 'Cancel'
  }
);

defineEmits<{
  yes: [];
  no: [];
  cancel: [];
}>();
</script>
