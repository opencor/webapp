<template>
  <!--
  Note #1: our mask covers the whole of OpenCOR (which may not cover the whole window, e.g., if it is embedded in a
           page), so it is a container (named opencor-dialog) that can be queried to know whether our dialog should use
           a narrow layout (see, for instance, AboutDialog.vue).
  Note #2: our width depends on our size (see DIALOG_WIDTHS below), but we never get wider than OpenCOR (minus some
           margin), e.g. on a narrow screen.
  Note #3: our content clips its contents (since it can be scrolled), so it has some vertical padding, which it takes
           from our header and footer (using negative margins), for the focus ring of an element at its top or bottom
           (e.g., a button in the header of a section of a settings dialog) to be fully visible (see
           --opencor-focus-ring-extent in app.css).
  Note #4: we handle Escape ourselves (see onDocumentKeyDown() below).
  -->
  <Dialog ref="dialogRef" :modal="true" appendTo="self" :closeOnEscape="false"
    :style="{ width: DIALOG_WIDTHS[size], maxWidth: 'calc(100% - 2rem)' }"
    :pt:mask:style="{
      position: 'absolute',
      containerType: 'inline-size',
      containerName: 'opencor-dialog'
    }"
    :pt:content="{
      class: 'h-full',
      style: {
        paddingTop: 'var(--opencor-focus-ring-extent)',
        paddingBottom: 'var(--opencor-focus-ring-extent)',
        marginTop: 'calc(-1 * var(--opencor-focus-ring-extent))',
        marginBottom: 'calc(-1 * var(--opencor-focus-ring-extent))'
      }
    }"
    :pt:footer="{
      style: 'padding-top: 1.25rem'
    }"
    :pt:transition="{ css: false }"
    @show="onShow"
    @hide="onHide"
  >
    <template v-for="(_event, slot) of $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type Dialog from 'primevue/dialog';
import * as vue from 'vue';

import { ESCAPE_KEY_OVERLAYS } from '../../common/constants';

// Note: we emit our hidden event whenever we get hidden, be it because we have been accepted (e.g., using an OK button)
//       or dismissed (e.g., using Escape or our close button).

export type DialogSize = 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    centreOn?: HTMLElement | null;
    closeOnEscape?: boolean;
    size?: DialogSize;
  }>(),
  {
    centreOn: null,
    closeOnEscape: true,
    size: 'sm'
  }
);

const emit = defineEmits<{
  hidden: [];
}>();

// The width of our small dialogs (e.g., our message dialogs), medium dialogs (e.g., our About dialog), and large
// dialogs (e.g., the settings dialog of our interactive view).

const DIALOG_WIDTHS: Record<DialogSize, string> = {
  sm: '30rem',
  md: '42.25rem',
  lg: '67.5rem'
};

const { incrementDialogs, decrementDialogs } = useDialogState();

// Note: PrimeVue's Dialog keeps track of its container (i.e. our dialog) and of its mask, so we retrieve them from it
//       rather than look for them in the DOM, which could otherwise find the dialog of another instance of OpenCOR on
//       the same page.

const dialogRef = vue.shallowRef<
  (InstanceType<typeof Dialog> & { container: HTMLElement | null; mask: HTMLElement | null; close: () => void }) | null
>(null);

let dialogElement: HTMLElement | null = null;
let containerElement: HTMLElement | null = null;
let mutationObserver: MutationObserver | null = null;
let shown = false;

const checkDialogPosition = () => {
  // Make sure that our dialog remains within the requested element, if any, or within our mask (i.e., within the whole
  // of OpenCOR) if no element is requested.

  if (dialogElement instanceof HTMLElement && containerElement instanceof HTMLElement) {
    const dialogRect = dialogElement.getBoundingClientRect();
    const boundsRect = (props.centreOn ?? containerElement).getBoundingClientRect();

    dialogElement.style.top = `${Math.max(Math.min(dialogRect.top, boundsRect.bottom - dialogRect.height), boundsRect.top)}px`;
    dialogElement.style.left = `${Math.max(Math.min(dialogRect.left, boundsRect.right - dialogRect.width), boundsRect.left)}px`;
  }
};

const centreDialog = () => {
  // Centre our dialog over the requested element, if any, or over our mask (i.e., over the whole of OpenCOR) if no
  // element is requested.
  // Note: our dialog is centred within the padding box of our mask, so we pad our mask so that its padding box matches
  //       the requested element. We use !important since our mask may otherwise be padded (see .with-main-menu in
  //       OpenCOR.vue).

  if (props.centreOn && containerElement instanceof HTMLElement) {
    const containerRect = containerElement.getBoundingClientRect();
    const centreOnRect = props.centreOn.getBoundingClientRect();
    const paddingTop = Math.max(0, centreOnRect.top - containerRect.top);
    const paddingRight = Math.max(0, containerRect.right - centreOnRect.right);
    const paddingBottom = Math.max(0, containerRect.bottom - centreOnRect.bottom);
    const paddingLeft = Math.max(0, centreOnRect.left - containerRect.left);

    containerElement.style.setProperty(
      'padding',
      `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
      'important'
    );
  }
};

const disconnectMutationObserver = () => {
  if (mutationObserver) {
    mutationObserver.disconnect();

    mutationObserver = null;
  }
};

// Close ourselves when Escape is pressed, but only if we are the top-most dialog (rather than let PrimeVue do it, since
// it would close all the dialogs that are shown, e.g., a question asked on top of another dialog and that other dialog)
// and if nothing is open on top of us (e.g., a popover, which closes itself when Escape is pressed, or the panel of a
// select, in which case Escape is for it).
// Note #1: like PrimeVue, we listen to Escape during the bubble phase of our document, so that an element can keep
//          Escape for itself by stopping its propagation (e.g., one of our input widgets to discard the value being
//          edited).
// Note #2: our list of shown dialogs is shared by all the instances of OpenCOR on the same page, so that Escape only
//          closes the dialog that was shown last, whichever instance of OpenCOR it belongs to.

const dialogId = Symbol('BaseDialog');

const onDocumentKeyDown = (event: KeyboardEvent): void => {
  if (
    event.key !== 'Escape' ||
    event.isComposing ||
    !props.closeOnEscape ||
    shownDialogs[shownDialogs.length - 1] !== dialogId
  ) {
    return;
  }

  const opencorElement = dialogRef.value?.container?.closest('.opencor');

  if (
    opencorElement &&
    Array.from(opencorElement.querySelectorAll<HTMLElement>(ESCAPE_KEY_OVERLAYS)).some(
      (element) => element.getClientRects().length
    )
  ) {
    return;
  }

  dialogRef.value?.close();
};

const addToShownDialogs = (): void => {
  shownDialogs.push(dialogId);

  document.addEventListener('keydown', onDocumentKeyDown);
};

const removeFromShownDialogs = (): void => {
  const index = shownDialogs.indexOf(dialogId);

  if (index !== -1) {
    shownDialogs.splice(index, 1);
  }

  document.removeEventListener('keydown', onDocumentKeyDown);
};

const onShow = () => {
  shown = true;

  incrementDialogs();
  addToShownDialogs();

  void vue.nextTick().then(() => {
    if (!shown) {
      return;
    }

    dialogElement = dialogRef.value?.container ?? null;
    containerElement = dialogRef.value?.mask ?? null;

    if (dialogElement && containerElement) {
      centreDialog();

      mutationObserver = new MutationObserver(() => {
        checkDialogPosition();
      });

      mutationObserver.observe(dialogElement, { attributes: true, attributeFilter: ['style'] });

      checkDialogPosition();
    }
  });
};

const onHide = () => {
  if (shown) {
    shown = false;

    decrementDialogs();
    removeFromShownDialogs();
  }

  emit('hidden');

  void vue.nextTick().then(() => {
    disconnectMutationObserver();
  });
};

// Make sure that we are no longer accounted for in our dialog state if we get unmounted while being shown (e.g., if the
// file tab that contains us gets closed), since our dialog doesn't emit a hide event in that case. Otherwise, our UI
// would remain disabled forever (see compUiEnabled in OpenCOR.vue).

vue.onBeforeUnmount(() => {
  if (shown) {
    shown = false;

    decrementDialogs();
    removeFromShownDialogs();
  }

  disconnectMutationObserver();
});
</script>

<script lang="ts">
// The dialogs that are shown, in the order in which they were shown (see onDocumentKeyDown() above).

const shownDialogs: symbol[] = [];

// Dialog state management for tracking active dialogs in a given instance of OpenCOR.
// Note: this uses Vue's provide()/inject() methods to ensure that each OpenCOR instance has its own dialog state.

const DialogStateKey = Symbol('DialogState');

interface DialogState {
  activeDialogs: vue.Ref<number>;
  isDialogActive: vue.ComputedRef<boolean>;
  incrementDialogs: () => void;
  decrementDialogs: () => void;
}

export const provideDialogState = (): DialogState => {
  const activeDialogs = vue.ref(0);
  const isDialogActive = vue.computed<boolean>(() => {
    return activeDialogs.value > 0;
  });

  const incrementDialogs = () => {
    ++activeDialogs.value;
  };

  const decrementDialogs = () => {
    --activeDialogs.value;
  };

  const state: DialogState = {
    activeDialogs,
    isDialogActive,
    incrementDialogs,
    decrementDialogs
  };

  vue.provide(DialogStateKey, state);

  return state;
};

export const useDialogState = (): DialogState => {
  const state = vue.inject<DialogState>(DialogStateKey);

  if (!state) {
    throw new Error('useDialogState() must be called within a component that has provideDialogState in its ancestor tree.');
  }

  return state;
}
</script>
