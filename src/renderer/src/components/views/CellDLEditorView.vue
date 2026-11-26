<template>
  <div class="toolbar-based-view relative h-full flex flex-col">
    <Toolbar class="shrink-0">
      <template #start>
        <ToolbarButtonWidget
          icon="pi pi-info-circle"
          label="CellDL Editor limitations"
          @click="limitationsVisible = true"
        />
      </template>
      <template #end>
        <div class="flex gap-1">
          <ToolbarButtonWidget
            icon="pi pi-chart-line"
            label="Standard simulation"
            :disabled="!loaded"
            @click="onExportOmexFile(EXPORT_KIND_SIMULATE)"
          />
          <ToolbarButtonWidget
            icon="pi pi-download"
            label="Export OMEX file"
            :disabled="!loaded"
            @click="onExportOmexFile(EXPORT_KIND_DOWNLOAD)"
          />
        </div>
      </template>
    </Toolbar>
    <div class="grow min-h-0 relative">
      <IssuesView v-if="issues.length" class="m-4" style="height: calc(100% - 2rem);" :issues="issues" />
      <div v-show="!issues.length" class="celldl-editor-container h-full"
        @pointerup.capture="onEditorInput"
        @change.capture="onEditorInput"
        @keydown.capture="onEditorKeyDown"
      >
        <CellDLEditor v-if="runtimeLoaded" class="h-full"
          :editorCommand="celldlEditor.command.value"
          :theme="theme()"
          @editor-data="celldlEditor.onEditorData"
          @editor-state="celldlEditor.onEditorState"
        />
      </div>
      <BlockingMessageComponent v-if="!loaded && !issues.length" message="Loading CellDL Editor..." />
    </div>
    <BaseDialog v-model:visible="exportIssuesVisible" :header="exportIssuesTitle" size="md">
      <p class="export-issues-text">The diagram couldn't be converted to CellML, so it couldn't be {{ exportIssuesKind === EXPORT_KIND_SIMULATE ? 'simulated' : 'exported' }}.</p>
      <div class="export-issues">
        <IssuesView :issues="exportIssues" :extraSpace="false" />
      </div>
      <template #footer>
        <Button autofocus label="OK" @click="exportIssuesVisible = false" />
      </template>
    </BaseDialog>
    <OkMessageDialog v-model:visible="limitationsVisible" title="CellDL Editor Limitations" @ok="limitationsVisible = false">
      <p class="m-0">
        The CellDL Editor view has the following limitations, which come from the
        <a href="https://github.com/CellDL/CellDLEditorComponent" target="_blank" rel="noopener noreferrer">CellDL Editor component</a>:
      </p>
      <ul class="limitations-list">
        <li v-for="(limitation, index) in LIMITATIONS" :key="index">{{ limitation }}</li>
      </ul>
    </OkMessageDialog>
  </div>
</template>

<script setup lang="ts">
import type { EditorStatus } from '@celldl/editor';

import * as vue from 'vue';

import * as celldl from '../../common/celldl';
import * as celldlEditorApi from '../../common/celldlEditor';
import { loadCellDLRuntime } from '../../common/celldlRuntime';
import * as common from '../../common/common';
import { LONG_DELAY } from '../../common/constants';
import { type FileEditor, useViewRegistry } from '../../common/viewRegistry';
import * as vueCommon from '../../common/vueCommon';
import * as locApi from '../../libopencor/locApi';

import { useOpenCORMessage } from '../OpenCORMessage';
import { toastIssueDetail, useOpenCORToast } from '../OpenCORToast';

import './toolbar-based-view.css';

const EXPORT_KIND_DOWNLOAD = 'download';
const EXPORT_KIND_SIMULATE = 'simulate';

const props = defineProps<{
  file: locApi.File;
  isActiveFile: boolean;
}>();

const emit = defineEmits<{
  openFile: [fileFilePathOrFileContents: string];
}>();

// Current limitations of the CellDL Editor view.

const LIMITATIONS = [
  'Only adding, deleting, moving, and arranging can be undone.',
  'Saving a file clears its undo history.',
  "Undoing all changes doesn't make a file unmodified.",
  "Once the diagram has the keyboard focus, Tab doesn't move it elsewhere."
];

const opencorMessage = useOpenCORMessage();
const addToast = useOpenCORToast();
const issues = vue.ref<locApi.Issue[]>([]);
const exportIssues = vue.ref<locApi.Issue[]>([]);
const exportIssuesKind = vue.ref<string>(EXPORT_KIND_DOWNLOAD);
const exportIssuesTitle = vue.computed<string>(() => {
  return exportIssuesKind.value === EXPORT_KIND_SIMULATE ? 'Standard Simulation' : 'Export OMEX File';
});
const exportIssuesVisible = vue.ref<boolean>(false);
const limitationsVisible = vue.ref<boolean>(false);
const celldlFileName = common.fileName(props.file.canonicalPath());
const fileData = new TextDecoder().decode(props.file.contents());

// Our CellDL runtime (see common/celldlRuntime.ts), which provides CellDL Editor.
// Note: we only render CellDL Editor once our CellDL runtime has been loaded (see onMounted() below), so this doesn't
//       actually load it.

const runtimeLoaded = vue.ref<boolean>(false);
const CellDLEditor = vue.defineAsyncComponent(async () => (await loadCellDLRuntime()).CellDLEditor);
const { theme } = vueCommon.useTheme();

// Drive our CellDL Editor (see common/celldlEditor.ts).
// Note #1: CellDL Editor opens a diagram asynchronously, so it may report an error after we have considered our diagram
//          to be loaded, in which case we consider it unloaded again, i.e. we stop showing CellDL Editor and disable
//          our export buttons.
// Note #2: CellDL Editor only handles keyboard events while it has the keyboard focus and is visible, so it can't be
//          edited while we are hidden (e.g., while another file tab is selected).

const loaded = vue.ref<boolean>(false);
const diagramModified = vue.ref<boolean>(false);

const reportIssue = (message: string): void => {
  loaded.value = false;

  issues.value.push({
    type: locApi.IssueType.ERROR,
    description: message
  });
};

const celldlEditor = celldlEditorApi.useCellDLEditor({
  onError: reportIssue,
  onStatus: (status: EditorStatus): void => {
    onEditorStatus(status);
  }
});

// Let our CellDL Editor know if it fails to get ready (e.g., if CellDL Editor fails to initialise itself, like when it
// instantiates Oxigraph from a data URL, which a host application's Content Security Policy may not allow), since it
// would otherwise never be ready. Errors that occur once it is ready are ignored by our CellDL Editor, and we let all
// errors propagate, so that they still get logged.

vue.onErrorCaptured((error: unknown) => {
  celldlEditor.failed(error);
});

// Return our (possibly edited) diagram.
// Note: if CellDL Editor couldn't open our diagram, then it doesn't (properly) hold it, so we return the contents of
//       our file instead.

const diagram = async (): Promise<string> => {
  return loaded.value && !issues.value.length ? celldlEditor.data() : fileData;
};

// Keep track of whether our diagram is modified, as reported by CellDL Editor, and of the edits that may have been made
// to it, so that we know whether some contents that we provided are still those of our diagram (see fileEditor below).
// Note #1: CellDL Editor considers our diagram modified compared to when it was opened or last marked as unmodified
//          (i.e. once it was last saved, see markSaved() below). It is meant to consider our diagram unmodified once
//          everything has been undone since, but it currently doesn't since undoing something marks our diagram as
//          modified again (see LIMITATIONS).
// Note #2: CellDL Editor doesn't tell us about each edit, so we count as an edit anything that may edit our diagram,
//          i.e. a change of its modified state or of its ability to undo something, and some user input within CellDL
//          Editor (e.g., a pointer being released, a field being changed, or a key being pressed, except for a keyboard
//          shortcut that isn't one of CellDL Editor's, like Ctrl/Cmd+S), rather than any change of its status (e.g.,
//          its selection gets cleared when our diagram is retrieved). We may therefore count an edit that doesn't
//          actually edit anything, but we would rather consider our diagram modified when it isn't than the other way
//          round.
// Note #3: marking our diagram as unmodified changes CellDL Editor's status, which is not an edit (see markSaved()
//          below).

let editCount = 0;
let lastStatus: EditorStatus = {};
let cleaning = false;

const onEditorStatus = (status: EditorStatus): void => {
  if (!cleaning && (status.diagramModified !== lastStatus.diagramModified || status.canUndo !== lastStatus.canUndo)) {
    ++editCount;
  }

  lastStatus = status;
  diagramModified.value = !!status.diagramModified;
};

const EDITING_SHORTCUT_KEYS = ['c', 'd', 'v', 'x', 'y', 'z'];

const onEditorInput = (): void => {
  ++editCount;
};

const onEditorKeyDown = (event: KeyboardEvent): void => {
  if (!(event.ctrlKey || event.metaKey || event.altKey) || EDITING_SHORTCUT_KEYS.includes(event.key.toLowerCase())) {
    ++editCount;
  }
};

// Let people know that we can edit our file, so that it can be saved (see ContentsComponent.vue).
// Note #1: our diagram may get edited while it is being saved (e.g., while our file is being written), in which case it
//          must still be considered modified once saved, hence we keep track of the number of edits that had been made
//          when we asked for some contents, for each contents that we provide (since several of them may be being saved
//          at once, see FileEditor). We do so before asking for them since an edit made while they are being retrieved
//          may or may not be part of them, in which case we would rather consider our diagram modified when it isn't
//          than the other way round.
// Note #2: our file may have unsaved contents (see viewRegistry.markUnsavedContents()), in which case our diagram is
//          modified until it gets saved, even though CellDL Editor doesn't consider it modified. The same holds if our
//          diagram was edited while it was being saved (see Note #1), since what got saved may not be our diagram.
// Note #3: once some contents have been saved, we ask CellDL Editor to mark our diagram as unmodified (unless it has
//          been edited since), which it does asynchronously, so we consider our diagram unmodified in the meantime.

const viewRegistry = useViewRegistry();
const mayDifferFromFile = vue.ref<boolean>(viewRegistry.hasUnsavedContents(props.file));
const cleanPending = vue.ref<boolean>(false);
const contentsEditCounts = new WeakMap<Uint8Array, number>();
const fileEditor: FileEditor = {
  modified: () => (diagramModified.value && !cleanPending.value) || mayDifferFromFile.value,
  contents: async () => {
    const crtEditCount = editCount;
    const res = new TextEncoder().encode(await diagram());

    contentsEditCounts.set(res, crtEditCount);

    return res;
  },
  editedSince: (contents: Uint8Array) => editCount !== contentsEditCounts.get(contents),
  markSaved: (contents: Uint8Array) => {
    const contentsEditCount = contentsEditCounts.get(contents);

    if (contentsEditCount === undefined) {
      return;
    }

    if (contentsEditCount !== editCount) {
      mayDifferFromFile.value = true;

      return;
    }

    mayDifferFromFile.value = false;
    cleanPending.value = true;

    void celldlEditor
      .clean(() => {
        cleaning = editCount === contentsEditCount;

        return cleaning;
      })
      .then((cleaned: boolean) => {
        if (!cleaned) {
          mayDifferFromFile.value = true;
        }
      })
      .catch(() => {
        mayDifferFromFile.value = true;
      })
      .finally(() => {
        cleaning = false;
        cleanPending.value = false;
      });
  }
};

viewRegistry.registerFileEditor(props.file, fileEditor);

// Load our CellDL runtime (see common/celldlRuntime.ts), render CellDL Editor, and open our diagram in it, unless our
// CellDL runtime couldn't be loaded, in which case we report the issue.
// Note #1: we may get unmounted while our CellDL runtime is being loaded, in which case there is nothing more to do.
// Note #2: if CellDL Editor fails to get ready, then our CellDL Editor reports it to us (see failed() in
//          common/celldlEditor.ts), so there is nothing more for us to do.

let unmounted = false;

vue.onMounted(async () => {
  try {
    await loadCellDLRuntime();
  } catch (error: unknown) {
    reportIssue(common.formatError(error));

    return;
  }

  if (unmounted) {
    return;
  }

  runtimeLoaded.value = true;

  try {
    await celldlEditor.open(fileData, celldlFileName);
  } catch {
    return;
  }

  if (!unmounted && !issues.value.length) {
    loaded.value = true;
  }
});

vue.onBeforeUnmount(() => {
  unmounted = true;

  viewRegistry.unregisterFileEditor(props.file, fileEditor);
});

// Export our (possibly edited) diagram to an OMEX file, which we can then either simulate or download.

const onExportOmexFile = async (kind: string): Promise<void> => {
  let messageId: number | undefined;

  try {
    // Get the CellDL data from the editor, which may have been edited by the user.

    const celldlData = await diagram();

    // Initialise our CellML converter, if needed, and then delay briefly so that the user can see that we reached 100%.

    if (!celldl.isConverterInitialised()) {
      messageId = opencorMessage.show('Initialising the CellML converter...');

      await celldl.initialiseConverter(opencorMessage.update);
      await common.sleep(LONG_DELAY);
    }

    // Generate the CellML from the CellDL.

    messageId = opencorMessage.show('Generating CellML...', false);

    const res = await celldl.cellmlFromCelldl(celldlData, celldlFileName);

    if (!res.cellml) {
      exportIssues.value = res.issues.map((issue) => {
        return {
          type: locApi.IssueType.ERROR,
          description: issue
        };
      });
      exportIssuesKind.value = kind;
      exportIssuesVisible.value = true;

      return;
    }

    // Generate the OMEX file from the CellML and the CellDL, and then either simulate it or download it.

    const omexFile = celldl.omexFile(res.cellml, celldlData);

    if (kind === EXPORT_KIND_SIMULATE) {
      emit('openFile', `data:application/zip;base64,${await omexFile.generateAsync({ type: 'base64' })}`);
    } else {
      common.downloadFile(
        `${common.baseFileName(celldlFileName)}.omex`,
        await omexFile.generateAsync({ type: 'blob', compression: 'DEFLATE' }),
        'application/zip'
      );
    }
  } catch (error: unknown) {
    addToast({
      severity: 'error',
      summary: kind === EXPORT_KIND_SIMULATE ? 'Cannot Simulate Diagram' : 'Cannot Export OMEX File',
      detail: toastIssueDetail(props.file.canonicalPath(), common.formatMessage(common.formatError(error)))
    });
  } finally {
    if (messageId !== undefined) {
      opencorMessage.hide(messageId);
    }
  }
};
</script>

<style scoped>
.export-issues-text {
  margin: 0 0 0.75rem;
  color: var(--p-text-color);
  font-size: 0.875rem;
  line-height: 1.375rem;
}

/**
 * Note: there may be many issues, in which case they scroll rather than making our dialog taller than our window. Our
 *       issues view scrolls its issues when it is given a height, but not when it is only given a maximum height, so we
 *       let a container scroll it instead (as for the issues popover of our settings dialog, see
 *       SimulationExperimentInteractiveViewSettingsDialog.vue).
 */

.export-issues {
  max-height: min(20rem, 40vh);
  overflow-y: auto;
}

.limitations-list {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
  list-style: disc;
}

.limitations-list li + li {
  margin-top: 0.25rem;
}
</style>
