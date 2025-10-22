<template>
  <div class="flex" :style="{ width: width + 'px', height: height + 'px' }">
    <IssuesView v-if="issues.length !== 0" class="grow" :width="width" :height="height" :issues="issues" />
    <div v-else class="flex grow">
      <div class="ml-4 mr-4 mb-4">
        <ScrollPanel class="h-full">
          <Fieldset legend="Input parameters">
            <InputWidget
              v-for="(input, index) in (uiJson as any).input"
              v-model="inputValues[index]"
              v-show="showInput[index]"
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
        <IssuesView v-if="instanceIssues.length !== 0" :leftMargin="false" :width="width" :height="height" :issues="instanceIssues" />
        <GraphPanelWidget v-else
          v-for="(_plot, index) in (uiJson as any).output.plots"
          :key="`plot_${index}`"
          :style="{ height: `calc(100% / ${(uiJson as any).output.plots.length})` }"
          :plots="plots.length !== 0 ? plots[index] : []"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as mathjs from 'https://cdn.jsdelivr.net/npm/mathjs@14.9.1/+esm';
import * as vue from 'vue';

import * as locCommon from '../../common/locCommon';
import * as locApi from '../../libopencor/locApi';

import type { IGraphPanelPlot } from '../widgets/GraphPanelWidget.vue';

const props = defineProps<{
  file: locApi.File;
  height: number;
  uiJson: locApi.IUiJson;
  width: number;
}>();

const math = mathjs.create(mathjs.all ?? {}, {});
const model = props.file.document().model(0);
const instance = props.file.instance();
const instanceTask = instance.task(0);
const plots = vue.ref<IGraphPanelPlot[][]>([]);
const issues = vue.ref(locApi.uiJsonIssues(props.uiJson));
const instanceIssues = vue.ref<locApi.IIssue[]>([]);
const inputValues = vue.ref<number[]>([]);
const showInput = vue.ref<boolean[]>([]);
const idToInfo: Record<string, locCommon.ISimulationDataInfo> = {};

function evaluateValue(value: string): mathjs.MathType {
  let index = -1;
  const parser = math.parser();

  props.uiJson.input.forEach((input: locApi.IUiJsonInput) => {
    if (input.id !== undefined && input.id !== '') {
      parser.set(input.id, inputValues.value[++index]);
    }
  });

  return parser.evaluate(value);
}

props.uiJson.input.forEach((input: locApi.IUiJsonInput) => {
  inputValues.value.push(input.defaultValue);
});

props.uiJson.input.forEach((input: locApi.IUiJsonInput) => {
  showInput.value.push(evaluateValue(input.visible ?? 'true'));
});

props.uiJson.output.data.forEach((data: locApi.IUiJsonOutputData) => {
  idToInfo[data.id] = locCommon.simulationDataInfo(instanceTask, data.name);
});

function updateUiAndSimulation() {
  // Make sure that there are no issues.

  if (issues.value.length > 0) {
    return;
  }

  // Show/hide the input widgets.

  props.uiJson.input.forEach((input: locApi.IUiJsonInput, index: number) => {
    showInput.value[index] = evaluateValue(input.visible ?? 'true');
  });

  // Update the SED-ML document.

  model.removeAllChanges();

  props.uiJson.parameters.forEach((parameter: locApi.IUiJsonParameter) => {
    const componentVariableNames = parameter.name.split('/');

    // @ts-expect-error (we trust that we have a valid component and variable name)
    model.addChange(componentVariableNames[0], componentVariableNames[1], String(evaluateValue(parameter.value)));
  });

  // Run the instance and update the plots.

  instance.run();

  if (instance.hasIssues()) {
    instanceIssues.value = instance.issues();

    return;
  } else {
    instanceIssues.value = [];
  }

  const parser = math.parser();

  props.uiJson.output.data.forEach((data: locApi.IUiJsonOutputData) => {
    // @ts-expect-error (we trust that we have some valid information)
    parser.set(data.id, locCommon.simulationData(instanceTask, idToInfo[data.id]));
  });

  plots.value = props.uiJson.output.plots.map((plot: locApi.IUiJsonOutputPlot) => {
    return [
      {
        x: { data: parser.evaluate(plot.xValue) },
        y: { data: parser.evaluate(plot.yValue) }
      }
    ];
  });
}

vue.onMounted(() => {
  updateUiAndSimulation();
});
</script>
