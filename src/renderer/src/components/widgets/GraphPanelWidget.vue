<template>
  <div class="flex flex-row h-full" :class="isVisible ? 'visible' : 'invisible'">
    <div v-if="showMarker" class="w-0.75 bg-primary" />
    <div ref="mainDiv" class="grow h-full" />
  </div>
</template>

<script setup lang="ts">
import Plotly from 'https://cdn.jsdelivr.net/npm/plotly.js-gl2d-dist-min@3.3.1/+esm';
import * as vue from 'vue';

import * as vueCommon from '../../common/vueCommon.ts';

import { GraphPanelWidgetPaletteColors } from './GraphPanelWidgetPalette.ts';

export interface IGraphPanelPlotTrace {
  name: string;
  x: Float64Array;
  y: Float64Array;
  color: string;
  zorder?: number;
}

export interface IGraphPanelData {
  xAxisTitle?: string;
  yAxisTitle?: string;
  traces: IGraphPanelPlotTrace[];
}

export interface IGraphPanelMargins {
  left: number;
  right: number;
}

const props = withDefaults(
  defineProps<{
    data: IGraphPanelData;
    showMarker?: boolean;
    margins?: IGraphPanelMargins;
    showLegend?: boolean;
  }>(),
  {
    showMarker: false,
    showLegend: true
  }
);
const emit = defineEmits<{
  (event: 'marginsUpdated', newMargins: IGraphPanelMargins): void;
  (event: 'resetMargins'): void;
}>();
defineExpose({
  resize
});

const mainDiv = vue.ref<InstanceType<typeof Element> | null>(null);
const isVisible = vue.ref(false);
const margins = vue.ref<IGraphPanelMargins>({ left: -1, right: -1 });
const theme = vueCommon.useTheme();
let updatingMargins = false;

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
    colorway: GraphPanelWidgetPaletteColors,
    xaxis: axisThemeData(),
    yaxis: axisThemeData()
  };
}

interface IAxesData {
  xaxis: {
    tickangle: number;
    automargin: boolean;
    title: {
      font: {
        size: number;
      };
      text?: string;
      standoff: number;
    };
  };
  yaxis: {
    tickangle: number;
    automargin: boolean;
    title: {
      font: {
        size: number;
      };
      text?: string;
      standoff: number;
    };
  };
}

function axesData(): IAxesData {
  const axisTitleFontSize = 10;

  return {
    xaxis: {
      tickangle: 0,
      automargin: true,
      title: {
        font: {
          size: axisTitleFontSize
        },
        text: props.data.xAxisTitle,
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
        text: props.data.yAxisTitle,
        standoff: 8
      }
    }
  };
}

function resolvedMargin(propValue: number | undefined, compValue: number): number {
  if (propValue !== undefined) {
    return propValue;
  }

  return compValue === -1 ? 0 : compValue;
}

function compMargins(): IGraphPanelMargins {
  // Retrieve the width of the Y ticks.

  const yTicks = mainDiv.value?.querySelectorAll('.ytick text');
  let yTicksWidth = 0;

  if (yTicks?.length) {
    yTicks.forEach((yTick: Element) => {
      yTicksWidth = Math.max(yTicksWidth, yTick.getBoundingClientRect()?.width || 0);
    });
  }

  // Retrieve the width of the Y Axis title.

  const yTitleWidth = props.data.yAxisTitle
    ? mainDiv.value?.querySelector('.ytitle')?.getBoundingClientRect()?.width || 0
    : 0;

  // Compute the final left margin.

  const leftMargin = yTicksWidth + yTitleWidth;

  // Retrieve the width of the legend, if it's to be shown, and that last X tick.
  // Note #1: for the last X tick, we only use half its width since the tick is centered on the tick mark.
  // Note #2: to get the correct width of the last X tick, we temporarily set its display to block in case it was
  //          hidden, something that can happen if the tick label is long for instance.

  let rightMargin = 0;

  if (props.showLegend) {
    rightMargin = mainDiv.value?.querySelector('.legend')?.getBoundingClientRect()?.width || 0;
  }

  const xTicks = mainDiv.value?.querySelectorAll('.xtick text');

  if (xTicks?.length) {
    const lastTick = xTicks[xTicks.length - 1] as HTMLElement;
    const originalDisplay = lastTick.style.display;

    lastTick.style.display = 'block';

    rightMargin += 0.5 * (lastTick?.getBoundingClientRect()?.width || 0);

    lastTick.style.display = originalDisplay;
  }

  return {
    left: leftMargin ? Math.ceil(leftMargin + 5) : 0,
    right: rightMargin ? Math.ceil(rightMargin + 5) : 0
  };
}

function updateMarginsAsync(): void {
  // Skip if we are already updating our margins.

  if (updatingMargins) {
    return;
  }

  updatingMargins = true;

  // Use requestAnimationFrame for optimal timing (after render, before next paint).

  requestAnimationFrame(() => {
    const newMargins = compMargins();

    emit('marginsUpdated', newMargins);

    // Update our margins if they have changed.

    const relayoutUpdates: Record<string, number> = {};

    if (!props.margins) {
      if (margins.value.left !== newMargins.left) {
        margins.value.left = newMargins.left;

        relayoutUpdates['margin.l'] = margins.value.left;
      }

      if (margins.value.right !== newMargins.right) {
        margins.value.right = newMargins.right;

        relayoutUpdates['margin.r'] = margins.value.right;
      }
    }

    if (Object.keys(relayoutUpdates).length) {
      Plotly.relayout(mainDiv.value, relayoutUpdates);
    }

    updatingMargins = false;
  });
}

function updatePlot(): void {
  // Reset our margins if they are not overridden.

  if (!props.margins) {
    margins.value.left = -1;
    margins.value.right = -1;
  }

  // Update the plots.

  const traces = props.data.traces.map((trace) => ({
    ...trace,
    ...{
      line: { color: trace.color },
      legendrank: trace.zorder
    }
  }));

  Plotly.react(
    mainDiv.value,
    traces,
    {
      // Note: the various keys can be found at https://plotly.com/javascript/reference/.

      ...themeData(),
      margin: {
        t: 0,
        l: resolvedMargin(props.margins?.left, margins.value.left),
        b: props.data.xAxisTitle ? 35 : 20,
        r: resolvedMargin(props.margins?.right, margins.value.right),
        pad: 0
      },
      showlegend: props.showLegend,
      ...axesData()
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
      if (!isVisible.value) {
        // Force Plotly to recalculate the layout after the plot is rendered to ensure that it has correct dimensions.

        return Plotly.Plots.resize(mainDiv.value);
      }
    })
    .then(() => {
      if (!isVisible.value) {
        // Show the component now that the plot has been properly sized.

        vue.nextTick(() => {
          isVisible.value = true;
        });
      }

      // Update our margins asynchronously after our initial render.

      updateMarginsAsync();
    });
}

interface IPlotlyHTMLElement extends HTMLElement {
  on(event: string, callback: (...args: unknown[]) => void): void;
}

vue.onMounted(() => {
  vue.nextTick(() => {
    // Reset our margins on double-click and relayout.

    const plotlyElement = mainDiv.value as IPlotlyHTMLElement;

    plotlyElement.on('plotly_doubleclick', () => {
      emit('resetMargins');
    });

    plotlyElement.on('plotly_relayout', (eventData: Partial<Plotly.Layout>) => {
      if (eventData && (eventData['xaxis.range[0]'] || eventData['yaxis.range[0]'])) {
        emit('resetMargins');
      }
    });
  });
});

vue.watch(
  () => props.data,
  () => {
    vue.nextTick(() => {
      updatePlot();
    });
  },
  { immediate: true }
);

vue.watch(
  () => theme.useLightMode(),
  () => {
    vue.nextTick(() => {
      Plotly.relayout(mainDiv.value, {
        ...themeData(),
        ...axesData()
      });
    });
  },
  { immediate: true }
);

vue.watch(
  () => props.margins,
  () => {
    vue
      .nextTick(() => {
        return Plotly.relayout(mainDiv.value, {
          'margin.l': resolvedMargin(props.margins?.left, margins.value.left),
          'margin.r': resolvedMargin(props.margins?.right, margins.value.right)
        });
      })
      .then(() => {
        if (!props.margins) {
          updateMarginsAsync();
        }
      });
  },
  { immediate: true }
);

vue.watch(
  () => props.showLegend,
  () => {
    vue.nextTick(() => {
      Plotly.relayout(mainDiv.value, {
        showlegend: props.showLegend
      }).then(() => {
        updateMarginsAsync();
      });
    });
  },
  { immediate: true }
);

function resize(): Promise<unknown> {
  return Promise.resolve()
    .then(() => Plotly.Plots.resize(mainDiv.value))
    .then(() => {
      updateMarginsAsync();
    });
}
</script>
