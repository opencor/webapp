<template>
  <div :class="'h-full ' + (simulationOnly ? 'simulation-experiment-only' : 'simulation-experiment')">
    <GraphPanelWidget :canAutoResize="isActiveFile" :plots="plots" />
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue'

import { type IGraphPanelPlot } from '../widgets/GraphPanelWidget.vue'
import { type IFileTab } from '../ContentsComponent.vue'

const fileTabModel = defineModel()
defineProps<{
  isActiveFile: boolean
  simulationOnly?: boolean
}>()

const fileTab = fileTabModel.value as IFileTab
const sedInstance = fileTab.file.sedInstance()
const sedInstanceTask = sedInstance.task(0)

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
