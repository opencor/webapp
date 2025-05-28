<template>
  <div ref="mainDiv" class="h-full">
    <GraphPanelWidget :canAutoResize="isActiveFile" :plots="plots" />
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue'

import { type IGraphPanelPlot } from '../widgets/GraphPanelWidget.vue'
import { type IFileTab } from '../ContentsComponent.vue'

const fileTabModel = defineModel()
const props = defineProps<{
  isActiveFile: boolean
  simulationOnly?: boolean
}>()

const mainDiv = vue.ref<InstanceType<typeof Element> | null>(null)
const fileTab = fileTabModel.value as IFileTab
const sedInstance = fileTab.file.sedInstance()
const sedInstanceTask = sedInstance.task(0)

// Run the instance and update the plot.
// Note: we do this after the next tick to ensure that the DOM is ready.

const plots = vue.ref<IGraphPanelPlot[]>([])

vue
  .nextTick()
  .then(() => {
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
  .catch((error: unknown) => {
    console.error('Error running the SED-ML instance:', error)
  })

// Apply the proper class to our main div.

vue.onMounted(() => {
  mainDiv.value?.classList.add(props.simulationOnly ? 'simulation-experiment-only' : 'simulation-experiment')
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
