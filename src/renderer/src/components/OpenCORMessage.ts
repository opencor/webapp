import * as vue from 'vue';

// Message of an instance of OpenCOR, i.e. a blocking message with an (optional) progress bar that its components can
// show while they are doing something that takes time (e.g., exporting data to CSV).
// Note #1: this uses Vue's provide()/inject() methods to ensure that each OpenCOR instance has its own message.
// Note #2: our message is shared by all the components of an OpenCOR instance, so a component may want to hide its
//          message after another component has shown its own (e.g., if it waits a bit before hiding it, see
//          GraphPanelWidget.onCsvExport()) or keep updating its progress after another component has shown its own. So,
//          showing our message returns an id, which must be used to update or hide it, and our message only gets
//          updated or hidden if it is still the one that was shown with that id.

interface OpenCORMessage {
  show: (message: string, withProgress?: boolean) => number;
  update: (id: number, percent: number) => void;
  hide: (id: number) => void;
}

interface OpenCORMessageState {
  visible: vue.Ref<boolean>;
  message: vue.Ref<string>;
  progress: vue.Ref<number | undefined>;
}

const OpenCORMessageKey = Symbol('OpenCORMessage');

export const provideOpenCORMessage = (): OpenCORMessageState => {
  const visible = vue.ref<boolean>(false);
  const message = vue.ref<string>('');
  const progress = vue.ref<number | undefined>(undefined);

  let currentId = 0;

  const show = (newMessage: string, withProgress: boolean = true): number => {
    message.value = newMessage;
    progress.value = withProgress ? 0 : undefined;
    visible.value = true;

    return ++currentId;
  };

  const update = (id: number, percent: number): void => {
    if (id === currentId) {
      progress.value = percent;
    }
  };

  const hide = (id: number): void => {
    if (id === currentId) {
      visible.value = false;
    }
  };

  vue.provide<OpenCORMessage>(OpenCORMessageKey, {
    show,
    update,
    hide
  });

  return {
    visible,
    message,
    progress
  };
};

export const useOpenCORMessage = (): OpenCORMessage => {
  const opencorMessage = vue.inject<OpenCORMessage | undefined>(OpenCORMessageKey, undefined);

  if (!opencorMessage) {
    throw new Error(
      'useOpenCORMessage() must be called within a component that has provideOpenCORMessage() in its ancestor tree.'
    );
  }

  return opencorMessage;
};
