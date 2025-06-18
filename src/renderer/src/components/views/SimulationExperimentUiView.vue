<template>
  <div :class="'flex flex-row h-full ' + (simulationOnly ? 'simulation-experiment-only' : 'simulation-experiment')">
    <div v-if="issues.length === 0" class="flex flex-row grow">
      <div class="ml-4 mr-4 mb-4">
        <Fieldset legend="Input parameters">
          <InputWidget
            v-for="(input, index) in (fileTabModel.uiJson as any).input"
            v-model="inputValues[index]"
            :key="'input_' + index"
            :name="input.name"
            :maximumValue="input.maximumValue"
            :minimumValue="input.minimumValue"
            :possibleValues="input.possibleValues"
            :stepValue="input.stepValue"
            :class="index !== 0 ? 'mt-6' : ''"
            @change="updateSimulation"
          />
        </Fieldset>
      </div>
      <div :id="plotsDivId" class="grow">
        <GraphPanelWidget
          v-for="(_plot, index) in (fileTabModel.uiJson as any).output.plots"
          :key="'plot_' + index"
          class="graph-panel-widget"
          :plots="plots.length !== 0 ? plots[index] : []"
        />
      </div>
    </div>
    <IssuesView v-else class="grow" :issues="issues" :simulationOnly="simulationOnly" />
  </div>
</template>

<script setup lang="ts">
import * as mathjs from 'mathjs'
import * as vue from 'vue'

import * as locApi from '../../../../libopencor/locApi'

import * as common from '../../common'

import { type IGraphPanelPlot } from '../widgets/GraphPanelWidget.vue'
import { type IFileTab } from '../ContentsComponent.vue'

const fileTabModel = defineModel<IFileTab>({ required: true })
defineProps<{
  simulationOnly?: boolean
}>()

const math = mathjs.create(mathjs.all, {})
const model = fileTabModel.value.file.document().model(0)
const instance = fileTabModel.value.file.instance()
const instanceTask = instance.task(0)
const plotsDivId = 'plotsDiv_' + String(fileTabModel.value.file.path())
const plots = vue.ref<IGraphPanelPlot[][]>([])
const issues = vue.ref(locApi.uiJsonIssues(fileTabModel.value.uiJson))
const inputValues = vue.ref<number[]>([])
const idToInfo: Record<string, common.ISimulationDataInfo> = {}

fileTabModel.value.uiJson?.input.forEach((input: locApi.IUiJsonInput) => {
  inputValues.value.push(input.defaultValue)
})

fileTabModel.value.uiJson?.output.data.forEach((data: locApi.IUiJsonOutputData) => {
  idToInfo[data.id] = common.simulationDataInfo(instanceTask, data.name)
})

vue.onMounted(() => {
  updateSimulation()

  // Determine the number of graph panel widgets (needed to set their height).

  const plotsDiv = document.getElementById(plotsDivId)

  plotsDiv?.style.setProperty('--graph-panel-widget-count', plotsDiv.children.length.toString())
})

function updateSimulation() {
  // Update the SED-ML document.

  function evaluateValue(value: string): string {
    let index = -1
    const parser = math.parser()

    fileTabModel.value.uiJson?.input.forEach((input: locApi.IUiJsonInput) => {
      parser.set(input.id, inputValues.value[++index])
    })

    return parser.evaluate(value).toString()
  }

  model.removeAllChanges()

  fileTabModel.value.uiJson?.parameters?.forEach((parameter: locApi.IUiJsonParameter) => {
    const componentVariableNames = parameter.name.split('/')

    model.addChange(componentVariableNames[0], componentVariableNames[1], evaluateValue(parameter.value))
  })

  // Run the instance and update the plots.

  instance.run()

  const parser = math.parser()

  fileTabModel.value.uiJson?.output.data.forEach((data: locApi.IUiJsonOutputData) => {
    parser.set(data.id, common.simulationData(instanceTask, idToInfo[data.id]))
  })

  plots.value =
    fileTabModel.value.uiJson?.output.plots.map((plot: locApi.IUiJsonOutputPlot) => {
      return [
        {
          x: { data: parser.evaluate(plot.xValue) },
          y: { data: parser.evaluate(plot.yValue) }
        }
      ]
    }) ?? []
}
</script>

<style scoped>
.graph-panel-widget {
  height: calc(100% / var(--graph-panel-widget-count));
}

.simulation-experiment-only {
  height: 100vh;
}

.simulation-experiment {
  height: calc(100vh - var(--main-menu-height) - var(--file-tablist-height));
}
</style>
