<template>
  <div class="flex" :style="{ width: width + 'px', height: containerHeight }">
    <IssuesView
      v-if="issues.length !== 0"
      class="grow"
      :width="width"
      :height="height"
      :issues="issues"
      :simulationOnly="simulationOnly"
    />
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
      <div :id="plotsDivId" class="grow">
        <GraphPanelWidget
          v-for="(_plot, index) in (uiJson as any).output.plots"
          :key="`plot_${index}`"
          class="graph-panel-widget"
          :plots="plots.length !== 0 ? plots[index] : []"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as mathjs from 'https://cdn.jsdelivr.net/npm/mathjs@14.6.0/+esm'
import * as vue from 'vue'

import { NO_DELAY } from '../../common/constants'
import * as locCommon from '../../common/locCommon'
import * as vueCommon from '../../common/vueCommon'
import * as locApi from '../../libopencor/locApi'

import { type IGraphPanelPlot } from '../widgets/GraphPanelWidget.vue'

const props = defineProps<{
  file: locApi.File
  height: number
  simulationOnly?: boolean
  uiJson: locApi.IUiJson
  width: number
}>()

const math = mathjs.create(mathjs.all ?? {}, {})
const model = props.file.document().model(0)
const instance = props.file.instance()
const instanceTask = instance.task(0)
const plotsDivId = `plotsDiv_${props.file.path()}`
const plots = vue.ref<IGraphPanelPlot[][]>([])
const issues = vue.ref(locApi.uiJsonIssues(props.uiJson))
const inputValues = vue.ref<number[]>([])
const showInput = vue.ref<boolean[]>([])
const idToInfo: Record<string, locCommon.ISimulationDataInfo> = {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evaluateValue(value: string): any {
  let index = -1
  const parser = math.parser()

  props.uiJson.input.forEach((input: locApi.IUiJsonInput) => {
    if (input.id !== undefined && input.id !== '') {
      parser.set(input.id, inputValues.value[++index])
    }
  })

  return parser.evaluate(value)
}

props.uiJson.input.forEach((input: locApi.IUiJsonInput) => {
  inputValues.value.push(input.defaultValue)
})

props.uiJson.input.forEach((input: locApi.IUiJsonInput) => {
  showInput.value.push(evaluateValue(input.visible ?? 'true'))
})

props.uiJson.output.data.forEach((data: locApi.IUiJsonOutputData) => {
  idToInfo[data.id] = locCommon.simulationDataInfo(instanceTask, data.name)
})

vue.onMounted(() => {
  updateUiAndSimulation()

  // Determine the number of graph panel widgets (needed to set their height).

  const plotsDiv = document.getElementById(plotsDivId)

  plotsDiv?.style.setProperty('--graph-panel-widget-count', String(plotsDiv.children.length))
})

function updateUiAndSimulation() {
  // Make sure that there are no issues.

  if (issues.value.length > 0) {
    return
  }

  // Show/hide the input widgets.

  props.uiJson.input.forEach((input: locApi.IUiJsonInput, index: number) => {
    showInput.value[index] = evaluateValue(input.visible ?? 'true')
  })

  // Update the SED-ML document.

  model.removeAllChanges()

  props.uiJson.parameters.forEach((parameter: locApi.IUiJsonParameter) => {
    const componentVariableNames = parameter.name.split('/')

    model.addChange(componentVariableNames[0], componentVariableNames[1], String(evaluateValue(parameter.value)))
  })

  // Run the instance and update the plots.

  instance.run()

  const parser = math.parser()

  props.uiJson.output.data.forEach((data: locApi.IUiJsonOutputData) => {
    parser.set(data.id, locCommon.simulationData(instanceTask, idToInfo[data.id]))
  })

  plots.value = props.uiJson.output.plots.map((plot: locApi.IUiJsonOutputPlot) => {
    return [
      {
        x: { data: parser.evaluate(plot.xValue) },
        y: { data: parser.evaluate(plot.yValue) }
      }
    ]
  })
}

// Resize our container as needed.

const containerHeight = vue.ref<string>('0px')

function resizeContainer() {
  const newHeight = props.simulationOnly
    ? props.height
    : props.height -
      vueCommon.cssVariableValue('--main-menu-height') -
      vueCommon.cssVariableValue('--file-tablist-height')

  containerHeight.value = `${String(newHeight)}px`
}

vue.onMounted(() => {
  setTimeout(() => {
    resizeContainer()
  }, NO_DELAY)

  vue.watch(
    () => [props.height],
    () => {
      resizeContainer()
    }
  )
})
</script>

<style scoped>
.graph-panel-widget {
  height: calc(100% / var(--graph-panel-widget-count));
}
</style>
