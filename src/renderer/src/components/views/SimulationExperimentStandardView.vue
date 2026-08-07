<template>
  <div ref="rootRef" class="simulation-experiment-view h-full flex flex-col">
    <IssuesView v-if="instanceIssues.length" class="m-4 mb-0" style="height: calc(100% - 2rem);" :issues="instanceIssues" />
    <template v-else>
      <Toolbar class="p-1! shrink-0">
        <template #start>
          <Button class="p-1! toolbar-button"
            :icon="simulationStatus !== locSedApi.ESedInstanceStatus.RUNNING ? 'pi pi-play-circle' : 'pi pi-pause-circle'"
            text severity="secondary"
            :title="(simulationStatus === locSedApi.ESedInstanceStatus.IDLE ? 'Run' : simulationStatus === locSedApi.ESedInstanceStatus.RUNNING ? 'Pause' : 'Resume') + ' simulation (F9)'"
            @click="onRunPause"
          />
          <Button class="p-1! toolbar-button"
            icon="pi pi-stop-circle"
            text severity="secondary"
            title="Stop simulation"
            :disabled="simulationStatus === locSedApi.ESedInstanceStatus.IDLE"
            @click="onStop"
          />
        </template>
        <template #end>
          <div class="flex gap-1 invisible">
            <Button class="p-1! toolbar-button"
              icon="pi pi-download"
            />
            <Button class="p-1! toolbar-button"
              icon="pi pi-cog"
            />
          </div>
        </template>
      </Toolbar>
      <div class="grow flex flex-col min-h-0">
        <Splitter class="border-none! flex-1 m-0 min-h-0" layout="vertical">
          <SplitterPanel :size="simulationOnly ? 100 : 89">
            <Splitter>
              <SplitterPanel class="ml-4 mr-4 mb-4 min-w-fit" :size="25">
                <ScrollPanel class="h-full">
                  <SimulationPropertyEditor v-if="instanceTask" :uniformTimeCourse="uniformTimeCourse" :instanceTask="instanceTask" :disabled="simulationSettingsDisabled" />
                  <!-- <SolversPropertyEditor />
                  <GraphsPropertyEditor />
                  <ParametersPropertyEditor /> -->
                  <Fieldset legend="X Axis">
                    <Select
                      v-model="xParameter"
                      editable
                      filter
                      filterMode="lenient"
                      :options="parameters"
                      size="small"
                      class="w-full"
                      :appendTo="appendTarget"
                      @change="updatePlot()"
                    />
                  </Fieldset>
                  <Fieldset legend="Y Axis">
                    <Select
                      v-model="yParameter"
                      editable
                      filter
                      filterMode="lenient"
                      :options="parameters"
                      size="small"
                      class="w-full"
                      :appendTo="appendTarget"
                      @change="updatePlot()"
                    />
                  </Fieldset>
                </ScrollPanel>
              </SplitterPanel>
              <SplitterPanel :size="75">
                <GraphPanelWidget
                  :key="'standard-graph-panel'"
                  :data="data"
                  :showLegend="false"
                />
              </SplitterPanel>
            </Splitter>
          </SplitterPanel>
          <SplitterPanel v-if="!simulationOnly" :size="11">
            <div ref="editorRef" class="h-full console overflow-y-auto px-2 py-1 leading-[1.42] text-[13px]" aria-readonly="true" v-html="consoleContents"></div>
          </SplitterPanel>
        </Splitter>
        <ProgressBar class="h-0.75!" :showValue="false" :value="progress" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core';
import * as vue from 'vue';

import * as colors from '../../common/colors';
import * as common from '../../common/common';
import { MEDIUM_DELAY } from '../../common/constants';
import * as locCommon from '../../common/locCommon';
import * as vueCommon from '../../common/vueCommon';
import * as locApi from '../../libopencor/locApi';
import * as locSedApi from '../../libopencor/locSedApi';

import type { IGraphPanelData } from '../widgets/GraphPanelWidget.vue';

import './simulation-experiment-view.css';

const props = defineProps<{
  file: locApi.File;
  isActiveApp: boolean;
  isActiveFile: boolean;
  simulationOnly?: boolean;
  uiEnabled: boolean;
}>();

const emit = defineEmits<{
  simulationData: [];
}>();

const rootRef = vue.ref<HTMLElement | null>(null);
const editorRef = vue.ref<HTMLElement | null>(null);
const instanceIssues = vue.ref<locApi.IIssue[]>([]);
let hasInstanceIssues = false;

const document = props.file.document();
const uniformTimeCourse = document.simulation(0) as locApi.SedUniformTimeCourse;
const instance = document.instantiate();

instanceIssues.value = instance.issues();
hasInstanceIssues = instanceIssues.value.length > 0;

const instanceTask = hasInstanceIssues ? null : instance.task(0);
const parameters = vue.ref<string[]>([]);
const xParameter = vue.ref(instanceTask ? instanceTask.voiName() : '');
const yParameter = vue.ref(instanceTask ? instanceTask.stateName(0) : '');

const data = vue.ref<IGraphPanelData>({
  xAxisTitle: instanceTask ? xParameter.value : undefined,
  yAxisTitle: instanceTask ? yParameter.value : undefined,
  traces: []
});

const consoleContents = vue.ref<string>(`<b>${props.file.path()}</b>`);
const progress = vue.ref<number>(0);
const simulationStatus = vue.ref<locSedApi.ESedInstanceStatus>(instance.status());

const simulationSettingsDisabled = vue.computed<boolean>(() => {
  return simulationStatus.value !== locSedApi.ESedInstanceStatus.IDLE;
});

const runAborted = vue.ref(false);
let progressResetCancel: (() => void) | undefined;
let abortProgressTimer: ReturnType<typeof setTimeout> | undefined;
const appendTarget = vueCommon.useAppendTarget(rootRef as unknown as vue.Ref<HTMLElement | null>);

if (instanceTask) {
  vueCommon.populateParameters(parameters, instanceTask);
}

const xInfo = vue.computed<locCommon.ISimulationDataInfo>(() => {
  return instanceTask ? locCommon.simulationDataInfo(instanceTask, xParameter.value) : locCommon.NoSimulationDataInfo;
});

const yInfo = vue.computed<locCommon.ISimulationDataInfo>(() => {
  return instanceTask ? locCommon.simulationDataInfo(instanceTask, yParameter.value) : locCommon.NoSimulationDataInfo;
});

const updatePlot = (dataSize: number = 0): void => {
  if (!instanceTask) {
    data.value = {
      xAxisTitle: undefined,
      yAxisTitle: undefined,
      traces: []
    };

    return;
  }

  // Specify the range of the X and Y axes if they are the variable of integration. Otherwise, leave the range undefined
  // so that Plotly can automatically determine the range based on the data.

  const xAxisRange: [number, number] | undefined =
    xInfo.value.type === locCommon.ESimulationDataInfoType.VOI
      ? [uniformTimeCourse.outputStartTime(), uniformTimeCourse.outputEndTime()]
      : undefined;

  const yAxisRange: [number, number] | undefined =
    yInfo.value.type === locCommon.ESimulationDataInfoType.VOI
      ? [uniformTimeCourse.outputStartTime(), uniformTimeCourse.outputEndTime()]
      : undefined;

  // Retrieve the data for the selected X and Y parameters and update the plot.

  const xData = locCommon.simulationDataValue(instanceTask, xInfo.value).data;
  const yData = locCommon.simulationDataValue(instanceTask, yInfo.value).data;

  data.value = {
    xAxisTitle: xParameter.value,
    yAxisTitle: yParameter.value,
    xAxisRange,
    yAxisRange,
    traces: [
      {
        name: vueCommon.traceName(undefined, xParameter.value, yParameter.value),
        xValue: xParameter.value,
        x: dataSize > 0 ? xData.slice(0, dataSize) : xData.slice(),
        yValue: yParameter.value,
        y: dataSize > 0 ? yData.slice(0, dataSize) : yData.slice(),
        color: colors.DEFAULT_COLOR
      }
    ]
  };
};

// Event handlers.

const onRunPause = async (): Promise<void> => {
  switch (instance.status()) {
    case locSedApi.ESedInstanceStatus.RUNNING:
      // Pause the simulation.

      instance.pauseRun();

      simulationStatus.value = locSedApi.ESedInstanceStatus.PAUSED;

      break;
    case locSedApi.ESedInstanceStatus.PAUSED:
      // Resume the simulation.

      instance.resumeRun();

      simulationStatus.value = locSedApi.ESedInstanceStatus.RUNNING;

      break;
    default: {
      // locSedApi.ESedInstanceStatus.IDLE:
      // Reset our abort flag.

      runAborted.value = false;

      // Start the simulation.

      if (!instance.startRun()) {
        simulationStatus.value = instance.status();

        return;
      }

      simulationStatus.value = instance.status();

      // Wait for the simulation to finish, handling pause/resume cycles asynchronously so that the UI remains responsive.

      const numberOfSteps = uniformTimeCourse.numberOfSteps();
      let lastPlottingAreaUpdateTime = Date.now();

      const { promise: runPromise, cancel: runCancel } = vueCommon.waitWhileRunning(
        instance,
        (newProgress: number) => {
          // Update the progress bar.

          progress.value = newProgress;

          // Update the plotting area only if the progress has changed and a certain amount of time has passed since the
          // last update (to avoid excessive updates).

          if (newProgress === 0) {
            return;
          }

          const now = Date.now();

          if (now - lastPlottingAreaUpdateTime >= MEDIUM_DELAY) {
            updatePlot(Math.round(0.01 * newProgress * numberOfSteps) + 1);

            lastPlottingAreaUpdateTime = now;
          }
        },
        (status) => {
          simulationStatus.value = status;
        },
        runAborted
      );

      // We store the cancel function in a variable so that we can call it on component unmount to avoid writing to
      // stale references after the component is torn down.

      progressResetCancel = runCancel;

      await runPromise;

      progressResetCancel = undefined;

      // Update the console with any issues that occurred during the simulation, or display the simulation time if it
      // completed successfully.

      if (instance.hasIssues()) {
        instance.issues().forEach((issue: locApi.IIssue) => {
          const color =
            issue.type === locApi.EIssueType.ERROR
              ? colors.REVERTED_PALETTE.Red
              : issue.type === locApi.EIssueType.WARNING
                ? colors.REVERTED_PALETTE.Orange
                : colors.REVERTED_PALETTE.Blue;
          const issueType =
            issue.type === locApi.EIssueType.ERROR
              ? 'Error'
              : issue.type === locApi.EIssueType.WARNING
                ? 'Warning'
                : 'Info';
          const issueDescription = issue.description.replace('Task | ', '');

          consoleContents.value += `<br />&nbsp;&nbsp;<span style="color: ${color};"><strong>${issueType}:</strong> ${issueDescription}</span>`;
        });
      } else {
        const simulationTime = instance.waitForRun();

        consoleContents.value += `<br />&nbsp;&nbsp;<strong>Simulation time:</strong> <span style="color: ${colors.REVERTED_PALETTE.Blue};">${common.formatTime(simulationTime)}</span>`;

        if (runAborted.value) {
          // Reset the progress bar after a short delay (mimicking the normal end of a simulation).

          abortProgressTimer = setTimeout(() => {
            abortProgressTimer = undefined;

            progress.value = 0;
          }, MEDIUM_DELAY);
        }
      }

      if (!runAborted.value) {
        updatePlot();
      }

      vue.nextTick(() => {
        const consoleElement = editorRef.value;

        if (consoleElement) {
          consoleElement.scrollTop = consoleElement.scrollHeight;
        }
      });
    }
  }
};

const onStop = (): void => {
  runAborted.value = true;

  instance.stopRun();

  // Note: the simulation status will be updated by the next poll cycle of waitWhileRunning(), so we don't set it here
  //       to avoid a race window where the user could re-trigger a run before the C++ thread has fully stopped.
};

// Initialise the plot on mount.

vue.onMounted(() => {
  updatePlot();
});

// Cancel any pending progress reset timers to avoid writing to stale refs after the component is torn down.

vue.onUnmounted(() => {
  progressResetCancel?.();

  clearTimeout(abortProgressTimer);
});

// Track whether the view is the currently active view for keyboard shortcut handling.

let isActiveView = true;

vue.onActivated(() => {
  isActiveView = true;
});

vue.onDeactivated(() => {
  isActiveView = false;
});

// Keyboard shortcuts.

if (common.isDesktop()) {
  vueusecore.onKeyStroke((event: KeyboardEvent) => {
    if (!props.isActiveApp || !isActiveView || !props.uiEnabled) {
      return;
    }

    if (
      props.isActiveFile &&
      !hasInstanceIssues &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.metaKey &&
      event.code === 'F9'
    ) {
      event.preventDefault();

      onRunPause();
    }
  });
}
</script>
