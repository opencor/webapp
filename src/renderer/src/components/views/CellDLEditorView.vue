<template>
  <div class="toolbar-based-view relative h-full flex flex-col">
    <Toolbar class="p-1! shrink-0">
      <template #end>
        <div class="flex gap-1">
          <Button class="p-1! toolbar-button"
            icon="pi pi-chart-line"
            text severity="secondary"
            title="Standard simulation"
            :disabled="!client.loaded"
            @click="onExportCombineArchive(EXPORT_KIND_SIMULATE)"
          />
          <Button class="p-1! toolbar-button"
            icon="pi pi-download"
            text severity="secondary"
            title="Export COMBINE archive"
            :disabled="!client.loaded"
            @click="onExportCombineArchive(EXPORT_KIND_DOWNLOAD)"
          />
        </div>
      </template>
    </Toolbar>
    <div class="grow min-h-0 relative">
      <IssuesView v-if="client.issues.length" class="m-4" style="height: calc(100% - 2rem);" :issues="client.issues" />
      <div v-show="!client.issues.length" ref="containerRef" class="celldl-editor h-full" />
      <BlockingMessageComponent v-if="!client.loaded && !client.issues.length" message="Loading CellDL Editor..." />
    </div>
    <BaseDialog v-model:visible="exportIssuesVisible" header="Generating CellML" style="width: 39rem">
      <IssuesView :issues="exportIssues" />
      <template #footer>
        <Button autofocus label="OK" @click="exportIssuesVisible = false" />
      </template>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import * as celldl from '../../common/celldl';
import { type ICellDLEditorClient, useCellDLEditorHost } from '../../common/celldlEditorHost';
import * as common from '../../common/common';
import { LONG_DELAY } from '../../common/constants';
import * as locApi from '../../libopencor/locApi';

import { useOpenCORMessage } from '../OpenCORMessage';

import './toolbar-based-view.css';

const EXPORT_KIND_DOWNLOAD = 'download';
const EXPORT_KIND_SIMULATE = 'simulate';

const props = defineProps<{
  file: locApi.File;
  isActiveFile: boolean;
}>();

const emit = defineEmits<{
  error: [message: string];
  openFile: [fileFilePathOrFileContents: string];
}>();

const host = useCellDLEditorHost();
const opencorMessage = useOpenCORMessage();
const containerRef = vue.shallowRef<HTMLElement | null>(null);
const exportIssues = vue.ref<locApi.IIssue[]>([]);
const exportIssuesVisible = vue.ref<boolean>(false);
const celldlFileName = common.fileName(props.file.canonicalPath());

// Our view is kept alive, so keep track of whether it is active, i.e. whether it is visible in its file tab.

const isActiveView = vue.ref<boolean>(true);

vue.onActivated(() => {
  isActiveView.value = true;
});

vue.onDeactivated(() => {
  isActiveView.value = false;
});

// Use our shared CellDL Editor (see common/celldlEditorHost.ts), which shows our diagram when we are visible.

const client = vue.reactive({
  name: celldlFileName,
  container: null,
  data: new TextDecoder().decode(props.file.contents()),
  active: vue.computed<boolean>(() => props.isActiveFile && isActiveView.value),
  loaded: false,
  issues: []
}) as ICellDLEditorClient;

vue.onMounted(() => {
  client.container = containerRef.value;

  host.register(client);
});

vue.onBeforeUnmount(() => {
  host.unregister(client);
});

// Export our (possibly edited) diagram to a COMBINE archive, which we can then either simulate or download.

const onExportCombineArchive = async (kind: string): Promise<void> => {
  try {
    // Get the CellDL data from the editor, which may have been edited by the user.

    const celldlData = await host.clientData(client);

    // Initialise Python, if needed, and then delay briefly so that the user can see that we reached 100%.

    if (!celldl.isPythonInitialised()) {
      opencorMessage.show('Initialising Python...');

      await celldl.initialisePython(opencorMessage.update);
      await common.sleep(LONG_DELAY);
    }

    // Generate the CellML from the CellDL.

    opencorMessage.show('Generating CellML...', false);

    const res = await celldl.cellmlFromCelldl(celldlData, celldlFileName);

    if (!res.cellml) {
      exportIssues.value = res.issues.map((issue) => {
        return {
          type: locApi.EIssueType.ERROR,
          description: issue
        };
      });
      exportIssuesVisible.value = true;

      return;
    }

    // Generate the COMBINE archive from the CellML and the CellDL, and then either simulate it or download it.

    const combineArchive = celldl.combineArchive(res.cellml, celldlData);

    if (kind === EXPORT_KIND_SIMULATE) {
      emit('openFile', `data:application/zip;base64,${await combineArchive.generateAsync({ type: 'base64' })}`);
    } else {
      common.downloadFile(
        `${common.baseFileName(celldlFileName)}.omex`,
        await combineArchive.generateAsync({ type: 'blob', compression: 'DEFLATE' }),
        'application/zip'
      );
    }
  } catch (error: unknown) {
    emit('error', `Failed to export the CellDL file to a COMBINE archive: ${common.formatError(error)}`);
  } finally {
    opencorMessage.hide();
  }
};
</script>
