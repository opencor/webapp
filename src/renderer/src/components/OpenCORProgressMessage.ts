import * as vue from 'vue';

// Progress message of an instance of OpenCOR, i.e. a blocking message with a progress bar that its components can show
// while they are doing something that takes time (e.g., exporting data to CSV).
// Note: this uses Vue's provide()/inject() methods to ensure that each OpenCOR instance has its own progress message.

interface IOpenCORProgressMessage {
  show: (message: string) => void;
  update: (percent: number) => void;
  hide: () => void;
}

interface IOpenCORProgressMessageState {
  visible: vue.Ref<boolean>;
  message: vue.Ref<string>;
  progress: vue.Ref<number>;
}

const OpenCORProgressMessageKey = Symbol('OpenCORProgressMessage');

export const provideOpenCORProgressMessage = (): IOpenCORProgressMessageState => {
  const visible = vue.ref<boolean>(false);
  const message = vue.ref<string>('');
  const progress = vue.ref<number>(0);

  const show = (newMessage: string): void => {
    message.value = newMessage;
    progress.value = 0;
    visible.value = true;
  };

  const update = (percent: number): void => {
    progress.value = percent;
  };

  const hide = (): void => {
    visible.value = false;
  };

  vue.provide<IOpenCORProgressMessage>(OpenCORProgressMessageKey, {
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

export const useOpenCORProgressMessage = (): IOpenCORProgressMessage => {
  const progressMessage = vue.inject<IOpenCORProgressMessage | undefined>(OpenCORProgressMessageKey, undefined);

  if (!progressMessage) {
    throw new Error(
      'useOpenCORProgressMessage() must be called within a component that has provideOpenCORProgressMessage() in its ancestor tree.'
    );
  }

  return progressMessage;
};
