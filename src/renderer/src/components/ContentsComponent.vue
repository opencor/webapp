<template>
  <div v-if="simulationOnly" class="h-full">
    <div v-for="fileTab in fileTabs" :key="`tabPanel_${fileTab.file.path()}`" class="h-full" :value="fileTab.file.path()">
      <IssuesView v-if="fileTab.file.issues().length" class="m-4" style="height: calc(100% - 2rem);"
        :issues="fileTab.file.issues()"
      />
      <SimulationExperimentView v-else ref="simulationExperimentViewRef" class="h-full"
        :isActive="isActive"
        :uiEnabled="uiEnabled"
        :file="fileTab.file"
        :isActiveFile="fileTab.file.path() === activeFile"
        :simulationOnly="simulationOnly"
        :uiJson="fileTab.uiJson!"
        @simulationData="$emit('simulationData')"
      />
    </div>
  </div>
  <div v-else class="h-full flex flex-col">
    <BackgroundComponent v-show="!fileTabs.length" class="h-full" />
    <Tabs v-show="fileTabs.length" id="fileTabs" class="h-full flex flex-col"
      v-model:value="activeFile"
      :scrollable="true"
      :selectOnFocus="true"
    >
      <TabList class="border-b border-b-primary shrink-0">
        <Tab
          v-for="fileTab in fileTabs"
          :id="`tab_${fileTab.file.path()}`"
          :key="`tab_${fileTab.file.path()}`"
          :value="fileTab.file.path()"
        >
          <div class="flex gap-2 items-center">
            <div>
              {{
                common.fileName(fileTab.file.path())
              }}
            </div>
            <div class="pi pi-times remove-button" @mousedown.prevent @click.stop="closeFile(fileTab.file.path())" />
          </div>
        </Tab>
      </TabList>
      <TabPanels class="p-0! grow min-h-0">
        <TabPanel v-for="fileTab in fileTabs" class="h-full"
          :key="`tabPanel_${fileTab.file.path()}`"
          :value="fileTab.file.path()"
        >
          <IssuesView v-if="fileTab.file.issues().length" class="m-4" style="height: calc(100% - 2rem);"
            :issues="fileTab.file.issues()"
          />
          <SimulationExperimentView v-else
            :isActive="isActive"
            :uiEnabled="uiEnabled"
            :file="fileTab.file"
            :isActiveFile="fileTab.file.path() === activeFile"
            :uiJson="fileTab.uiJson!"
            @error="$emit('error', $event)"
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core';

import * as vue from 'vue';

import * as common from '../common/common';
import { electronApi } from '../common/electronApi';
import * as locApi from '../libopencor/locApi';

import SimulationExperimentView from './views/SimulationExperimentView.vue';
import type { IOpenCORExternalDataEvent, IOpenCORSimulationDataEvent } from '../../index';

interface IFileTab {
  file: locApi.File;
  uiJson?: locApi.IUiJson;
}

const props = defineProps<{
  isActive: boolean;
  simulationOnly?: boolean;
  uiEnabled: boolean;
}>();

defineEmits<{
  (event: 'error', message: string): void;
  (event: 'simulationData'): void;
}>();

const simulationExperimentViewRef = vue.ref<InstanceType<typeof SimulationExperimentView>[]>([]);
const fileTabs = vue.ref<IFileTab[]>([]);
const activeFile = vue.ref<string>('');

const filePaths = vue.computed<string[]>(() => {
  const res: string[] = [];

  for (const fileTab of fileTabs.value) {
    res.push(fileTab.file.path());
  }

  return res;
});

// Some methods to handle files and file tabs.

const hasFile = (filePath: string): boolean => {
  if (props.simulationOnly) {
    return false;
  }

  return fileTabs.value.find((fileTab) => fileTab.file.path() === filePath) !== undefined;
};

const hasFiles = (): boolean => {
  if (props.simulationOnly) {
    return false;
  }

  return fileTabs.value.length > 0;
};

const waitForTabsUpdate = async (): Promise<void> => {
  // Wait a bit to ensure that the file tabs are properly updated.
  // Note: although a bit of a hack, this is needed when opening multiple files. Indeed, without this, the file tab may
  //       not be fully initialised when opening the next file. This means that when we select the file tab, it may try
  //       to finish initialising itself and, when it comes to our simulation experiment view, this means resizing the
  //       plots.

  await vue.nextTick();

  for (let i = 0; i < 3; ++i) {
    await common.waitForNextAnimationFrame();
  }
};

const selectFile = async (filePath: string, wait: boolean = false): Promise<void> => {
  if (props.simulationOnly) {
    return;
  }

  activeFile.value = filePath;

  if (wait) {
    await waitForTabsUpdate();
  }
};

const selectNextFile = async (): Promise<void> => {
  const fileTabIndex = fileTabs.value.findIndex((fileTab) => fileTab.file.path() === activeFile.value);
  const fileTabName = fileTabs.value[(fileTabIndex + 1) % fileTabs.value.length]?.file.path() || '';

  if (fileTabName !== '') {
    await selectFile(fileTabName);
  }
};

const selectPreviousFile = async (): Promise<void> => {
  const fileTabIndex = fileTabs.value.findIndex((fileTab) => fileTab.file.path() === activeFile.value);
  const fileTabName =
    fileTabs.value[(fileTabIndex - 1 + fileTabs.value.length) % fileTabs.value.length]?.file.path() || '';

  if (fileTabName !== '') {
    await selectFile(fileTabName);
  }
};

const openFile = async (file: locApi.File, wait: boolean = false): Promise<void> => {
  const filePath = file.path();
  const prevActiveFile = activeFile.value;

  await selectFile(filePath);

  fileTabs.value.splice(fileTabs.value.findIndex((fileTab) => fileTab.file.path() === prevActiveFile) + 1, 0, {
    file: file,
    uiJson: file.uiJson()
  });

  electronApi?.fileOpened(filePath);

  if (wait) {
    await waitForTabsUpdate();
  }
};

const closeFile = async (filePath: string): Promise<void> => {
  locApi.fileManager.unmanage(filePath);

  const fileTabIndex = fileTabs.value.findIndex((fileTab) => fileTab.file.path() === filePath);

  fileTabs.value.splice(fileTabIndex, 1);

  if (activeFile.value === filePath && fileTabs.value.length) {
    const nextFileTab = fileTabs.value[Math.min(fileTabIndex, fileTabs.value.length - 1)];

    if (nextFileTab) {
      await selectFile(nextFileTab.file.path());
    }
  }

  electronApi?.fileClosed(filePath);
};

const closeCurrentFile = async (): Promise<void> => {
  if (props.simulationOnly) {
    return;
  }

  await closeFile(activeFile.value);
};

const closeAllFiles = async (): Promise<void> => {
  if (props.simulationOnly) {
    return;
  }

  while (fileTabs.value.length) {
    await closeCurrentFile();
  }
};

// Add some external data to the current simulation experiment view.

const addExternalData = async (
  csv: string,
  voiExpression: string | undefined,
  modelParameters: string[]
): Promise<IOpenCORExternalDataEvent> => {
  const simulationExperimentViews = simulationExperimentViewRef.value;

  if (!simulationExperimentViews.length) {
    return Promise.resolve({
      type: 'issue',
      csv,
      issues: ['No simulation experiment view available.']
    });
  }

  return simulationExperimentViews[0].addExternalData(csv, voiExpression, modelParameters).catch((error: unknown) => {
    return {
      type: 'issue',
      csv,
      issues: [common.formatError(error)]
    };
  });
};

// Retrieve some simulation data from the current simulation experiment view.

const simulationData = (modelParameters: string[]): Promise<IOpenCORSimulationDataEvent> => {
  if (!props.simulationOnly) {
    return Promise.resolve({
      type: 'issue',
      simulationData: common.emptySimulationData(modelParameters),
      issues: ['Simulation data can only be retrieved in simulation-only mode.']
    });
  }

  const simulationExperimentViews = simulationExperimentViewRef.value;

  if (!simulationExperimentViews.length) {
    return Promise.resolve({
      type: 'issue',
      simulationData: common.emptySimulationData(modelParameters),
      issues: ['No simulation experiment view available.']
    });
  }

  return simulationExperimentViews[0].simulationData(modelParameters).catch((error: unknown) => {
    return {
      type: 'issue',
      simulationData: common.emptySimulationData(modelParameters),
      issues: [common.formatError(error)]
    };
  });
};

// Some exposed methods.

defineExpose({
  // General methods.

  openFile,

  // Full OpenCOR methods.

  closeAllFiles,
  closeCurrentFile,
  hasFile,
  hasFiles,
  selectFile,

  // Simulation-only methods.

  addExternalData,
  simulationData
});

// Some watchers to let people know about changes to the opened files and the selected file.

vue.watch(filePaths, (newFilePaths: string[]) => {
  electronApi?.filesOpened(newFilePaths);
});

vue.watch(activeFile, (newActiveFile: string) => {
  // Note: activeFile can get updated by clicking on a tab or by calling selectFile(), hence we need to watch it to let
  //       people know that a file has been selected.

  electronApi?.fileSelected(newActiveFile);
});

// Keyboard shortcuts.

if (common.isDesktop()) {
  vueusecore.onKeyStroke((event: KeyboardEvent) => {
    if (!props.isActive || !props.uiEnabled || !fileTabs.value.length) {
      return;
    }

    if (event.ctrlKey && !event.shiftKey && event.code === 'Tab') {
      event.preventDefault();

      selectNextFile();
    } else if (event.ctrlKey && event.shiftKey && event.code === 'Tab') {
      event.preventDefault();

      selectPreviousFile();
    }
  });
}
</script>

<style scoped>
.p-tab {
  padding: 0.125rem 0.5rem;
  border-right: 1px solid var(--p-content-border-color);
}

.p-tab:first-of-type {
  border-left: 1px solid var(--p-content-border-color);
}

.p-tab:hover {
  background-color: var(--p-content-hover-background) !important;
}

.p-tab .remove-button {
  visibility: hidden;
}

.p-tab:hover .remove-button,
.p-tab-active .remove-button {
  visibility: visible;
}

.p-tab-active,
.p-tab-active:hover {
  background-color: var(--p-primary-color) !important;
  color: var(--p-primary-contrast-color);
}

:deep(.p-tablist-active-bar) {
  display: none;
}

.remove-button {
  padding: 0.15rem;
  font-size: 0.75rem;
}

.remove-button:hover {
  border-radius: var(--p-border-radius-sm);
  background-color: var(--p-red-500);
  color: var(--p-red-50);
}

@media (prefers-color-scheme: dark) {
  .remove-button:hover {
    background-color: var(--p-red-400);
  }
}
</style>
