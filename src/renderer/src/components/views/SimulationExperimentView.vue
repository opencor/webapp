<template>
  <Toolbar v-if="toolbarNeeded" :id="toolbarId" class="p-1!">
    <template #start>
      <div :class="{ 'invisible': interactiveModeEnabled && interactiveLiveUpdatesEnabled }">
        <Button class="p-1!" icon="pi pi-play-circle" severity="secondary" text @click="onRun()" />
      </div>
    </template>
    <template #center>
      <div v-show="interactiveModeAvailable">
        <ToggleButton size="small" v-model="interactiveModeEnabled" onLabel="Interactive mode" offLabel="Standard mode" />
      </div>
    </template>
    <template #end>
      <div :class="{ 'invisible': !interactiveModeAvailable || !interactiveModeEnabled }" class="flex">
        <Button class="p-1!" icon="pi pi-cog" severity="secondary" text @click="settingsMenu.toggle($event)" />
        <Popover ref="settingsMenu">
          <div class="flex items-center gap-2 px-1 py-1">
            <Checkbox :inputId="liveUpdatesCheckboxId" v-model="interactiveLiveUpdatesEnabled" binary size="small" @change="onLiveUpdatesChange()" />
            <label :for="liveUpdatesCheckboxId" class="text-sm select-none">Live updates</label>
          </div>
        </Popover>
      </div>
    </template>
  </Toolbar>
  <div v-show="!interactiveModeEnabled"  :style="{ width: width + 'px', height: actualHeight + 'px' }">
    <Splitter class="border-none! h-full m-0" layout="vertical">
      <SplitterPanel :size="simulationOnly ? 100 : 89">
        <Splitter>
          <SplitterPanel class="ml-4 mr-4 mb-4 min-w-fit" :size="25">
            <ScrollPanel class="h-full">
              <SimulationPropertyEditor :uniformTimeCourse="standardUniformTimeCourse" :instanceTask="standardInstanceTask" />
              <!--
                  <SolversPropertyEditor />
                  <GraphsPropertyEditor />
                  <ParametersPropertyEditor />
                  -->
              <Fieldset legend="X Axis">
                <Select
                  v-model="standardXParameter"
                  editable
                  filter
                  filterMode="lenient"
                  :options="standardParameters"
                  size="small"
                  class="w-full"
                  @change="updatePlot()"
                />
              </Fieldset>
              <Fieldset legend="Y Axis">
                <Select
                  v-model="standardYParameter"
                  editable
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
            <GraphPanelWidget
              :key="interactiveModeEnabled ? 'hidden-graph-panel' : 'visible-graph-panel'"
              :data="standardData"
              :showLegend="false"
            />
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
      <SplitterPanel v-if="!simulationOnly" :size="11">
        <Editor :id="editorId" class="border-none h-full" :readonly="true" v-model="standardConsoleContents" />
      </SplitterPanel>
    </Splitter>
  </div>
  <div v-if="interactiveModeAvailable">
    <div v-show="interactiveModeEnabled" class="flex" :style="{ width: width + 'px', height: actualHeight + 'px' }">
      <IssuesView v-if="interactiveUiJsonIssues.length !== 0" class="grow" :width="width" :height="actualHeight" :issues="interactiveUiJsonIssues" />
      <div v-else class="flex grow min-h-0">
        <div class="ml-4 mr-4 mb-4">
          <ScrollPanel class="h-full">
            <Fieldset legend="Input parameters">
              <InputWidget
                v-for="(input, index) in uiJson.input"
                v-model="interactiveInputValues[index]!"
                v-show="interactiveShowInput[index]"
                :key="`input_${index}`"
                :name="input.name"
                :maximumValue="isScalarInput(input) ? input.maximumValue : undefined"
                :minimumValue="isScalarInput(input) ? input.minimumValue : undefined"
                :possibleValues="isDiscreteInput(input) ? input.possibleValues : undefined"
                :stepValue="isScalarInput(input) ? input.stepValue : undefined"
                :class="index !== 0 ? 'mt-6' : ''"
                @change="updateInteractiveSimulation()"
              />
            </Fieldset>
            <Fieldset legend="Runs">
              <div class="flex flex-col gap-4">
                <div class="flex gap-2">
                  <Button class="w-full"
                    icon="pi pi-plus"
                    label="Add run"
                    size="small"
                    @click="onAddRun()"
                  />
                  <Button class="w-12!"
                    icon="pi pi-refresh"
                    size="small"
                    severity="danger"
                    title="Remove all runs"
                    @click="onRemoveAllRuns()"
                    :disabled="interactiveRuns.length === 0"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <div v-if="interactiveRuns.length > 0" v-for="(run, index) in interactiveRuns"
                    :key="`run_${index}`"
                    class="run border border-dashed rounded px-2 py-1"
                  >
                    <div class="flex gap-2">
                      <div class="w-full text-sm cursor-help"
                        v-tippy:bottom="{
                          allowHTML: true,
                          content: runTooltip(run),
                          placement: 'bottom'
                        }"
                      >
                        Run #{{ index + 1 }}
                      </div>
                      <Button class="p-0! w-5! h-5!"
                        :icon="run.visible ? 'pi pi-eye' : 'pi pi-eye-slash'"
                        :severity="run.visible ? 'info' : 'secondary'"
                        text size="small"
                        :title="(run.visible ? 'Hide' : 'Show') + ' run'"
                        @click="onToggleRun(index)"
                      />
                      <Button class="p-0! w-5! h-5!"
                        icon="pi pi-trash"
                        severity="danger"
                        text size="small"
                        title="Remove run"
                        @click="onRemoveRun(index)"
                      />
                    </div>
                  </div>
                  <div v-else class="hint text-center text-sm">
                    No runs yet.<br/>
                    Click "Add run"<br/>
                    to create one.
                  </div>
                </div>
              </div>
            </Fieldset>
          </ScrollPanel>
        </div>
        <div class="flex flex-col grow gap-2 h-full min-h-0">
          <IssuesView v-show="interactiveInstanceIssues.length !== 0" :leftMargin="false" :width="width" :height="actualHeight" :issues="interactiveInstanceIssues" />
          <GraphPanelWidget v-show="interactiveInstanceIssues.length === 0"
            v-for="(_plot, index) in uiJson.output.plots"
            :key="`plot_${index}`"
            class="w-full min-h-0"
            :margins="interactiveCompMargins"
            :data="interactiveCompData[index] || { name: '', xValues: [], yValues: [] }"
            @marginsUpdated="(newMargins: IGraphPanelMargins) => onMarginsUpdated(`plot_${index}`, newMargins)"
            @resetMargins="() => onResetMargins()"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as mathjs from 'https://cdn.jsdelivr.net/npm/mathjs@15.1.0/+esm';

import * as vueusecore from '@vueuse/core';

import * as vue from 'vue';

import * as common from '../../common/common.ts';
import { SHORT_DELAY } from '../../common/constants.ts';
import * as locCommon from '../../common/locCommon.ts';
import * as vueCommon from '../../common/vueCommon.ts';
import * as locApi from '../../libopencor/locApi.ts';
import * as locSedApi from '../../libopencor/locSedApi.ts';

import type {
  IGraphPanelData,
  IGraphPanelPlotAdditionalTrace,
  IGraphPanelMargins
} from '../widgets/GraphPanelWidget.vue';

interface ISimulationRun {
  inputParameters: Record<string, number>;
  visible: boolean;
  data: IGraphPanelData[];
}

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

const toolbarNeeded = vue.computed(() => {
  return (props.simulationOnly && props.uiJson === undefined) || !props.simulationOnly;
});

const toolbarId = vue.ref('simulationExperimentViewToolbar');
const editorId = vue.ref('simulationExperimentViewEditor');
const liveUpdatesCheckboxId = vue.ref('simulationExperimentViewLiveUpdatesCheckbox');
const actualHeight = vue.ref<number>(0);
const interactiveModeAvailable = vue.ref<boolean>(props.uiJson !== undefined);
const interactiveModeEnabled = vue.ref<boolean>(props.uiJson !== undefined);
const interactiveLiveUpdatesEnabled = vue.ref<boolean>(true);
const settingsMenu = vue.ref();

function populateParameters(parameters: vue.Ref<string[]>, instanceTask: locSedApi.SedInstanceTask): void {
  function addParameter(param: string): void {
    parameters.value.push(param);
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

  for (let i = 0; i < instanceTask.algebraicVariableCount(); i++) {
    addParameter(instanceTask.algebraicVariableName(i));
  }

  // Sort the parameters alphabetically.

  parameters.value.sort((parameter1: string, parameter2: string) => parameter1.localeCompare(parameter2));
}

// Type guards.

function isScalarInput(input: locApi.IUiJsonInput): input is locApi.IUiJsonScalarInput {
  return 'maximumValue' in input && 'minimumValue' in input;
}

function isDiscreteInput(input: locApi.IUiJsonInput): input is locApi.IUiJsonDiscreteInput {
  return 'possibleValues' in input;
}

// Event handlers.

function onRun(): void {
  // Run either the standard or interactive simulation.

  if (!interactiveModeEnabled.value) {
    // Run the standard simulation, i.e. run the instance, output the simulation time to the console, and update the
    // plot.

    const simulationTime = standardInstance.run();

    standardConsoleContents.value += `<br/>&nbsp;&nbsp;<b>Simulation time:</b> ${common.formatTime(simulationTime)}`;

    void vue.nextTick(() => {
      const consoleElement = document.getElementById(editorId.value)?.getElementsByClassName('ql-editor')[0];

      if (consoleElement !== undefined) {
        consoleElement.scrollTop = consoleElement.scrollHeight;
      }
    });

    updatePlot();

    return;
  }

  // Run the interactive simulation.

  updateInteractiveSimulation(true);
}

function onLiveUpdatesChange(): void {
  if (interactiveLiveUpdatesEnabled.value) {
    updateInteractiveSimulation();
  }
}

// Standard mode.

const standardDocument = props.file.document();
const standardUniformTimeCourse = standardDocument.simulation(0) as locApi.SedSimulationUniformTimeCourse;
const standardInstance = standardDocument.instantiate();
const standardInstanceTask = standardInstance.task(0);
const standardParameters = vue.ref<string[]>([]);
const standardXParameter = vue.ref(standardInstanceTask.voiName());
const standardYParameter = vue.ref(standardInstanceTask.stateName(0));
const standardData = vue.ref<IGraphPanelData>({
  name: '',
  xValues: [],
  yValues: []
});
const standardConsoleContents = vue.ref<string>(`<b>${props.file.path()}</b>`);

populateParameters(standardParameters, standardInstanceTask);

function traceName(name: string | undefined, xValue: string, yValue: string): string {
  return name !== undefined ? name : `${yValue} <i>vs.</i> ${xValue}`;
}

const xInfo = vue.computed(() => locCommon.simulationDataInfo(standardInstanceTask, standardXParameter.value));
const yInfo = vue.computed(() => locCommon.simulationDataInfo(standardInstanceTask, standardYParameter.value));

function updatePlot() {
  standardData.value = {
    name: traceName(undefined, standardXParameter.value, standardYParameter.value),
    xValues: locCommon.simulationData(standardInstanceTask, xInfo.value),
    yValues: locCommon.simulationData(standardInstanceTask, yInfo.value)
  };
}

// Interactive mode.

const interactiveDocument = props.file.document();
const interactiveInstance = interactiveDocument.instantiate();
const interactiveInstanceTask = interactiveInstance.task(0);
const interactiveMath = mathjs.create(mathjs.all ?? {}, {});
const interactiveModel = interactiveDocument.model(0);
const interactiveData = vue.ref<IGraphPanelData[]>([]);
let interactiveMargins: Record<string, IGraphPanelMargins> = {};
const interactiveCompMargins = vue.ref<IGraphPanelMargins>();
const interactiveUiJsonIssues = vue.ref<locApi.IIssue[]>(
  interactiveModeAvailable.value ? locApi.uiJsonIssues(props.uiJson) : []
);
const interactiveInstanceIssues = vue.ref<locApi.IIssue[]>([]);
const interactiveInputValues = vue.ref<Array<number>>(
  interactiveModeAvailable.value
    ? props.uiJson.input.map((input: locApi.IUiJsonInput) => {
        return input.defaultValue;
      })
    : []
);
const interactiveShowInput = vue.ref<string[]>(
  interactiveModeAvailable.value ? props.uiJson.input.map((input: locApi.IUiJsonInput) => input.visible ?? 'true') : []
);
const interactiveIdToInfo: Record<string, locCommon.ISimulationDataInfo> = {};
const interactiveRuns = vue.ref<ISimulationRun[]>([]);
const interactiveCompData = vue.computed(() => {
  // Combine the live data with the data from the visible runs.

  const res: IGraphPanelData[] = [];

  for (
    let interactiveDataIndex = 0;
    interactiveDataIndex < (interactiveData.value.length || 0);
    ++interactiveDataIndex
  ) {
    const defaultTrace = interactiveData.value[interactiveDataIndex] || { name: '', xValues: [], yValues: [] };
    const additionalTraces: IGraphPanelPlotAdditionalTrace[] = [...(defaultTrace.additionalTraces || [])];

    // Add the traces from the visible runs.

    interactiveRuns.value.forEach((run: ISimulationRun, runIndex: number) => {
      if (run.visible && run.data[interactiveDataIndex]) {
        const runPlotData = run.data[interactiveDataIndex]!;

        // Add the default trace.

        additionalTraces.push({
          name: runPlotData.name,
          xValues: runPlotData.xValues,
          yValues: runPlotData.yValues
        });

        // Add the additional traces.

        if (runPlotData.additionalTraces !== undefined) {
          runPlotData.additionalTraces.forEach((additionalTrace: IGraphPanelPlotAdditionalTrace) => {
            additionalTraces.push({
              name: additionalTrace.name,
              xValues: additionalTrace.xValues,
              yValues: additionalTrace.yValues
            });
          });
        }
      }
    });

    res.push({
      ...defaultTrace,
      additionalTraces: additionalTraces.length > 0 ? additionalTraces : undefined
    });
  }

  return res;
});

if (interactiveModeAvailable.value) {
  props.uiJson.output.data.forEach((data: locApi.IUiJsonOutputData) => {
    interactiveIdToInfo[data.id] = locCommon.simulationDataInfo(interactiveInstanceTask, data.name);
  });
}

interactiveMath.import(
  {
    // Import some element-wise functions to allow sin(array) instead of map(array, sin), for instance.

    // Arithmetic operators.

    pow: (x: mathjs.MathType, y: mathjs.MathType) => x.map((v: number) => v ** y),
    sqrt: (x: mathjs.MathType) => x.map((v: number) => Math.sqrt(v)),
    abs: (x: mathjs.MathType) => x.map((v: number) => Math.abs(v)),
    exp: (x: mathjs.MathType) => x.map((v: number) => Math.exp(v)),
    log: (x: mathjs.MathType) => x.map((v: number) => Math.log(v)),
    log10: (x: mathjs.MathType) => x.map((v: number) => Math.log10(v)),
    ceil: (x: mathjs.MathType) => x.map((v: number) => Math.ceil(v)),
    floor: (x: mathjs.MathType) => x.map((v: number) => Math.floor(v)),
    min: (x: mathjs.MathType, y: mathjs.MathType) => x.map((v: number, index: number) => Math.min(v, y[index])),
    max: (x: mathjs.MathType, y: mathjs.MathType) => x.map((v: number, index: number) => Math.max(v, y[index])),
    mod: (x: mathjs.MathType, y: mathjs.MathType) => x.map((v: number) => v % y),

    // // Trigonometric operators.

    sin: (x: mathjs.MathType) => x.map((v: number) => Math.sin(v)),
    cos: (x: mathjs.MathType) => x.map((v: number) => Math.cos(v)),
    tan: (x: mathjs.MathType) => x.map((v: number) => Math.tan(v)),
    sinh: (x: mathjs.MathType) => x.map((v: number) => Math.sinh(v)),
    cosh: (x: mathjs.MathType) => x.map((v: number) => Math.cosh(v)),
    tanh: (x: mathjs.MathType) => x.map((v: number) => Math.tanh(v)),
    asin: (x: mathjs.MathType) => x.map((v: number) => Math.asin(v)),
    acos: (x: mathjs.MathType) => x.map((v: number) => Math.acos(v)),
    atan: (x: mathjs.MathType) => x.map((v: number) => Math.atan(v)),
    asinh: (x: mathjs.MathType) => x.map((v: number) => Math.asinh(v)),
    acosh: (x: mathjs.MathType) => x.map((v: number) => Math.acosh(v)),
    atanh: (x: mathjs.MathType) => x.map((v: number) => Math.atanh(v))
  },
  { override: true }
);

function evaluateValue(value: string): mathjs.MathType {
  const parser = interactiveMath.parser();
  let index = -1;

  props.uiJson.input.forEach((input: locApi.IUiJsonInput) => {
    parser.set(input.id, interactiveInputValues.value[++index]);
  });

  return parser.evaluate(value);
}

function updateInteractiveSimulation(forceUpdate: boolean = false): void {
  // Make sure that there are no issues with the UI JSON and that live updates are enabled (unless forced).

  if (interactiveUiJsonIssues.value.length > 0 || (!interactiveLiveUpdatesEnabled.value && !forceUpdate)) {
    return;
  }

  // Show/hide the input widgets.

  props.uiJson.input.forEach((input: locApi.IUiJsonInput, index: number) => {
    interactiveShowInput.value[index] = evaluateValue(input.visible ?? 'true');
  });

  // Update the SED-ML document.

  interactiveModel.removeAllChanges();

  props.uiJson.parameters.forEach((parameter: locApi.IUiJsonParameter) => {
    const componentVariableNames = parameter.name.split('/');

    if (componentVariableNames[0] !== undefined && componentVariableNames[1] !== undefined) {
      interactiveModel.addChange(
        componentVariableNames[0],
        componentVariableNames[1],
        String(evaluateValue(parameter.value))
      );
    }
  });

  // Reset our interactive margins.

  onResetMargins();

  // Run the instance and update the plots.

  interactiveInstance.run();

  if (interactiveInstance.hasIssues()) {
    interactiveInstanceIssues.value = interactiveInstance.issues();

    return;
  } else {
    interactiveInstanceIssues.value = [];
  }

  const parser = interactiveMath.parser();

  props.uiJson.output.data.forEach((data: locApi.IUiJsonOutputData) => {
    const info = interactiveIdToInfo[data.id];

    if (info !== undefined) {
      parser.set(data.id, locCommon.simulationData(interactiveInstanceTask, info));
    } else {
      parser.set(data.id, []);
    }
  });

  interactiveData.value = props.uiJson.output.plots.map((plot: locApi.IUiJsonOutputPlot) => {
    let additionalTraces: IGraphPanelPlotAdditionalTrace[] = [];

    plot.additionalTraces?.forEach((additionalTrace: locApi.IUiJsonOutputPlotAdditionalTrace) => {
      additionalTraces.push({
        name: traceName(additionalTrace.name, additionalTrace.xValue, additionalTrace.yValue),
        xValues: parser.evaluate(additionalTrace.xValue),
        yValues: parser.evaluate(additionalTrace.yValue)
      });
    });

    return {
      name: traceName(plot.name, plot.xValue, plot.yValue),
      xAxisTitle: plot.xAxisTitle,
      xValues: parser.evaluate(plot.xValue),
      yAxisTitle: plot.yAxisTitle,
      yValues: parser.evaluate(plot.yValue),
      additionalTraces: additionalTraces
    };
  });
}

// Interactive mode's margins-related event handlers.

function onMarginsUpdated(plotId: string, newMargins: IGraphPanelMargins): void {
  interactiveMargins[plotId] = newMargins;

  const margins = Object.values(interactiveMargins);

  if (margins.length !== props.uiJson.output.plots.length) {
    interactiveCompMargins.value = undefined;

    return;
  }

  interactiveCompMargins.value = {
    left: Math.max(...margins.map((margin) => margin.left)),
    right: Math.max(...margins.map((margin) => margin.right))
  };
}

function onResetMargins() {
  interactiveMargins = {};
  interactiveCompMargins.value = undefined;
}

// Interactive mode's runs-related event handlers

function onAddRun(): void {
  // Create a new run from the live run.

  const inputParameters: Record<string, number> = {};

  props.uiJson.input.forEach((input: locApi.IUiJsonInput, index: number) => {
    inputParameters[input.id] = interactiveInputValues.value[index]!;
  });

  interactiveRuns.value.push({
    inputParameters: inputParameters,
    visible: true,
    data: interactiveData.value
  });
}

function onRemoveRun(index: number): void {
  // Remove the given run.

  interactiveRuns.value.splice(index, 1);
}

function onRemoveAllRuns(): void {
  // Remove all the runs.

  interactiveRuns.value = [];
}

function onToggleRun(index: number): void {
  // Toggle the visibility of the given run.

  const run = interactiveRuns.value[index]!;

  run.visible = !run.visible;
}

function runTooltip(run: ISimulationRun): string {
  const rows = Object.entries(run.inputParameters)
    .map(
      ([key, value]) => `
<tr>
  <td>
    <b>${key}:</b>
  </td>
  <td style="padding-left: 8px;">
    ${value}
  </td>
</tr>
`
    )
    .join('');

  return `
<table>
  <tbody>
    ${rows}
  </tbody>
</table>
`;
}

// "Initialise" our standard and/or interactive modes.

vue.onMounted(() => {
  updatePlot();

  if (interactiveModeAvailable.value) {
    updateInteractiveSimulation();
  }
});

// Various things that need to be done once we are is mounted.

const crtInstance = vue.getCurrentInstance();

vue.onMounted(() => {
  // Customise our IDs.

  toolbarId.value = `simulationExperimentViewToolbar${String(crtInstance?.uid)}`;
  editorId.value = `simulationExperimentViewEditor${String(crtInstance?.uid)}`;
  liveUpdatesCheckboxId.value = `simulationExperimentViewLiveUpdatesCheckbox${String(crtInstance?.uid)}`;

  // Track the height of our toolbar.

  let toolbarResizeObserver: ResizeObserver | undefined;

  setTimeout(() => {
    toolbarResizeObserver = vueCommon.trackElementHeight(toolbarId.value);
  }, SHORT_DELAY);

  // Monitor "our" contents size.

  function resizeOurselves() {
    actualHeight.value = props.height - (toolbarNeeded.value ? vueCommon.trackedCssVariableValue(toolbarId.value) : 0);
  }

  vue.nextTick(() => {
    resizeOurselves();
  });

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
      if (!interactiveModeEnabled.value || (interactiveModeEnabled.value && !interactiveLiveUpdatesEnabled.value)) {
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

:deep(.p-editor-content) {
  border: none !important;
}

:deep(.p-editor-toolbar) {
  display: none;
}

:deep(.p-togglebutton) {
  background-color: var(--p-primary-color) !important;
  color: var(--p-primary-contrast-color) !important;
  padding-left: 0.75rem !important;
  padding-right: 0.75rem !important;
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

.hint {
  color: var(--p-text-muted-color);
}

.invisible {
  visibility: hidden;
}

.run {
  border-color: var(--p-content-border-color);
}
</style>
