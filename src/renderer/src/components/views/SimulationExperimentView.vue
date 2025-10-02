<template>
  <div :style="{ width: width + 'px', height: height + 'px' }">
    <Toolbar :id="toolbarId" class="p-1!">
      <template #start>
        <Button class="p-1!" icon="pi pi-play-circle" severity="secondary" text @click="onRun()" />
        <Button class="p-1!" disabled icon="pi pi-stop-circle" severity="secondary" text />
      </template>
    </Toolbar>
    <Splitter class="border-none! h-full m-0" layout="vertical" :style="{ height: heightMinusToolbar + 'px' }">
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
                  v-model="xParameter"
                  filter
                  filterMode="lenient"
                  :options="parameters"
                  size="small"
                  class="w-full"
                  @change="updatePlot()"
                />
              </Fieldset>
              <Fieldset legend="Y-axis">
                <Select
                  v-model="yParameter"
                  filter
                  filterMode="lenient"
                  :options="parameters"
                  size="small"
                  class="w-full"
                  @change="updatePlot()"
                />
              </Fieldset>
            </ScrollPanel>
          </SplitterPanel>
          <SplitterPanel :size="75">
            <GraphPanelWidget :plots="plots" />
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
      <SplitterPanel v-if="!simulationOnly" :size="11">
        <Editor :id="editorId" class="border-none h-full" :readonly="true" v-model="consoleContents" />
      </SplitterPanel>
    </Splitter>
  </div>
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core'

import * as vue from 'vue'

import * as common from '../../common/common'
import { SHORT_DELAY } from '../../common/constants'
import * as locCommon from '../../common/locCommon'
import * as vueCommon from '../../common/vueCommon'
import * as locApi from '../../libopencor/locApi'

import { type IGraphPanelPlot } from '../widgets/GraphPanelWidget.vue'

const props = defineProps<{
  file: locApi.File
  height: number
  isActive: boolean
  isActiveFile: boolean
  simulationOnly?: boolean
  uiEnabled: boolean
  width: number
}>()

const toolbarId = vue.ref('simulationExperimentViewToolbar')
const editorId = vue.ref('simulationExperimentViewEditor')
const instance = props.file.instance()
const instanceTask = instance.task(0)
const heightMinusToolbar = vue.ref<number>(0)

const parameters = vue.ref<string[]>([])
const xParameter = vue.ref(instanceTask.voiName())
const yParameter = vue.ref(instanceTask.stateName(0))
const plots = vue.ref<IGraphPanelPlot[]>([])
const consoleContents = vue.ref<string>(`<b>${props.file.path()}</b>`)

function addParameter(param: string): void {
  parameters.value.push(param)
}

addParameter(instanceTask.voiName())

for (let i = 0; i < instanceTask.stateCount(); i++) {
  addParameter(instanceTask.stateName(i))
}

for (let i = 0; i < instanceTask.rateCount(); i++) {
  addParameter(instanceTask.rateName(i))
}

for (let i = 0; i < instanceTask.constantCount(); i++) {
  addParameter(instanceTask.constantName(i))
}

for (let i = 0; i < instanceTask.computedConstantCount(); i++) {
  addParameter(instanceTask.computedConstantName(i))
}

for (let i = 0; i < instanceTask.algebraicCount(); i++) {
  addParameter(instanceTask.algebraicName(i))
}

function onRun(): void {
  // Run the instance, output the simulation time to the console, and update the plot.

  const simulationTime = instance.run()

  consoleContents.value += `<br/>&nbsp;&nbsp;<b>Simulation time:</b> ${common.formatTime(simulationTime)}`

  void vue.nextTick().then(() => {
    const consoleElement = document.getElementById(editorId.value)?.getElementsByClassName('ql-editor')[0]

    if (consoleElement !== undefined) {
      consoleElement.scrollTop = consoleElement.scrollHeight
    }
  })

  updatePlot()
}

const xInfo = vue.computed(() => locCommon.simulationDataInfo(instanceTask, xParameter.value))
const yInfo = vue.computed(() => locCommon.simulationDataInfo(instanceTask, yParameter.value))

function updatePlot() {
  plots.value = [
    {
      x: {
        data: locCommon.simulationData(instanceTask, xInfo.value)
      },
      y: {
        data: locCommon.simulationData(instanceTask, yInfo.value)
      }
    }
  ]
}

// "Initialise" our plot.

vue.onMounted(() => {
  updatePlot()
})

// Various things that need to be done once we are mounted.

const crtInstance = vue.getCurrentInstance()

vue.onMounted(() => {
  // Customise our IDs.

  toolbarId.value = `simulationExperimentViewToolbar${String(crtInstance?.uid)}`
  editorId.value = `simulationExperimentViewEditor${String(crtInstance?.uid)}`

  // Track the height of our toolbar.

  let toolbarResizeObserver: ResizeObserver | undefined

  setTimeout(() => {
    toolbarResizeObserver = vueCommon.trackElementHeight(toolbarId.value)
  }, SHORT_DELAY)

  // Monitor "our" contents size.

  function resizeOurselves() {
    heightMinusToolbar.value = props.height - vueCommon.trackedCssVariableValue(toolbarId.value)
  }

  vue.watch(
    () => props.height,
    () => {
      resizeOurselves()
    }
  )

  let oldToolbarHeight = vueCommon.trackedCssVariableValue(toolbarId.value)

  const mutationObserver = new MutationObserver(() => {
    const newToolbarHeight = vueCommon.trackedCssVariableValue(toolbarId.value)

    if (newToolbarHeight !== oldToolbarHeight) {
      oldToolbarHeight = newToolbarHeight

      resizeOurselves()
    }
  })

  mutationObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })

  vue.onUnmounted(() => {
    mutationObserver.disconnect()

    toolbarResizeObserver?.disconnect()
  })
})

// Keyboard shortcuts.

if (common.isDesktop()) {
  vueusecore.onKeyStroke((event: KeyboardEvent) => {
    if (!props.isActive || !props.uiEnabled) {
      return
    }

    if (props.isActiveFile && !event.ctrlKey && !event.shiftKey && !event.metaKey && event.code === 'F9') {
      event.preventDefault()

      onRun()
    }
  })
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
