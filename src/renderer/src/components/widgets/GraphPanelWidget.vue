<template>
  <div class="flex flex-row h-full">
    <div v-if="showMarker" class="marker" />
    <div ref="mainDiv" class="grow h-full" />
  </div>
</template>

<script setup lang="ts">
import Plotly from 'plotly.js-gl2d-dist-min'
import * as vue from 'vue'

import * as vueCommon from '../../common/vueCommon'
import { MEDIUM_DELAY } from '../../common/constants'

let oldMainDivClientWidth = -1
let oldMainDivClientHeight = -1

function resizeIfNeeded() {
  if (mainDiv.value !== null) {
    if (mainDiv.value.clientWidth !== oldMainDivClientWidth || mainDiv.value.clientHeight !== oldMainDivClientHeight) {
      oldMainDivClientWidth = mainDiv.value.clientWidth
      oldMainDivClientHeight = mainDiv.value.clientHeight

      Plotly.Plots.resize(mainDiv.value)
    }
  }

  setTimeout(resizeIfNeeded, MEDIUM_DELAY)
}

vue.onMounted(() => {
  resizeIfNeeded()
})

interface IGraphPanelPlotData {
  data: number[]
}

export interface IGraphPanelPlot {
  x: IGraphPanelPlotData
  y: IGraphPanelPlotData
}

interface IProps {
  plots: IGraphPanelPlot[]
  showMarker?: boolean
}

const { plots, showMarker = false } = defineProps<IProps>()

const mainDiv = vue.ref<InstanceType<typeof Element> | null>(null)

function themeData() {
  // Note: the various keys can be found at https://plotly.com/javascript/reference/.

  function axisThemeData() {
    return {
      zerolinecolor: vueCommon.useLightMode() ? '#94a3b8' : '#71717a', // --p-surface-400 / --p-surface-500
      gridcolor: vueCommon.useLightMode() ? '#e2e8f0' : '#3f3f46', // --p-surface-200 / --p-surface-700
      minor: {
        gridcolor: vueCommon.useLightMode() ? '#f1f5f9' : '#27272a' // --p-surface-100 / --p-surface-800
      }
    }
  }

  return {
    paper_bgcolor: vueCommon.useLightMode() ? '#ffffff' : '#18181b', // --p-content-background
    plot_bgcolor: vueCommon.useLightMode() ? '#ffffff' : '#18181b', // --p-content-background
    font: {
      color: vueCommon.useLightMode() ? '#334155' : '#ffffff' // --p-text-color
    },
    colorway: [
      '#7289ab', // Blue
      '#ea7e53', // Orange
      '#eedd78', // Yellow
      '#e69d87', // Pink
      '#73a373', // Green
      '#73b9bc', // Cyan
      '#dd6b66' // Red
    ],
    xaxis: axisThemeData(),
    yaxis: axisThemeData()
  }
}

vue.watch(
  () => [plots, vueCommon.useLightMode()],
  () => {
    Plotly.react(
      mainDiv.value,
      plots.map((plot) => ({
        x: plot.x.data,
        y: plot.y.data,
        type: 'scattergl'
        //---OPENCOR---
        // WebGL rendering currently results in "Performance warning: clear() called with no buffers in bitmask" being
        // logged to the console. This is a known issue and it should hopefully be fixed in the next version of Plotly.
        // See https://github.com/plotly/plotly.js/issues/7387 and https://github.com/plotly/plotly.js/pull/7390.
      })),
      {
        // Note: the various keys can be found at https://plotly.com/javascript/reference/.

        ...themeData(),
        margin: {
          t: 5,
          l: 30,
          b: 20,
          r: 5
        },
        showlegend: false,
        xaxis: {
          tickangle: 0
        },
        yaxis: {
          tickangle: 0
        }
      },
      {
        // Note: the various keys can be found at https://plotly.com/javascript/configuration-options/.

        responsive: true,
        displayModeBar: false,
        doubleClickDelay: 1000,
        scrollZoom: true,
        showTips: false
      }
    )
  }
)
</script>

<style scoped>
.marker {
  width: 3px;
  background-color: var(--p-primary-color);
}
</style>
