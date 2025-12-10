<template>
  <div class="flex flex-row h-full" :class="isVisible ? 'visible' : 'invisible'">
    <div v-if="showMarker" class="w-[3px] bg-primary" />
    <div ref="mainDiv" class="grow h-full" />
  </div>
</template>

<script setup lang="ts">
import Plotly from 'https://cdn.jsdelivr.net/npm/plotly.js-gl2d-dist-min@3.1.1/+esm';
import * as vue from 'vue';

import * as vueCommon from '../../common/vueCommon';

interface IPlotlyTrace {
  x: number[];
  y: number[];
}

export interface IGraphPanelPlotAdditionalTrace {
  xValues: number[];
  yValues: number[];
}

export interface IGraphPanelData {
  xAxisTitle?: string;
  xValues: number[];
  yAxisTitle?: string;
  yValues: number[];
  additionalTraces?: IGraphPanelPlotAdditionalTrace[];
}

const props = withDefaults(
  defineProps<{
    data: IGraphPanelData;
    showMarker?: boolean;
  }>(),
  {
    showMarker: false
  }
);

const mainDiv = vue.ref<InstanceType<typeof Element> | null>(null);
const isVisible = vue.ref(false);
const theme = vueCommon.useTheme();

interface IAxisThemeData {
  zerolinecolor: string;
  gridcolor: string;
  minor: {
    gridcolor: string;
  };
}

interface IThemeData {
  paper_bgcolor: string;
  plot_bgcolor: string;
  font: { color: string };
  colorway: string[];
  xaxis: IAxisThemeData;
  yaxis: IAxisThemeData;
}

function themeData(): IThemeData {
  // Note: the various keys can be found at https://plotly.com/javascript/reference/.

  function axisThemeData(): IAxisThemeData {
    return {
      zerolinecolor: theme.useLightMode() ? '#94a3b8' : '#71717a', // --p-surface-400 / --p-surface-500
      gridcolor: theme.useLightMode() ? '#e2e8f0' : '#3f3f46', // --p-surface-200 / --p-surface-700
      minor: {
        gridcolor: theme.useLightMode() ? '#f1f5f9' : '#27272a' // --p-surface-100 / --p-surface-800
      }
    };
  }

  return {
    paper_bgcolor: theme.useLightMode() ? '#ffffff' : '#18181b', // --p-content-background
    plot_bgcolor: theme.useLightMode() ? '#ffffff' : '#18181b', // --p-content-background
    font: {
      color: theme.useLightMode() ? '#334155' : '#ffffff' // --p-text-color
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
  };
}

vue.watch(
  () => [props.data, theme.useLightMode()],
  () => {
    // Wait for the DOM to update before proceeding.

    vue.nextTick(() => {
      // Retrieve the axes' titles.

      const xAxisTitle = props.data.xAxisTitle;
      const yAxisTitle = props.data.yAxisTitle;

      // Retrieve all the traces, i.e. the default trace and any additional traces.

      let traces: IPlotlyTrace[] = [{ x: props.data.xValues, y: props.data.yValues }];

      for (const additionalTrace of props.data.additionalTraces || []) {
        traces.push({ x: additionalTrace.xValues, y: additionalTrace.yValues });
      }

      // Update the plots.

      const axisTitleFontSize = 10;

      Plotly.react(
        mainDiv.value,
        traces,
        {
          // Note: the various keys can be found at https://plotly.com/javascript/reference/.

          ...themeData(),
          margin: {
            t: 0,
            l: 0,
            b: 35,
            r: 0,
            pad: 0
          },
          showlegend: false,
          xaxis: {
            tickangle: 0,
            automargin: true,
            title: {
              font: {
                size: axisTitleFontSize
              },
              text: xAxisTitle,
              standoff: 8
            }
          },
          yaxis: {
            tickangle: 0,
            automargin: true,
            title: {
              font: {
                size: axisTitleFontSize
              },
              text: yAxisTitle,
              standoff: 8
            }
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
        .then(() => {
          if (isVisible.value) {
            return;
          }

          // Force Plotly to recalculate the layout after the plot is rendered to ensure that it has correct dimensions.

          return Plotly.Plots.resize(mainDiv.value);
        })
        .then(() => {
          if (isVisible.value) {
            return;
          }

          // Show the component now that the plot has been properly sized.

          vue.nextTick(() => {
            isVisible.value = true;
          });
        });
    });
  },
  { immediate: true }
);
</script>
