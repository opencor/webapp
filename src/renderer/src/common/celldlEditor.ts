import type { CellDLEditorCommand, EditorData, EditorStateData, EditorStatus } from '@celldl/editor';

import * as vue from 'vue';

import * as common from './common';

// Drive an instance of CellDL Editor (see CellDLEditorView.vue), i.e. provide the command that it should handle, handle
// its events, and let our caller open a diagram in it, retrieve its (possibly edited) diagram, and mark its diagram as
// unmodified (e.g., once it has been saved).
// Note #1: CellDL Editor lets us know through its editor-state event when it is ready (i.e. when it can handle our
//          commands), when its status changes (e.g., when its diagram gets modified or unmodified), and when it fails
//          to open a diagram. It may also fail to get ready (e.g., if it fails to initialise itself), in which case our
//          caller tells us about it (see failed()) since we would otherwise wait for it forever.
// Note #2: CellDL Editor can only handle one command at a time and doesn't tell us when it is done with one, but it
//          handles a command as soon as it gets it and then only needs a tick to finish handling it, so we run our
//          operations one after the other and wait for the next animation frame after sending a command.

export interface CellDLEditorCallbacks {
  onError: (message: string) => void;
  onStatus: (status: EditorStatus) => void;
}

const DATA_REQUEST_TIMEOUT = 3 * 1000; // 3 seconds.

export const useCellDLEditor = (callbacks: CellDLEditorCallbacks) => {
  const command = vue.shallowRef<CellDLEditorCommand | undefined>();

  // Run our operations one after the other (see Note #2 above).

  let lastOperation: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const res = lastOperation.then(operation);

    lastOperation = res.catch(() => undefined);

    return res;
  };

  // Wait for CellDL Editor to be ready, unless it failed to get ready (see failed()).

  let isReady = false;
  let failure: string | null = null;
  let resolveReady: () => void = () => {};
  let rejectReady: (error: Error) => void = () => {};
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  ready.catch(() => undefined);

  // Send a command to CellDL Editor (see Note #2 above).

  const sendCommand = async (newCommand: CellDLEditorCommand): Promise<void> => {
    command.value = newCommand;

    await vue.nextTick();
    await common.waitForNextAnimationFrame();
  };

  // Retrieve the diagram from CellDL Editor.
  // Note #1: we give up if CellDL Editor doesn't provide the diagram in time since, otherwise, our queue of operations
  //          would be blocked forever.
  // Note #2: we also give up if CellDL Editor provides no diagram (e.g., if it failed to serialise it) since,
  //          otherwise, we would provide nothing as the diagram.

  let dataRequestNumber = 0;
  const dataRequests = new Map<string, (data: string | undefined) => void>();

  const diagramData = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const kind = `opencor-${++dataRequestNumber}`;
      const timeoutId = window.setTimeout(() => {
        dataRequests.delete(kind);

        reject(new Error('CellDL Editor did not provide the diagram in time.'));
      }, DATA_REQUEST_TIMEOUT);

      dataRequests.set(kind, (data: string | undefined) => {
        window.clearTimeout(timeoutId);

        if (data) {
          resolve(data);
        } else {
          reject(new Error('CellDL Editor did not provide the diagram.'));
        }
      });

      command.value = {
        command: 'file',
        options: {
          action: 'data',
          kind
        }
      };
    });
  };

  // Handle CellDL Editor's events.

  const onEditorState = (state: EditorStateData): void => {
    if (state.ready && !isReady) {
      isReady = true;

      resolveReady();
    }

    if (state.status) {
      callbacks.onStatus(state.status);
    }

    if (state.error) {
      callbacks.onError(state.error);
    }
  };

  const onEditorData = (data: EditorData): void => {
    const settle = dataRequests.get(data.kind ?? '');

    if (settle) {
      dataRequests.delete(data.kind ?? '');

      settle(data.data);
    }
  };

  // Let us know that CellDL Editor failed to get ready (see Note #1 above).

  const failed = (error: unknown): void => {
    if (isReady || failure !== null) {
      return;
    }

    failure = `CellDL Editor could not be loaded (${common.formatError(error)}).`;

    rejectReady(new Error(failure));

    callbacks.onError(failure);
  };

  // Open the given diagram.

  const open = (data: string, name: string): Promise<void> => {
    return enqueue(async () => {
      await ready;

      await sendCommand({
        command: 'file',
        options: {
          action: 'open',
          data,
          name
        }
      });
    });
  };

  // Retrieve our (possibly edited) diagram.

  const data = (): Promise<string> => {
    return enqueue(async () => {
      await ready;

      return diagramData();
    });
  };

  // Mark our diagram as unmodified, as long as the given condition still holds once it is our turn (e.g., our diagram
  // hasn't been edited since it was saved), and return whether we did.
  // Note: CellDL Editor clears its undo history when it marks a diagram as unmodified.

  const clean = (condition: () => boolean): Promise<boolean> => {
    return enqueue(async () => {
      await ready;

      if (!condition()) {
        return false;
      }

      await sendCommand({
        command: 'edit',
        options: {
          action: 'clean'
        }
      });

      return true;
    });
  };

  return {
    command,
    onEditorState,
    onEditorData,
    failed,
    open,
    data,
    clean
  };
};
