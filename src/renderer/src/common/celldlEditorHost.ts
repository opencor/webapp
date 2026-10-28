import type { CellDLEditorCommand, EditorData } from '@celldl/editor';
import * as vueusecore from '@vueuse/core';

import * as vue from 'vue';

import * as locApi from '../libopencor/locApi';

import * as common from './common';

// CellDL Editor is shared by all our CellDL Editor views.
// Note: CellDL Editor listens to keyboard and pointer events on the window and the document, never stops listening to
//       them, and relies on some global state (e.g., its undo/redo history). This means that if we had one CellDL
//       Editor per CellDL Editor view, then pressing Backspace in one file tab could, for instance, delete the selected
//       object(s) in another (hidden) file tab. So, instead, we have only one CellDL Editor (see
//       CellDLEditorHostComponent.vue), which we move to the CellDL Editor view that is visible, and in which we open
//       the corresponding diagram. When no CellDL Editor view is visible, we close the diagram, so that CellDL Editor
//       cannot modify anything.

export interface ICellDLEditorClient {
  name: string;
  container: HTMLElement | null;
  data: string;
  active: boolean;
  loaded: boolean;
  issues: locApi.IIssue[];
}

// Note: we flag our call to createGlobalState() as pure, so that our library (which doesn't include our CellDL Editor
//       view) doesn't include this code.

export const useCellDLEditorHost = /* @__PURE__ */ vueusecore.createGlobalState(() => {
  const clients = vue.shallowReactive(new Set<ICellDLEditorClient>());
  const needed = vue.ref<boolean>(false);
  const ready = vue.ref<boolean>(false);
  const switching = vue.ref<boolean>(false);
  const editorCommand = vue.shallowRef<CellDLEditorCommand>();
  let loadedClient: ICellDLEditorClient | null = null;
  let openedClient: ICellDLEditorClient | null = null;

  // The client which diagram should be shown, if any.

  const targetClient = vue.computed<ICellDLEditorClient | null>(() => {
    for (const client of clients) {
      if (client.active && client.container && !client.issues.length) {
        return client;
      }
    }

    return null;
  });

  // The container in which the CellDL Editor should be mounted, if any.
  // Note: when a CellDL Editor view gets deactivated, KeepAlive moves the view (and therefore our CellDL Editor) out of
  //       the document. Our CellDL Editor only gets moved back into the document once our container has been updated,
  //       but this all happens within the same (synchronous) Vue flush, so neither the user nor any asynchronous code
  //       (e.g., a ResizeObserver) can ever see our CellDL Editor out of the document.

  const container = vue.computed<HTMLElement | null>(() => {
    return targetClient.value?.container ?? null;
  });

  // Register/unregister a client.
  // Note: once needed, our CellDL Editor is never destroyed since it never stops listening to events (see above).

  const register = (client: ICellDLEditorClient): void => {
    clients.add(client);

    needed.value = true;
  };

  const unregister = (client: ICellDLEditorClient): void => {
    clients.delete(client);
  };

  // Run our operations one after the other since CellDL Editor can only handle one command at a time.

  let lastOperation: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const res = lastOperation.then(operation);

    lastOperation = res.catch(() => undefined);

    return res;
  };

  // Send a command to CellDL Editor.
  // Note: CellDL Editor doesn't tell us when it is done with a command, but it handles our command as soon as it gets
  //       it and then only needs a tick to finish handling it, so we wait for the next animation frame to be safe.

  const sendCommand = async (command: CellDLEditorCommand): Promise<void> => {
    editorCommand.value = command;

    await vue.nextTick();
    await common.waitForNextAnimationFrame();
  };

  // Retrieve the diagram from CellDL Editor.
  // Note: we give up if CellDL Editor doesn't provide the diagram in time since, otherwise, our queue of operations
  //       would be blocked forever.

  const DATA_REQUEST_TIMEOUT = 3 * 1000; // 3 seconds.

  let dataRequestNumber = 0;
  const dataRequests = new Map<string, (data: string) => void>();

  const diagramData = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const kind = `opencor-${++dataRequestNumber}`;
      const timeoutId = window.setTimeout(() => {
        dataRequests.delete(kind);

        reject(new Error('CellDL Editor did not provide the diagram in time.'));
      }, DATA_REQUEST_TIMEOUT);

      dataRequests.set(kind, (data: string) => {
        window.clearTimeout(timeoutId);

        resolve(data);
      });

      editorCommand.value = {
        command: 'file',
        options: {
          action: 'data',
          kind
        }
      };
    });
  };

  const onEditorData = (data: EditorData): void => {
    const resolve = dataRequests.get(data.kind ?? '');

    if (resolve) {
      dataRequests.delete(data.kind ?? '');

      resolve(data.data ?? '');
    }
  };

  // Report an error to the client which diagram we last asked CellDL Editor to open.
  // Note: CellDL Editor opens a diagram asynchronously, so it may report an error after we have considered the diagram
  //       to be loaded. In that case, our target client changes (since it now has some issues), so we sync again and
  //       close the diagram (see sync()).

  const onEditorState = (state: { error: string }): void => {
    openedClient?.issues.push({
      type: locApi.EIssueType.ERROR,
      description: state.error
    });
  };

  // Open the diagram of our target client in CellDL Editor, after having saved the diagram of the previously loaded
  // client, if any.
  // Note: we only ever have one sync operation queued or running (i.e. while we are switching) since that operation
  //       keeps going until it has caught up with our target client, should it change in the meantime.

  const sync = (): void => {
    if (!ready.value || switching.value || targetClient.value === loadedClient) {
      return;
    }

    switching.value = true;

    void enqueue(async () => {
      try {
        for (let client = targetClient.value; ready.value && client !== loadedClient; client = targetClient.value) {
          // Save the diagram of the previously loaded client, if any.
          // Note #1: if we cannot retrieve the diagram, then we keep the last version we have of it (i.e. we lose its
          //          latest changes) rather than prevent other diagrams from being opened.
          // Note #2: if CellDL Editor reported an error after we considered the diagram to be loaded (see
          //          onEditorState()), then CellDL Editor doesn't (properly) hold the diagram, so we don't save it.

          if (loadedClient) {
            if (clients.has(loadedClient) && !loadedClient.issues.length) {
              try {
                loadedClient.data = await diagramData();
              } catch (error: unknown) {
                console.warn(
                  `OpenCOR: failed to retrieve the diagram of ${loadedClient.name}:`,
                  common.formatError(error)
                );
              }
            }

            loadedClient.loaded = false;
            loadedClient = null;
          }

          // Open the diagram of our target client in CellDL Editor.

          if (client) {
            openedClient = client;

            await sendCommand({
              command: 'file',
              options: {
                action: 'open',
                data: client.data,
                name: client.name
              }
            });

            // If we successfully opened the diagram, then we are done.

            if (!client.issues.length) {
              client.loaded = true;
              loadedClient = client;

              continue;
            }
          }

          // Close the diagram if there is no target client or if we couldn't open its diagram, in which case CellDL
          // Editor would still show the previous diagram.

          openedClient = null;

          await sendCommand({
            command: 'file',
            options: {
              action: 'close'
            }
          });
        }
      } finally {
        switching.value = false;
      }
    });
  };

  // Sync our CellDL Editor with our target client whenever either of them changes.

  vue.watch([ready, targetClient], sync);

  // Mark our CellDL Editor as ready.

  const setReady = (): void => {
    ready.value = true;
  };

  // Return the (possibly edited) diagram of the given client.

  const clientData = (client: ICellDLEditorClient): Promise<string> => {
    return enqueue(async () => {
      if (client === loadedClient && !client.issues.length) {
        client.data = await diagramData();
      }

      return client.data;
    });
  };

  return {
    clientData,
    container,
    editorCommand,
    needed,
    onEditorData,
    onEditorState,
    register,
    setReady,
    switching,
    unregister
  };
});
