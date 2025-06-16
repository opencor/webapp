<template>
  <div :class="'flex flex-row h-full ' + (simulationOnly ? 'simulation-experiment-only' : 'simulation-experiment')">
    <div v-if="issues.length === 0" class="flex flex-row grow">
      <div class="ml-4 mr-4 mb-4">
        <Fieldset legend="Input parameters">
          <InputSliderWidget
            v-for="(input, index) in (fileTab.uiJson as any).input"
            v-model="value[index]"
            :key="'input_' + index"
            :name="input.name"
            :maximumValue="input.maximumValue"
            :minimumValue="input.minimumValue"
            :possibleValues="input.possibleValues"
            :stepValue="input.stepValue"
            :class="index !== 0 ? 'mt-4' : ''"
            @change="updateSimulation"
          />
        </Fieldset>
      </div>
      <div :id="plotsDivId" class="grow">
        <GraphPanelWidget
          v-for="(_plot, index) in (fileTab.uiJson as any).output.plots"
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

const fileTabModel = defineModel()
defineProps<{
  simulationOnly?: boolean
}>()

const math = mathjs.create(mathjs.all, {})
const fileTab = fileTabModel.value as IFileTab
const model = fileTab.file.document().model(0)
const instance = fileTab.file.instance()
const instanceTask = instance.task(0)
const plotsDivId = 'plotsDiv_' + String(fileTab.file.path())
const plots = vue.ref<IGraphPanelPlot[][]>([])
const issues = vue.ref(locApi.uiJsonIssues(fileTab.uiJson))
const value = vue.ref<string[]>([])
const idToName = vue.ref<Record<string, string>>({})

fileTab.uiJson?.input.forEach((input: locApi.IUiJsonInput) => {
  value.value.push(input.defaultValue.toString())
})

fileTab.uiJson?.output.data.forEach((data: locApi.IUiJsonOutputData) => {
  idToName.value[data.id] = data.name
})

vue.onMounted(() => {
  updateSimulation()

  // Determine the number of graph panel widgets (needed to set their height).

  const plotsDiv = document.getElementById(plotsDivId)

  plotsDiv?.style.setProperty('--graph-panel-widget-count', plotsDiv.children.length.toString())
})

function updateSimulation() {
  // Update the SED-ML document.

  function evaluateParameterValue(parameterValue: string): string {
    let index = -1
    const parser = math.parser()

    fileTab.uiJson?.input.forEach((input: locApi.IUiJsonInput) => {
      parser.set(input.id, value.value[++index])
    })

    return parser.evaluate(parameterValue).toString()
  }

  model.removeAllChanges()

  fileTab.uiJson?.parameters?.forEach((parameter: locApi.IUiJsonParameter) => {
    const componentVariableNames = parameter.name.split('/')

    model.addChange(componentVariableNames[0], componentVariableNames[1], evaluateParameterValue(parameter.value))
  })

  // Run the instance and update the plots.

  instance.run()

  plots.value = []

  fileTab.uiJson?.output.plots.forEach((plot: locApi.IUiJsonOutputPlot) => {
    plots.value.push([
      {
        x: {
          data: common.simulationData(instanceTask, idToName.value[plot.xValue])
        },
        y: {
          data: common.simulationData(instanceTask, idToName.value[plot.yValue])
        }
      }
    ])
  })
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
