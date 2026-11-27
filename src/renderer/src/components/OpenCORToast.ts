import type { ToastMessageOptions } from 'primevue/toast';
import * as vue from 'vue';

type OpenCORAddToast = (options: ToastMessageOptions) => void;

const OpenCORToastKey = Symbol('OpenCORToast');

export const provideOpenCORToast = (addToast: OpenCORAddToast): void => {
  vue.provide(OpenCORToastKey, addToast);
};

export const useOpenCORToast = (): OpenCORAddToast => {
  const addToast = vue.inject<OpenCORAddToast | undefined>(OpenCORToastKey, undefined);

  if (!addToast) {
    throw new Error(
      'useOpenCORToast() must be called within a component that has provideOpenCORToast() in its ancestor tree.'
    );
  }

  return addToast;
};

// The detail of a toast that reports an issue, i.e. what the issue is about (e.g., a file), if anything, on its own
// line (see ToastMessageWidget.vue), followed by the issue itself, as a sentence.
// Note: what an issue is about may be very long (e.g., an action with a data URL), in which case we truncate it since
//       it would otherwise make our toast very tall.

const MAX_TOAST_SUBJECT_LENGTH = 150;

export const toastIssueDetail = (subject: string | undefined, issue: string): string => {
  if (!subject) {
    return issue;
  }

  return `${subject.length > MAX_TOAST_SUBJECT_LENGTH ? `${subject.slice(0, MAX_TOAST_SUBJECT_LENGTH - 1)}…` : subject}\n${issue}`;
};
