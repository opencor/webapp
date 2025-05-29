<template>
  <div :class="'flex flex-row h-full ' + (simulationOnly ? 'simulation-experiment-only' : 'simulation-experiment')">
    <div v-if="issues.length === 0" class="flex flex-row grow">
      <div class="ml-4 mr-4 mb-4">
        <Fieldset legend="Input parameters">
          <div v-for="(input, index) in (fileTab.uiJson as any).input" :key="'input_' + index">
            {{ input.name }}
          </div>
        </Fieldset>
      </div>
      <div class="grow">
        <GraphPanelWidget :canAutoResize="isActiveFile" :plots="plots" />
      </div>
    </div>
    <IssuesView v-else class="grow" :issues="issues" :simulationOnly="simulationOnly" />
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue'

import { type IGraphPanelPlot } from '../widgets/GraphPanelWidget.vue'
import { type IFileTab } from '../ContentsComponent.vue'

import { uiJsonIssues } from './SimulationExperimentUiView'

const fileTabModel = defineModel()
defineProps<{
  isActiveFile: boolean
  simulationOnly?: boolean
}>()

const fileTab = fileTabModel.value as IFileTab
const sedInstance = fileTab.file.sedInstance()
const sedInstanceTask = sedInstance.task(0)
const issues = vue.ref(uiJsonIssues(fileTab.uiJson))

// Run the instance and update the plot.

const plots = vue.ref<IGraphPanelPlot[]>([])

vue.onMounted(() => {
  sedInstance.run()

  plots.value = [
    {
      x: {
        data: sedInstanceTask.voi()
      },
      y: {
        data: sedInstanceTask.state(0)
      }
    }
  ]
})
</script>

<style scoped>
.simulation-experiment-only {
  height: 100vh;
}

.simulation-experiment {
  height: calc(100vh - var(--main-menu-height) - var(--file-tablist-height));
}
</style>
