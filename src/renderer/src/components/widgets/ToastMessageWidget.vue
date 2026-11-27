<template>
  <div class="toast" :class="`toast-${severity}`"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <span class="toast-icon">
      <i :class="ICONS[severity]" />
    </span>
    <div class="toast-text">
      <div v-if="message.summary" class="toast-summary">{{ message.summary }}</div>
      <div v-if="message.detail" class="toast-detail">{{ message.detail }}</div>
    </div>
    <ToolbarButtonWidget v-if="message.closable !== false" class="toast-close-button"
      icon="pi pi-times"
      label="Close"
      small
      tooltipAlign="end"
      @click="emit('close')"
    />
  </div>
</template>

<script setup lang="ts">
import type { ToastMessageOptions } from 'primevue/toast';
import * as vue from 'vue';

import { TOAST_LIFE, WARNING_TOAST_LIFE } from '../../common/constants';

// A toast message, which is shown using the container slot of PrimeVue's Toast component (see OpenCOR.vue), and which
// looks like our message dialogs (see dialogs/message-dialog.css), i.e. a severity icon next to some text.

type Severity = 'info' | 'success' | 'warn' | 'error';

const props = defineProps<{
  message: ToastMessageOptions;
}>();

const emit = defineEmits<{
  close: [];
}>();

const ICONS: Record<Severity, string> = {
  info: 'pi pi-info-circle',
  success: 'pi pi-check-circle',
  warn: 'pi pi-exclamation-triangle',
  error: 'pi pi-times-circle'
};

// Note: PrimeVue also has the secondary and contrast severities, which we don't use, so we show them as information.

const severity = vue.computed<Severity>(() => {
  const messageSeverity = props.message.severity;

  return messageSeverity && Object.hasOwn(ICONS, messageSeverity) ? (messageSeverity as Severity) : 'info';
});

// Close ourselves once our life is over, which depends on our severity, with an error being shown until it is closed
// (so that the user has time to read it and, if needed, to copy it).
// Note #1: our life is paused while we are hovered or have the keyboard focus (e.g., our close button), so that the
//          user has time to read us.
// Note #2: we handle our life ourselves (rather than letting PrimeVue do it) since PrimeVue only pauses it while a
//          toast is hovered, not while it has the keyboard focus.

const LIVES: Record<Severity, number | undefined> = {
  info: TOAST_LIFE,
  success: TOAST_LIFE,
  warn: WARNING_TOAST_LIFE,
  error: undefined
};

let lifeRemaining = LIVES[severity.value];
let lifeStartedAt = 0;
let lifeTimeout: number | undefined;
let hovered = false;
let focused = false;

const resumeLife = (): void => {
  if (lifeRemaining === undefined || lifeTimeout !== undefined || hovered || focused) {
    return;
  }

  lifeStartedAt = Date.now();
  lifeTimeout = window.setTimeout(() => {
    lifeTimeout = undefined;

    emit('close');
  }, lifeRemaining);
};

const pauseLife = (): void => {
  if (lifeRemaining === undefined || lifeTimeout === undefined) {
    return;
  }

  window.clearTimeout(lifeTimeout);

  lifeTimeout = undefined;
  lifeRemaining = Math.max(lifeRemaining - (Date.now() - lifeStartedAt), 0);
};

const onMouseEnter = (): void => {
  hovered = true;

  pauseLife();
};

const onMouseLeave = (): void => {
  hovered = false;

  resumeLife();
};

const onFocusIn = (): void => {
  focused = true;

  pauseLife();
};

const onFocusOut = (event: FocusEvent): void => {
  if (event.relatedTarget instanceof Node && (event.currentTarget as HTMLElement).contains(event.relatedTarget)) {
    return;
  }

  focused = false;

  resumeLife();
};

vue.onMounted(() => {
  resumeLife();
});

vue.onBeforeUnmount(() => {
  window.clearTimeout(lifeTimeout);
});
</script>

<style scoped>
.toast {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0.5rem 0.75rem 0.75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.5rem;
  background-color: var(--p-content-background);
  box-shadow: var(--opencor-card-shadow);
}

.toast-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background-color: color-mix(in srgb, var(--toast-color) 15%, transparent);
  color: var(--toast-color);
  font-size: 0.875rem;
}

/**
 * Note: our text is vertically centred with our icon when our summary is on its own, hence its top padding.
 */

/**
 * Note: our text can be selected (e.g., to copy an error), unlike most of OpenCOR's text (see app.css).
 */

.toast-text {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: 0.125rem;
  min-width: 0;
  padding-top: 0.25rem;
  user-select: text;
}

.toast-summary {
  color: var(--p-text-color);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
}

/**
 * Note: our detail may contain some line breaks (e.g., to separate a file path from an issue), hence we preserve them.
 */

.toast-detail {
  color: var(--p-text-muted-color);
  font-size: 0.8125rem;
  line-height: 1.25rem;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.toast-close-button {
  margin-top: 0.125rem;
}

/**
 * Severities.
 */

.toast-info {
  --toast-color: var(--opencor-info-color);
}

.toast-success {
  --toast-color: var(--opencor-success-color);
}

.toast-warn {
  --toast-color: var(--opencor-warn-color);
}

.toast-error {
  --toast-color: var(--opencor-error-color);
}
</style>
