<template>
  <Toolbar :id="toolbarId" class="p-1!">
    <template #start v-if="!interactiveModeEnabled">
      <Button class="p-1!" icon="pi pi-play-circle" severity="secondary" text @click="onRun()" />
      <Button class="p-1!" disabled icon="pi pi-stop-circle" severity="secondary" text />
    </template>
    <template #center>
      <div v-if="interactiveModeAvailable" class="flex items-center gap-2">
        <label for="mode-toggle" class="text-sm">Interactive</label>
        <ToggleSwitch inputId="mode-toggle" v-model="interactiveModeEnabled" />
      </div>
    </template>
  </Toolbar>
  <div v-if="!interactiveModeEnabled"  :style="{ width: width + 'px', height: heightMinusToolbar + 'px' }">
    <Splitter class="border-none! h-full m-0" layout="vertical">
      <SplitterPanel :size="simulationOnly ? 100 : 89">
        <Splitter>
          <SplitterPanel class="ml-4 mr-4 mb-4 min-w-fit" :size="25">
            <ScrollPanel class="h-full">
              <SimulationPropertyEditor :file="file" />
              <!--
                  <SolversPropertyEditor />
                  <GraphsPropertyEditor />
                  <ParametersPropertyEditor />
                  -->
              <Fieldset legend="X-axis">
                <Select
                  v-model="standardXParameter"
                  filter
                  filterMode="lenient"
                  :options="standardParameters"
                  size="small"
                  class="w-full"
                  @change="updatePlot()"
                />
              </Fieldset>
              <Fieldset legend="Y-axis">
                <Select
                  v-model="standardYParameter"
                  filter
                  filterMode="lenient"
                  :options="standardParameters"
                  size="small"
                  class="w-full"
                  @change="updatePlot()"
                />
              </Fieldset>
            </ScrollPanel>
          </SplitterPanel>
          <SplitterPanel :size="75">
            <GraphPanelWidget :plots="standardPlots" />
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
      <SplitterPanel v-if="!simulationOnly" :size="11">
        <Editor :id="editorId" class="border-none h-full" :readonly="true" v-model="standardConsoleContents" />
      </SplitterPanel>
    </Splitter>
  </div>
  <div v-else class="flex" :style="{ width: width + 'px', height: heightMinusToolbar + 'px' }">
    <IssuesView v-if="uiJsonIssues.length !== 0" class="grow" :width="width" :height="heightMinusToolbar" :issues="uiJsonIssues" />
    <div v-else class="flex grow">
      <div class="ml-4 mr-4 mb-4">
        <ScrollPanel class="h-full">
          <Fieldset legend="Input parameters">
            <InputWidget
              v-for="(input, index) in (uiJson as any).input"
              v-model="uiInputValues[index]!"
              v-show="uiShowInput[index]"
              :key="`input_${index}`"
              :name="input.name"
              :maximumValue="input.maximumValue"
              :minimumValue="input.minimumValue"
              :possibleValues="input.possibleValues"
              :stepValue="input.stepValue"
              :class="index !== 0 ? 'mt-6' : ''"
              @change="updateUiAndSimulation"
            />
          </Fieldset>
        </ScrollPanel>
      </div>
      <div class="grow">
        <IssuesView v-show="uiInstanceIssues.length !== 0" :leftMargin="false" :width="width" :height="heightMinusToolbar" :issues="uiInstanceIssues" />
        <GraphPanelWidget v-show="uiInstanceIssues.length === 0"
          v-for="(_plot, index) in (uiJson as any).output.plots"
          :key="`plot_${index}`"
          :style="{ height: `calc(100% / ${(uiJson as any).output.plots.length})` }"
          :plots="uiPlots[index] || []"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as mathjs from 'https://cdn.jsdelivr.net/npm/mathjs@14.9.1/+esm';

import * as vueusecore from '@vueuse/core';

import * as vue from 'vue';

import * as common from '../../common/common';
import { SHORT_DELAY } from '../../common/constants';
import * as locCommon from '../../common/locCommon';
import * as vueCommon from '../../common/vueCommon';
import * as locApi from '../../libopencor/locApi';

import type { IGraphPanelPlot } from '../widgets/GraphPanelWidget.vue';

const props = defineProps<{
  file: locApi.File;
  height: number;
  isActive: boolean;
  isActiveFile: boolean;
  simulationOnly?: boolean;
  uiEnabled: boolean;
  uiJson: locApi.IUiJson;
  width: number;
}>();

const toolbarId = vue.ref('simulationExperimentViewToolbar');
const editorId = vue.ref('simulationExperimentViewEditor');
const instance = props.file.instance();
const instanceTask = instance.task(0);
const heightMinusToolbar = vue.ref<number>(0);
const interactiveModeAvailable = vue.ref<boolean>(props.uiJson !== undefined);
const interactiveModeEnabled = vue.ref<boolean>(props.uiJson !== undefined);

// Standard mode.

const standardParameters = vue.ref<string[]>([]);
const standardXParameter = vue.ref(instanceTask.voiName());
const standardYParameter = vue.ref(instanceTask.stateName(0));
const standardPlots = vue.ref<IGraphPanelPlot[]>([]);
const standardConsoleContents = vue.ref<string>(`<b>${props.file.path()}</b>`);

function addParameter(param: string): void {
  standardParameters.value.push(param);
}

addParameter(instanceTask.voiName());

for (let i = 0; i < instanceTask.stateCount(); i++) {
  addParameter(instanceTask.stateName(i));
}

for (let i = 0; i < instanceTask.rateCount(); i++) {
  addParameter(instanceTask.rateName(i));
}

for (let i = 0; i < instanceTask.constantCount(); i++) {
  addParameter(instanceTask.constantName(i));
}

for (let i = 0; i < instanceTask.computedConstantCount(); i++) {
  addParameter(instanceTask.computedConstantName(i));
}

for (let i = 0; i < instanceTask.algebraicCount(); i++) {
  addParameter(instanceTask.algebraicName(i));
}

function onRun(): void {
  // Run the instance, output the simulation time to the console, and update the plot.

  const simulationTime = instance.run();

  standardConsoleContents.value += `<br/>&nbsp;&nbsp;<b>Simulation time:</b> ${common.formatTime(simulationTime)}`;

  void vue.nextTick().then(() => {
    const consoleElement = document.getElementById(editorId.value)?.getElementsByClassName('ql-editor')[0];

    if (consoleElement !== undefined) {
      consoleElement.scrollTop = consoleElement.scrollHeight;
    }
  });

  updatePlot();
}

const xInfo = vue.computed(() => locCommon.simulationDataInfo(instanceTask, standardXParameter.value));
const yInfo = vue.computed(() => locCommon.simulationDataInfo(instanceTask, standardYParameter.value));

function updatePlot() {
  standardPlots.value = [
    {
      x: {
        data: locCommon.simulationData(instanceTask, xInfo.value)
      },
      y: {
        data: locCommon.simulationData(instanceTask, yInfo.value)
      }
    }
  ];
}

// UI mode.

const uiMath = mathjs.create(mathjs.all ?? {}, {});
const uiModel = props.file.document().model(0);
const uiPlots = vue.ref<IGraphPanelPlot[][]>([]);
const uiJsonIssues = vue.ref<locApi.IIssue[]>(interactiveModeAvailable.value ? locApi.uiJsonIssues(props.uiJson) : []);
const uiInstanceIssues = vue.ref<locApi.IIssue[]>([]);
const uiInputValues = vue.ref<number[]>(interactiveModeAvailable.value ? props.uiJson.input.map((input: locApi.IUiJsonInput) => input.defaultValue) : []);
const uiShowInput = vue.ref<string[]>(interactiveModeAvailable.value ? props.uiJson.input.map((input: locApi.IUiJsonInput) => input.visible ?? 'true') : []);
const uiIdToInfo: Record<string, locCommon.ISimulationDataInfo> = {};

if (interactiveModeAvailable.value) {
  props.uiJson.output.data.forEach((data: locApi.IUiJsonOutputData) => {
    uiIdToInfo[data.id] = locCommon.simulationDataInfo(instanceTask, data.name);
  });
}

function evaluateValue(value: string): mathjs.MathType {
  let index = -1;
  const parser = uiMath.parser();

  props.uiJson.input.forEach((input: locApi.IUiJsonInput) => {
    if (input.id !== undefined && input.id !== '') {
      parser.set(input.id, uiInputValues.value[++index]);
    }
  });

  return parser.evaluate(value);
}

function updateUiAndSimulation() {
  // Make sure that there are no issues.

  if (uiJsonIssues.value.length > 0) {
    return;
  }

  // Show/hide the input widgets.

  props.uiJson.input.forEach((input: locApi.IUiJsonInput, index: number) => {
    uiShowInput.value[index] = evaluateValue(input.visible ?? 'true');
  });

  // Update the SED-ML document.

  uiModel.removeAllChanges();

  props.uiJson.parameters.forEach((parameter: locApi.IUiJsonParameter) => {
    const componentVariableNames = parameter.name.split('/');

    // @ts-expect-error (we trust that we have a valid component and variable name)
    uiModel.addChange(componentVariableNames[0], componentVariableNames[1], String(evaluateValue(parameter.value)));
  });

  // Run the instance and update the plots.

  instance.run();

  if (instance.hasIssues()) {
    uiInstanceIssues.value = instance.issues();

    return;
  } else {
    uiInstanceIssues.value = [];
  }

  const parser = uiMath.parser();

  props.uiJson.output.data.forEach((data: locApi.IUiJsonOutputData) => {
    // @ts-expect-error (we trust that we have some valid information)
    parser.set(data.id, locCommon.simulationData(instanceTask, uiIdToInfo[data.id]));
  });

  uiPlots.value = props.uiJson.output.plots.map((plot: locApi.IUiJsonOutputPlot) => {
    return [
      {
        x: { data: parser.evaluate(plot.xValue) },
        y: { data: parser.evaluate(plot.yValue) }
      }
    ];
  });
}

// "Initialise" our standard and/or UI mode.

vue.onMounted(() => {
  updatePlot();

  if (interactiveModeAvailable.value) {
    updateUiAndSimulation();
  }
});

// Various things that need to be done once we are is mounted.

const crtInstance = vue.getCurrentInstance();

vue.onMounted(() => {
  // Customise our IDs.

  toolbarId.value = `simulationExperimentViewToolbar${String(crtInstance?.uid)}`;
  editorId.value = `simulationExperimentViewEditor${String(crtInstance?.uid)}`;

  // Track the height of our toolbar.

  let toolbarResizeObserver: ResizeObserver | undefined;

  setTimeout(() => {
    toolbarResizeObserver = vueCommon.trackElementHeight(toolbarId.value);
  }, SHORT_DELAY);

  // Monitor "our" contents size.

  function resizeOurselves() {
    heightMinusToolbar.value = props.height - vueCommon.trackedCssVariableValue(toolbarId.value);
  }

  vue.watch(
    () => props.height,
    () => {
      resizeOurselves();
    }
  );

  let oldToolbarHeight = vueCommon.trackedCssVariableValue(toolbarId.value);

  const mutationObserver = new MutationObserver(() => {
    const newToolbarHeight = vueCommon.trackedCssVariableValue(toolbarId.value);

    if (newToolbarHeight !== oldToolbarHeight) {
      oldToolbarHeight = newToolbarHeight;

      resizeOurselves();
    }
  });

  mutationObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

  vue.onUnmounted(() => {
    mutationObserver.disconnect();

    toolbarResizeObserver?.disconnect();
  });
});

// Keyboard shortcuts.

if (common.isDesktop()) {
  vueusecore.onKeyStroke((event: KeyboardEvent) => {
    if (!props.isActive || !props.uiEnabled) {
      return;
    }

    if (props.isActiveFile && !event.ctrlKey && !event.shiftKey && !event.metaKey && event.code === 'F9') {
      if (!interactiveModeEnabled.value) {
        event.preventDefault();

        onRun();
      }
    }
  });
}
</script>

<style scoped>
:deep(.p-button-icon) {
  font-size: 1.5rem;
}

:deep(.p-button-icon-only) {
  width: 2rem;
}

:deep(.p-button-label) {
  height: 0;
}

:deep(.p-editor-content) {
  border: none !important;
}

:deep(.p-editor-toolbar) {
  display: none;
}

.p-toolbar {
  border: none;
  border-radius: 0;
  border-bottom: 1px solid var(--p-content-border-color);
}

:deep(.ql-editor) {
  padding: 0.25rem 0.5rem;
}

:deep(.ql-editor > *) {
  cursor: default;
}
</style>
