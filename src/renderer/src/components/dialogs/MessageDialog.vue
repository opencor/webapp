<template>
  <BaseDialog :header="title" role="alertdialog" :aria-describedby="`${iconId} ${textId}`">
    <div class="message-dialog" :class="`message-dialog-${severity}`">
      <span class="message-dialog-icon">
        <i :id="iconId" :class="severityInfo.icon" role="img" :aria-label="severityInfo.label" />
      </span>
      <div v-if="$slots.default" :id="textId" class="message-dialog-text">
        <slot />
      </div>
      <div v-else :id="textId" class="message-dialog-text" v-html="text"></div>
    </div>
    <template #footer>
      <slot name="footer" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import './message-dialog.css';

// A message or question dialog (see OkMessageDialog.vue, YesNoQuestionDialog.vue, and YesNoCancelQuestionDialog.vue),
// i.e. a severity icon next to some text, which is given either as some HTML, using our text property, or as some
// content (e.g., a list), using our default slot (in which case our text property is ignored), and some buttons, which
// are given using our footer slot.
// Note: our dialog is an alert dialog, whose description is our severity followed by our text, so that assistive
//       technologies announce both when our dialog is shown.

export type MessageDialogKind = 'message' | 'question';
export type MessageDialogSeverity = 'info' | 'success' | 'warning' | 'danger';
export type QuestionDialogSeverity = Exclude<MessageDialogSeverity, 'success'>;

const props = withDefaults(
  defineProps<{
    kind: MessageDialogKind;
    title: string;
    text?: string;
    severity?: MessageDialogSeverity;
  }>(),
  {
    text: '',
    severity: 'info'
  }
);

interface SeverityInfo {
  icon: string;
  label: string;
}

const MESSAGE_SEVERITY_INFOS: Record<MessageDialogSeverity, SeverityInfo> = {
  info: { icon: 'pi pi-info-circle', label: 'Information' },
  success: { icon: 'pi pi-check-circle', label: 'Success' },
  warning: { icon: 'pi pi-exclamation-triangle', label: 'Warning' },
  danger: { icon: 'pi pi-times-circle', label: 'Error' }
};

const QUESTION_SEVERITY_INFOS: Record<QuestionDialogSeverity, SeverityInfo> = {
  info: { icon: 'pi pi-question-circle', label: 'Question' },
  warning: { icon: 'pi pi-exclamation-triangle', label: 'Warning' },
  danger: { icon: 'pi pi-exclamation-triangle', label: 'Danger' }
};

const severityInfo = vue.computed<SeverityInfo>(() => {
  if (props.kind === 'question' && props.severity !== 'success') {
    return QUESTION_SEVERITY_INFOS[props.severity];
  }

  return MESSAGE_SEVERITY_INFOS[props.severity];
});

const id = vue.useId();
const iconId = `message-dialog-icon-${id}`;
const textId = `message-dialog-text-${id}`;
</script>
