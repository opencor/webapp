<template>
  <div ref="rootRef" class="flex flex-row h-full">
    <div v-if="showMarker" class="w-0.75 bg-primary" />
    <div ref="mainDivRef" class="grow h-full min-w-0 relative overflow-hidden"
      :style="{
        backgroundColor: themeColors.background,
        color: themeColors.text,
        fontFamily: FONT_FAMILY
      }"
      @contextmenu="onContextMenu"
    >
      <div ref="plotDivRef" class="absolute inset-0" />
      <template v-if="plotRect">
        <div v-if="data.xAxisTitle" class="axis-title"
          :style="{
            left: `${plotRect.left + 0.5 * plotRect.width}px`,
            top: `${plotRect.top + plotRect.height + X_AXIS_SIZE_WITH_TITLE}px`,
            fontSize: `${TITLE_FONT_SIZE}px`,
            transform: 'translateX(-50%)'
          }"
          v-html="data.xAxisTitle"
        />
        <div v-if="data.yAxisTitle" class="axis-title"
          :style="{
            left: `${Y_AXIS_TITLE_SIZE - Y_AXIS_TITLE_GAP - TITLE_FONT_SIZE}px`,
            top: `${plotRect.top + 0.5 * plotRect.height}px`,
            fontSize: `${TITLE_FONT_SIZE}px`,
            writingMode: 'vertical-rl',
            transform: 'translateY(-50%) rotate(180deg)'
          }"
          v-html="data.yAxisTitle"
        />
      </template>
      <div v-if="showLegend && legendItems.length" ref="legendRef" class="legend"
        :style="{
          left: `${legendLeft}px`,
          top: `${plotRect?.top ?? 0}px`,
          maxHeight: plotRect ? `${plotRect.height}px` : undefined,
          visibility: plotRect ? undefined : 'hidden',
          backgroundColor: themeColors.background,
          fontSize: `${LEGEND_FONT_SIZE}px`
        }"
      >
        <div v-for="legendItem in legendItems" :key="legendItem.index" class="legend-item" :class="{ 'legend-item-hidden': !legendItem.visible }"
          @click="onLegendClick($event, legendItem.index)"
          @dblclick="onLegendDoubleClick(legendItem.index)"
        >
          <span class="legend-swatch" :style="{ backgroundColor: legendItem.color }">
            <span v-if="legendItem.markers" class="legend-marker" />
          </span>
          <span v-html="legendItem.name" />
        </div>
      </div>
    </div>
    <ContextMenu ref="contextMenuRef" :model="contextMenuItems" :appendTo="appendTarget" />
  </div>
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core';

import ContextMenu from 'primevue/contextmenu';
import type { MenuItem } from 'primevue/menuitem';
import type uPlot from 'uplot';
import * as vue from 'vue';

import * as common from '../../common/common';
import { LONG_DELAY, NO_DELAY } from '../../common/constants';
import * as dependencies from '../../common/dependencies';
import * as math from '../../common/math';
import * as vueCommon from '../../common/vueCommon';

import { useOpenCORProgressMessage } from '../OpenCORProgressMessage';

const CONTEXT_MENU_EVENT: string = 'graph-panel-context-menu-open';

export interface IGraphPanelPlotTrace {
  name: string;
  traceId?: string;
  xValue: string;
  x: math.FloatArray;
  yValue: string;
  y: math.FloatArray;
  color: string;
  zorder?: number;
}

export interface IGraphPanelData {
  xAxisTitle?: string;
  yAxisTitle?: string;
  xAxisRange?: [number, number];
  yAxisRange?: [number, number];
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
  marginsUpdated: [newMargins: IGraphPanelMargins];
}>();

// Some constants (in CSS pixels, where relevant).
// Note: we want to look and behave like Plotly, so most of these constants are either Plotly's defaults (see
//       https://plotly.com/javascript/reference/) or what we used to give Plotly.

const FONT_FAMILY = '"Open Sans", verdana, arial, sans-serif';
const TICK_FONT_SIZE = 10;
const TITLE_FONT_SIZE = 14;
const LEGEND_FONT_SIZE = 12;
const LEGEND_LEFT_MARGIN = 8; // Margin between our plotting area and our legend.
const LEGEND_RIGHT_MARGIN = 8; // Margin between our legend (or last X tick label) and the right edge of our container.
const DEFAULT_ZORDER = 1000; // Like Plotly's default legend rank.
const TICK_LABEL_GAP = 1; // Gap between our plotting area and our tick labels.
const TICK_LABEL_HALF_HEIGHT = 6; // Used to hide a Y tick label that would (partly) be above our container.
const X_AXIS_SIZE_WITH_TITLE = 18; // Size of our X axis (without its title) if it has a title.
const X_AXIS_SIZE_WITHOUT_TITLE = 20; // Size of our X axis if it doesn't have a title.
const X_AXIS_TITLE_SIZE = 17;
const Y_AXIS_TITLE_SIZE = 17;
const Y_AXIS_TITLE_GAP = 1.5;
const Y_AXIS_EXTRA_SIZE = 5; // Extra size of our Y axis, on top of the width of its tick labels.
const MAJOR_TICK_MIN_X_SPACING = 80;
const MAJOR_TICK_MIN_Y_SPACING = 40;
const NB_OF_MINOR_TICKS = 5;
const TICK_LABEL_MIN_SPACING = 10; // Minimum spacing between two consecutive tick labels.
const MAX_NB_OF_TICKS = 1000; // A safeguard against an axis needing an unreasonable number of ticks.
const LINE_WIDTH = 2;
const MARKER_SIZE = 6;
const MARKER_PADDING = Math.max(MARKER_SIZE / 1.6, 3); // Autorange padding for markers.
const MIN_NB_OF_POINTS_WITHOUT_MARKERS = 20; // Like in Plotly, traces with fewer than 20 points also have markers.
const AUTORANGE_PADDING = 0.05; // As a fraction of the length of an axis.
const DEFAULT_X_RANGE: [number, number] = [-1, 6];
const DEFAULT_Y_RANGE: [number, number] = [-1, 4];

// Resize handling.

const doResize = (): void => {
  // Make sure that we have a valid size.

  const width = mainDivRef.value?.clientWidth || 0;
  const height = mainDivRef.value?.clientHeight || 0;

  if (width <= 0 || height <= 0) {
    return;
  }

  // Update our plot or its size, if needed.

  if (!plot || isPlotOutdated) {
    updatePlot();
  } else if (plot.width !== width || plot.height !== height) {
    setPlotSize(plot, width, height);
  }
};

const resize = (): Promise<unknown> => {
  // Resize our plot.

  doResize();

  return Promise.resolve();
};

const resetMargins = (): void => {
  // Forget the margins that we last emitted, so that we emit our current margins (e.g., when the shared margins we are
  // given are reset, see onResetMargins() in SimulationExperimentInteractiveView.vue).

  trackedMargins = undefined;

  updateMarginsAsync();
};

defineExpose({
  resetMargins,
  resize
});

const instanceId = Symbol('GraphPanelWidget');
const rootRef = vue.shallowRef<HTMLElement | null>(null);
const mainDivRef = vue.shallowRef<HTMLElement | null>(null);
const plotDivRef = vue.shallowRef<HTMLElement | null>(null);
const legendRef = vue.shallowRef<HTMLElement | null>(null);
const theme = vueCommon.useTheme();
const contextMenuRef = vue.ref<InstanceType<typeof ContextMenu> | null>(null);
const appendTarget = vueCommon.useAppendTarget(rootRef);
const progressMessage = useOpenCORProgressMessage();
let plot: uPlot | undefined;
let plotSignature: string | undefined;
let isPlotOutdated = false;
let isUnmounted = false;
let stopTrackingContainerSize: (() => void) | undefined;
let stopTrackingLegendSize: (() => void) | undefined;
let marginsUpdatePending = false;
let trackedMargins: IGraphPanelMargins | undefined;

// Our theme.

interface IThemeColors {
  background: string;
  text: string;
  grid: string;
  minorGrid: string;
  zeroLine: string;
}

const themeColors = vue.computed<IThemeColors>(() => {
  const useLightMode = theme.useLightMode();

  return {
    background: useLightMode ? '#ffffff' : '#18181b', // --p-content-background
    text: useLightMode ? '#334155' : '#ffffff', // --p-text-color
    grid: useLightMode ? '#e2e8f0' : '#3f3f46', // --p-surface-200 / --p-surface-700
    minorGrid: useLightMode ? '#f1f5f9' : '#27272a', // --p-surface-100 / --p-surface-800
    zeroLine: useLightMode ? '#94a3b8' : '#71717a' // --p-surface-400 / --p-surface-500
  };
});

// Our traces' visibility, which we keep track of across data updates (e.g., while a simulation is running or when runs
// get tracked in interactive mode).

const traceVisibilityKey = (trace: IGraphPanelPlotTrace): string | undefined => {
  // Return a key that identifies the given trace across data updates, if possible.

  if (trace.traceId) {
    return `id::${trace.traceId}`;
  }

  if (trace.name && trace.xValue && trace.yValue) {
    return `expr::${trace.xValue}::${trace.yValue}::${trace.name}`;
  }

  return undefined;
};

const traceVisibilities = vue.shallowRef<boolean[]>([]);

vue.watch(
  () => props.data.traces,
  (traces: IGraphPanelPlotTrace[], oldTraces: IGraphPanelPlotTrace[] | undefined) => {
    // Keep the visibility of the traces that we already know about and make any new trace visible.

    const previousVisibilityByKey = new Map<string, boolean>();

    (oldTraces ?? []).forEach((trace: IGraphPanelPlotTrace, index: number) => {
      const key = traceVisibilityKey(trace);

      if (key) {
        previousVisibilityByKey.set(key, traceVisibilities.value[index] ?? true);
      }
    });

    traceVisibilities.value = traces.map((trace: IGraphPanelPlotTrace) => {
      const key = traceVisibilityKey(trace);

      return key ? (previousVisibilityByKey.get(key) ?? true) : true;
    });
  },
  { immediate: true }
);

// Our legend, which, like Plotly's, is to the right of our plotting area and lets the user toggle the visibility of a
// trace (by clicking on it) or isolate a trace (by double-clicking on it).
// Note: our legend lists our traces by increasing zorder (and then in the order in which they are given), while our
//       traces are drawn in the order in which they are given.

interface ILegendItem {
  index: number;
  color: string;
  name: string;
  visible: boolean;
  markers: boolean;
  zorder: number;
}

const legendItems = vue.computed<ILegendItem[]>(() => {
  const visibilities = traceVisibilities.value;

  return props.data.traces
    .map((trace: IGraphPanelPlotTrace, index: number) => ({
      index,
      color: trace.color,
      name: trace.name,
      visible: visibilities[index] ?? true,
      markers: hasMarkers(trace.x, trace.y),
      zorder: trace.zorder ?? DEFAULT_ZORDER
    }))
    .sort((item1: ILegendItem, item2: ILegendItem) => item1.zorder - item2.zorder || item1.index - item2.index);
});

// Our plotting area, which we use to position our legend.

interface IPlotRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const plotRect = vue.shallowRef<IPlotRect | undefined>();

const updatePlotRect = (u: uPlot): void => {
  // Keep track of our plotting area (in CSS pixels, relative to our container), which we use to position our legend.

  const pxRatio = dependencies._uPlot.pxRatio as number;
  const newPlotRect = {
    left: u.bbox.left / pxRatio,
    top: u.bbox.top / pxRatio,
    width: u.bbox.width / pxRatio,
    height: u.bbox.height / pxRatio
  };
  const oldPlotRect = plotRect.value;

  if (
    !oldPlotRect ||
    oldPlotRect.left !== newPlotRect.left ||
    oldPlotRect.top !== newPlotRect.top ||
    oldPlotRect.width !== newPlotRect.width ||
    oldPlotRect.height !== newPlotRect.height
  ) {
    plotRect.value = newPlotRect;
  }
};

// The position and width of our legend.

const legendLeft = vue.computed<number>(() => {
  // Our legend is to the right of our plotting area, with a small gap in between.

  const rect = plotRect.value;

  return rect ? rect.left + rect.width + LEGEND_LEFT_MARGIN : 0;
});

let legendWidth = 0;

const measureLegendWidth = (): number => {
  // Return the width of our legend, if it is shown.
  // Note: we round up its exact width rather than use its offsetWidth, which is rounded to the nearest integer (and
  //       could therefore be smaller than its exact width, in which case our legend would overflow our container).

  return props.showLegend ? Math.ceil(legendRef.value?.getBoundingClientRect().width ?? 0) : 0;
};

const syncLegendWidth = (): void => {
  // Get our plot to recompute its layout if the width of our legend has changed since it is part of our right margin.

  const newLegendWidth = measureLegendWidth();

  if (newLegendWidth !== legendWidth) {
    legendWidth = newLegendWidth;

    plot?.setSize({ width: plot.width, height: plot.height });
  }
};

// Trace visibility handling through our legend.

const setTraceVisibilities = (visibilities: boolean[]): void => {
  // Set the visibility of our traces, both in our legend and in our plot.
  // Note: uPlot autoranges our axes again when the visibility of a trace changes.

  traceVisibilities.value = visibilities;

  // Update the visibility of our traces in our plot, if needed.

  const currentPlot = plot;

  if (!currentPlot) {
    return;
  }

  currentPlot.batch(() => {
    visibilities.forEach((visible: boolean, index: number) => {
      const plotSeries = currentPlot.series[index + 1];

      if (plotSeries && plotSeries.show !== visible) {
        currentPlot.setSeries(index + 1, { show: visible });
      }
    });
  });
};

interface ILegendToggle {
  index: number;
  previousVisibility: boolean;
}

let lastLegendToggle: ILegendToggle | undefined;

const onLegendClick = (event: MouseEvent, index: number): void => {
  // Toggle the visibility of the clicked trace, unless this is the second click of a double-click (see
  // onLegendDoubleClick()).

  if (event.detail > 1) {
    return;
  }

  // Use a copy of our visibilities so that we can update all of them at once, which is more efficient than updating
  // them one by one.

  const visibilities = traceVisibilities.value.slice();

  lastLegendToggle = {
    index,
    previousVisibility: visibilities[index] ?? true
  };

  visibilities[index] = !lastLegendToggle.previousVisibility;

  setTraceVisibilities(visibilities);
};

const onLegendDoubleClick = (index: number): void => {
  // Like Plotly, isolate the double-clicked trace (i.e. hide all the other traces) or, if it is already the only
  // visible trace, show all the traces again.
  // Note: the first click of this double-click has already toggled the visibility of the clicked trace (see
  //       onLegendClick()), so we use the visibility that it had before that click. Otherwise, double-clicking the only
  //       visible trace would isolate it again rather than show all the traces again.

  const firstClickToggle = lastLegendToggle?.index === index ? lastLegendToggle : undefined;
  const visibilities = traceVisibilities.value;

  lastLegendToggle = undefined;

  // Collect the indices of visible traces, as they were before this double-click.

  const visibleIndices: number[] = [];

  for (let i = 0; i < visibilities.length; ++i) {
    if (i === index && firstClickToggle ? firstClickToggle.previousVisibility : visibilities[i]) {
      visibleIndices.push(i);
    }
  }

  // If the clicked trace is the only visible one, then show all our traces again. Otherwise, isolate the clicked trace.

  const isSoleVisible = visibleIndices.length === 1 && visibleIndices[0] === index;

  setTraceVisibilities(visibilities.map((_visible: boolean, i: number) => isSoleVisible || i === index));
};

// Context menu.

const contextMenuItems = vue.computed<MenuItem[]>(() => [
  {
    icon: 'pi pi-search-plus',
    label: 'Zoom In',
    disabled: true
  },
  {
    icon: 'pi pi-search-minus',
    label: 'Zoom Out',
    disabled: true
  },
  {
    icon: 'pi pi-refresh',
    label: 'Reset Zoom',
    disabled: true
  },
  {
    separator: true
  },
  {
    icon: 'pi pi-copy',
    label: 'Copy to Clipboard',
    disabled: true
  },
  {
    icon: 'pi pi-chart-line',
    label: 'Export Plot',
    disabled: true
  },
  {
    separator: true
  },
  {
    label: 'Export Data to CSV',
    icon: 'pi pi-download',
    command: () => exportToCsv()
  }
]);

const onContextMenu = (event: MouseEvent): void => {
  // Prevent the default context menu from being shown.

  event.preventDefault();

  // Dispatch a custom event to notify other instances of GraphPanelWidget that our context menu is being shown.
  // Note: this allows those other instances to hide their context menus if they are open, ensuring that only one
  //       context menu is open at any given time.

  window.dispatchEvent(
    new CustomEvent(CONTEXT_MENU_EVENT, {
      detail: {
        sourceId: instanceId
      }
    })
  );

  // Show our context menu.

  contextMenuRef.value?.show(event);
};

const exportToCsv = async (): Promise<void> => {
  // Make sure that we have at least one trace to export.

  const firstTrace = props.data.traces[0];

  if (!firstTrace) {
    return;
  }

  // Show the progress message.

  progressMessage.show('Exporting data to CSV...');

  let successfulExport: boolean = true;

  try {
    // Allow the UI to update before actually starting the export to CSV.
    // Note: we do this by waiting for two animation frames. The first wait lands just before the next paint while the
    //       second wait lands just after the next paint.

    await common.waitForNextAnimationFrame();
    await common.waitForNextAnimationFrame();

    // Perform the export itself.
    // Note: to efficiently export to CSV, we build an array of CSV lines and only join them together at the end. This is
    //       much more efficient than concatenating strings together repeatedly.

    const csvLines: string[] = [];

    // Headers.

    const allXValuesEqual = props.data.traces.every(
      (trace: IGraphPanelPlotTrace) => trace.xValue === firstTrace.xValue
    );
    const headerParts: string[] = [allXValuesEqual ? firstTrace.xValue : 'X'];

    for (const trace of props.data.traces) {
      headerParts.push(trace.name.replace(/<[^>]*>|,/g, '') || trace.yValue);
      // Note: we remove any HTML tags and commas to ensure the CSV is well-formed.
    }

    csvLines.push(headerParts.join(','));

    // Data rows: collect all unique X values and build value maps.

    const allXValues = new Set<number>();
    const traceMaps: Map<number, number>[] = [];

    for (const trace of props.data.traces) {
      const map = new Map<number, number>();

      for (let i = 0; i < trace.x.length; ++i) {
        const xValue = trace.x[i];
        const yValue = trace.y[i];

        if (xValue !== undefined && yValue !== undefined) {
          allXValues.add(xValue);

          map.set(xValue, yValue);
        }
      }

      traceMaps.push(map);
    }

    // Process the rows and update the progress message at regular intervals to keep the UI responsive.

    const sortedXValues = Array.from(allXValues).sort((a, b) => a - b);
    const chunkSize = Math.max(1, Math.floor(0.01 * sortedXValues.length));
    const percentPerRow = 100 / sortedXValues.length;
    let processedRows = 0;

    for (const sortedXValue of sortedXValues) {
      const rowParts: string[] = [String(sortedXValue)];

      for (let traceIndex = 0; traceIndex < props.data.traces.length; ++traceIndex) {
        const yValue = traceMaps[traceIndex].get(sortedXValue);

        rowParts.push(yValue !== undefined ? String(yValue) : '');
      }

      csvLines.push(rowParts.join(','));

      ++processedRows;

      if (processedRows % chunkSize === 0 || processedRows === sortedXValues.length) {
        progressMessage.update(Math.floor(percentPerRow * processedRows));

        await common.sleep(NO_DELAY);
      }
    }

    // Make sure that we show 100% before finishing.

    progressMessage.update(100);

    // Create and download the CSV file.

    common.downloadFile('data.csv', csvLines.join('\n'), 'text/csv;charset=utf-8;');
  } catch (error: unknown) {
    successfulExport = false;

    console.warn('OpenCOR: failed to export to CSV:', common.formatError(error));
  } finally {
    // Hide the progress message. If the export succeeded then delay briefly so that the user can see that we reached
    // 100%. Otherwise, hide immediately to avoid blocking the UI unnecessarily.

    if (successfulExport) {
      await common.sleep(LONG_DELAY);
    }

    progressMessage.hide();
  }
};

// Plotting.
// Note: we use uPlot's mode 2, i.e. each trace has its own X and Y values, which means that we can plot both time
//       series and phase plots.

type AxisKey = 'x' | 'y';
type Range = [number, number];

const seriesData = (u: uPlot, seriesIndex: number): [math.FloatArray, math.FloatArray] | undefined => {
  // Return the X and Y values of the given series.

  return (u.data as unknown as [null, ...[math.FloatArray, math.FloatArray][]])[seriesIndex] ?? undefined;
};

const hasMarkers = (xValues?: math.FloatArray, yValues?: math.FloatArray): boolean => {
  // Like Plotly, a trace with fewer than 20 points also has markers.

  const nbOfPoints = xValues && yValues ? Math.min(xValues.length, yValues.length) : 0;

  return nbOfPoints > 0 && nbOfPoints < MIN_NB_OF_POINTS_WITHOUT_MARKERS;
};

const seriesHasMarkers = (u: uPlot, seriesIndex: number): boolean => {
  // Return whether the given series has markers.

  const [xValues, yValues] = seriesData(u, seriesIndex) ?? [];

  return hasMarkers(xValues, yValues);
};

const anyMarkers = (u: uPlot): boolean => {
  // Return whether any of our visible traces has markers.

  for (let i = 1; i < u.series.length; ++i) {
    if (u.series[i]?.show && seriesHasMarkers(u, i)) {
      return true;
    }
  }

  return false;
};

const finiteDataRange = (u: uPlot, axisKey: AxisKey, seriesIndex?: number): Range | undefined => {
  // Determine the range of the (finite) values of our visible traces (or of the given trace) for the given axis.

  const facetIndex = axisKey === 'x' ? 0 : 1;
  const firstIndex = seriesIndex ?? 1;
  const lastIndex = seriesIndex ?? u.series.length - 1;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let i = firstIndex; i <= lastIndex; ++i) {
    const values = seriesData(u, i)?.[facetIndex];

    if (!values || !u.series[i]?.show) {
      continue;
    }

    for (let j = 0; j < values.length; ++j) {
      const value = values[j] as number;

      if (Number.isFinite(value)) {
        if (value < min) {
          min = value;
        }

        if (value > max) {
          max = value;
        }
      }
    }
  }

  return min <= max ? [min, max] : undefined;
};

interface IExtremum {
  value: number;
  padding: number; // In CSS pixels.
}

const autoRange = (u: uPlot, axisKey: AxisKey, min: number, max: number): Range => {
  // Autorange the given axis like Plotly, i.e. our X axis is tight while our Y axis is padded by 5% of its length on
  // both ends, and the points of a trace with markers are padded by 5% of the length of both axes plus some padding for
  // the markers themselves. This means that we have a minimum and a maximum extremum for our traces and for each trace
  // with markers, each extremum with its own padding. The range that we want is the one that fits all of those extrema,
  // i.e. the one that needs the most value per pixel.
  // Note: the minimum and maximum extrema of a trace with markers are also within the range of our traces, but they get
  //       padded more, so we consider them separately.

  // Make sure that our range is not zero-width, since uPlot can handle neither.

  if (min === max) {
    return [min - 1, max + 1];
  }

  // Determine the extrema of our traces and of our traces with markers, each with its own padding.

  const length = (axisKey === 'x' ? u.bbox.width : u.bbox.height) / (dependencies._uPlot.pxRatio as number);
  const padding = axisKey === 'y' ? AUTORANGE_PADDING * length : 0;
  const markersPadding = AUTORANGE_PADDING * length + MARKER_PADDING;
  const minExtrema: IExtremum[] = [{ value: min, padding }];
  const maxExtrema: IExtremum[] = [{ value: max, padding }];

  for (let i = 1; i < u.series.length; ++i) {
    if (u.series[i]?.show && seriesHasMarkers(u, i)) {
      const traceRange = finiteDataRange(u, axisKey, i);

      if (traceRange) {
        minExtrema.push({ value: traceRange[0], padding: markersPadding });
        maxExtrema.push({ value: traceRange[1], padding: markersPadding });
      }
    }
  }

  // Determine the range that fits all of our extrema, falling back to a tight range if there is not enough room for
  // our padding (e.g., if our axis is really short).

  let res: Range = [min, max];
  let maxValuePerPixel = 0;

  for (const minExtremum of minExtrema) {
    for (const maxExtremum of maxExtrema) {
      const valueRange = maxExtremum.value - minExtremum.value;
      const pixelRange = length - minExtremum.padding - maxExtremum.padding;

      if (valueRange > 0 && pixelRange > 0 && valueRange / pixelRange > maxValuePerPixel) {
        maxValuePerPixel = valueRange / pixelRange;
        res = [
          minExtremum.value - maxValuePerPixel * minExtremum.padding,
          maxExtremum.value + maxValuePerPixel * maxExtremum.padding
        ];
      }
    }
  }

  return res;
};

const lastAutoRanges: Partial<Record<AxisKey, Range>> = {};

const scaleRange = (axisKey: AxisKey): uPlot.Range.Function => {
  return (u: uPlot, dataMin: number | null, dataMax: number | null): Range => {
    // If a (finite) range was given for the axis, then we use it.

    const range = axisKey === 'x' ? props.data.xAxisRange : props.data.yAxisRange;

    if (range && Number.isFinite(range[0]) && Number.isFinite(range[1])) {
      // Make sure that the given range is in increasing order (e.g., if our ending point is before our starting point)
      // and has a non-zero width (e.g., if our starting and ending points are the same) since uPlot can handle neither.
      // Note: like Plotly, we widen a zero-width range by 1 or 1ppm, whichever is bigger.

      const min = Math.min(range[0], range[1]);
      const max = Math.max(range[0], range[1]);

      if (min === max) {
        const delta = Math.max(1, 1e-6 * Math.abs(min));

        return [min - delta, max + delta];
      }

      return [min, max];
    }

    // No range was given, so we use the range of our data.
    // Note: uPlot's range of our data may not be finite, e.g., if a trace starts with a NaN value (uPlot then never
    //       moves away from it) or has an infinite value. In that case, we determine the range of our data ourselves,
    //       ignoring non-finite values.

    let min = dataMin;
    let max = dataMax;

    if (min === null || max === null || !Number.isFinite(min) || !Number.isFinite(max)) {
      const finiteRange = finiteDataRange(u, axisKey);

      if (!finiteRange) {
        // No (finite) data, so if some of our traces are hidden (e.g., the user hid all of them using our legend), then
        // we keep our last autorange (so that the user sees the same view when showing some traces again). Otherwise,
        // we use Plotly's default range.

        const lastAutoRange = lastAutoRanges[axisKey];

        if (lastAutoRange && u.series.some((series: uPlot.Series, index: number) => index > 0 && !series.show)) {
          return [...lastAutoRange];
        }

        return axisKey === 'x' ? [...DEFAULT_X_RANGE] : [...DEFAULT_Y_RANGE];
      }

      [min, max] = finiteRange;
    }

    // Autorange our axis and keep track of it.
    // Note: we keep track of it here rather than rely on uPlot's scales since our plot may get recreated (e.g., when the
    //       theme changes) while all our traces are hidden.

    const res = autoRange(u, axisKey, min, max);

    lastAutoRanges[axisKey] = res;

    return [...res];
  };
};

// Number formatting like in Plotly (with its default 'B' exponent format, i.e. SI prefixes except for 10^9 which is B).

const MINUS_SIGN = '−';
const SI_PREFIXES = ['f', 'p', 'n', 'μ', 'm', '', 'k', 'M', 'G', 'T'];
const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

const beyondSI = (exponent: number): boolean => {
  // Return whether the given exponent is beyond our SI prefixes.

  return exponent > 14 || exponent < -15;
};

const separateThousands = (text: string): string => {
  // Separate the thousands of the given (positive) number, if it has some decimals or more than four digits.

  const [integerPart = '', decimalPart] = text.split('.');
  let res = integerPart;

  if (decimalPart !== undefined || integerPart.length > 4) {
    while (/(\d+)(\d{3})/.test(res)) {
      res = res.replace(/(\d+)(\d{3})/, '$1,$2');
    }
  }

  return decimalPart === undefined ? res : `${res}.${decimalPart}`;
};

interface INumberFormat {
  tickRound: number; // Number of digits after the decimal point.
  exponent: number; // Common exponent (of an SI prefix), if any.
}

const numberFormat = (dtick: number, maxEnd: number): INumberFormat => {
  // Determine the format of our tick labels from our tick spacing and from the end of our axis that is the furthest
  // away from zero.

  const rangeExponent = Math.floor(Math.log10(maxEnd) + 0.01);

  return {
    tickRound: 2 - Math.floor(Math.log10(dtick) + 0.01),
    exponent:
      Number.isFinite(rangeExponent) && Math.abs(rangeExponent) > 3
        ? beyondSI(rangeExponent)
          ? rangeExponent
          : 3 * Math.round((rangeExponent - 1) / 3)
        : 0
  };
};

const formatNumber = (value: number, format: INumberFormat): string => {
  // The value is not finite, so we just return it as a string (e.g., 'NaN' or 'Infinity').

  if (!Number.isFinite(value)) {
    return String(value);
  }

  // A number that is (almost) zero is formatted as zero.

  let absValue = Math.abs(value);
  let tickRound = format.tickRound;

  if (absValue < 10 ** -tickRound / 2) {
    return '0';
  }

  // Apply our exponent, if any.

  if (format.exponent) {
    absValue *= 10 ** -format.exponent;
    tickRound += format.exponent;
  }

  // Round our number and remove any trailing zeros.

  let res: string;

  if (tickRound === 0) {
    res = String(Math.round(absValue));
  } else if (tickRound < 0) {
    const magnitude = 10 ** -tickRound;

    res = String(Math.round(absValue / magnitude) * magnitude);
  } else {
    res = absValue.toFixed(Math.min(20, tickRound)).replace(/\.?0+$/, '');
  }

  // Determine whether our number is negative (we don't want to show a minus sign for zero).

  let isNegative = value < 0;

  if (res === '0') {
    isNegative = false;
  }

  // Separate our thousands and add our SI prefix or exponent, if any.

  res = separateThousands(res);

  if (format.exponent) {
    if (beyondSI(format.exponent)) {
      res += `×10${[...String(format.exponent)].map((character: string) => (character === '-' ? '⁻' : SUPERSCRIPT_DIGITS[Number(character)])).join('')}`;
    } else if (format.exponent === 9) {
      res += 'B';
    } else {
      res += SI_PREFIXES[format.exponent / 3 + 5] ?? '';
    }
  }

  // Add a minus sign if our number is negative.

  return isNegative ? MINUS_SIGN + res : res;
};

// Ticks, like Plotly, i.e. major ticks that are multiples of a "nice" spacing (which depends on the length of our axis)
// and minor ticks (only used for our minor grid lines) that split a major tick spacing in four or five. Unlike Plotly,
// though, we use fewer major ticks if their labels would otherwise overlap (Plotly rotates its X tick labels instead
// and lets its Y tick labels overlap).

interface IAxisTicks {
  format: INumberFormat;
  minorTicks: number[];
}

const axisTicks: Partial<Record<AxisKey, IAxisTicks>> = {};

const roundDTick = (roughDTick: number): number => {
  // Round the given rough tick spacing up to the next "nice" value, i.e. 2, 5, or 10 times a power of ten.

  const base = 10 ** Math.floor(Math.log10(roughDTick));
  const value = roughDTick / base;

  return base * ([2, 5, 10].find((niceValue: number) => niceValue > value) ?? 10);
};

const ticksBetween = (min: number, max: number, dtick: number): number[] => {
  // Return the multiples of the given tick spacing that are between the given minimum and maximum values.
  // Note #1: we round our ticks to 14 significant digits, so that they don't suffer from floating point errors (e.g.,
  //          0.30000000000000004 rather than 0.3).
  // Note #2: we count our ticks rather than increment our tick index since the latter may not change if it is big
  //          enough (e.g., with a tiny range far away from zero), in which case we would end up in an endless loop.

  const res: number[] = [];
  const tolerance = 1e-9 * dtick;
  const first = Math.ceil((min - tolerance) / dtick);
  const nbOfTicks = Math.min(Math.floor((max + tolerance) / dtick) - first + 1, MAX_NB_OF_TICKS);

  for (let i = 0; i < nbOfTicks; ++i) {
    res.push(Number.parseFloat(((first + i) * dtick).toPrecision(14)));
  }

  return res;
};

const isMultiple = (bigger: number, smaller: number): boolean => {
  // Return whether the given bigger number is (almost) a multiple of the given smaller number.

  return Math.abs(((bigger / smaller + 0.5) % 1) - 0.5) < 0.001;
};

const axisSplits = (axisKey: AxisKey): uPlot.Axis.Splits => {
  // Return a function that computes the splits (i.e. the positions of our major ticks) for the given axis.

  return (u: uPlot, _axisIndex: number, min: number, max: number): number[] => {
    // Major ticks, like Plotly, i.e. we aim for one tick every 80 (X axis) or 40 (Y axis) pixels with at least four and
    // at most nine tick spacings.

    const length = (axisKey === 'x' ? u.bbox.width : u.bbox.height) / (dependencies._uPlot.pxRatio as number);
    const minSpacing = axisKey === 'x' ? MAJOR_TICK_MIN_X_SPACING : MAJOR_TICK_MIN_Y_SPACING;
    const nbOfTicks = Math.min(Math.max(length / minSpacing, 4), 9) + 1;
    const range = Math.abs(max - min);
    const maxEnd = Math.max(Math.abs(min), Math.abs(max));
    let dtick = roundDTick(range / nbOfTicks);

    // Make sure that our tick spacing is valid, i.e. that our range is neither too small (e.g., a subnormal range, in
    // which case our tick spacing would be zero) nor too big (e.g., a range that overflows, in which case our tick
    // spacing would be infinite).

    if (!(dtick > 0 && Number.isFinite(dtick))) {
      axisTicks[axisKey] = {
        format: { tickRound: 0, exponent: 0 },
        minorTicks: []
      };

      return [];
    }

    let ticks = ticksBetween(min, max, dtick);
    let format = numberFormat(dtick, maxEnd);

    // Make sure that our tick labels don't overlap by increasing our tick spacing (to the next "nice" value) for as long
    // as they would.
    // Note: this always ends since we end up with at most one tick once our tick spacing is bigger than our range.

    const tickLabelSize = (): number => {
      // Return the size of our biggest tick label along our axis, i.e. its width for our X axis and its height for our Y
      // axis.

      if (axisKey === 'y') {
        return TICK_FONT_SIZE;
      }

      let res = 0;

      for (const tick of ticks) {
        res = Math.max(res, textWidth(formatNumber(tick, format), tickFont));
      }

      return res;
    };

    while (ticks.length > 1 && (length * dtick) / range < tickLabelSize() + TICK_LABEL_MIN_SPACING) {
      dtick = roundDTick(dtick);
      ticks = ticksBetween(min, max, dtick);
      format = numberFormat(dtick, maxEnd);
    }

    // Minor ticks, like Plotly, i.e. we aim for five minor tick spacings per major tick spacing, making sure that our
    // major tick spacing is a multiple of our minor tick spacing.

    let minorDtick = roundDTick((0.99 * dtick) / NB_OF_MINOR_TICKS);

    if (!isMultiple(dtick, minorDtick)) {
      minorDtick = Math.abs(dtick / minorDtick - 2.5) < 0.001 * 2.5 ? dtick / 2 : dtick;
    }

    // Keep track of the format of our tick labels and of our minor ticks (excluding those that are also major ticks).

    axisTicks[axisKey] = {
      format,
      minorTicks:
        minorDtick < dtick
          ? ticksBetween(min, max, minorDtick).filter((tick: number) => !isMultiple(Math.abs(tick) || dtick, dtick))
          : []
    };

    // Return our major ticks.

    return ticks;
  };
};

const axisValues = (axisKey: AxisKey): uPlot.Axis.Values => {
  // Return a function that formats the tick labels for the given axis.

  return (u: uPlot, splits: number[]): string[] => {
    // Format our tick labels.
    // Note: our splits are computed (see axisSplits()) before our tick labels, so our format is up to date.

    const format = axisTicks[axisKey]?.format ?? { tickRound: 0, exponent: 0 };
    const plotTop = u.bbox.top / (dependencies._uPlot.pxRatio as number);

    return splits.map((split: number) => {
      // Like Plotly, hide a Y tick label that would (partly) be above our container.

      if (axisKey === 'y' && plotTop + u.valToPos(split, 'y') < TICK_LABEL_HALF_HEIGHT) {
        return '';
      }

      return formatNumber(split, format);
    });
  };
};

// Text measuring, which we use to make sure that our X tick labels don't overlap and to size our Y axis.

const tickFont = `${TICK_FONT_SIZE}px ${FONT_FAMILY}`;
let measureContext: CanvasRenderingContext2D | null | undefined;

const textWidth = (text: string, font: string): number => {
  // Return the width (in CSS pixels) of the given text using the given font.

  measureContext ??= document.createElement('canvas').getContext('2d');

  if (!measureContext) {
    return 0;
  }

  measureContext.font = font;

  return measureContext.measureText(text).width;
};

// Our Y axis size.

let naturalYAxisSize = 0;

const yAxisTitleSize = (): number => {
  // Return the size of our Y axis title, if any.

  return props.data.yAxisTitle ? Y_AXIS_TITLE_SIZE : 0;
};

const yAxisSize = (_u: uPlot, values: string[] | null): number => {
  // Size our Y axis (without its title) based on the width of its widest tick label or, if we are given some shared
  // margins, based on the shared left margin (but never less than what we need).

  let maxWidth = 0;

  for (const value of values ?? []) {
    maxWidth = Math.max(maxWidth, textWidth(value, tickFont));
  }

  naturalYAxisSize = Math.ceil(maxWidth + Y_AXIS_EXTRA_SIZE);

  return props.margins ? Math.max(naturalYAxisSize, props.margins.left - yAxisTitleSize()) : naturalYAxisSize;
};

// Right margin, which we use to make sure that our legend and last X tick label are not cut off.

interface IAxisInternals {
  _values?: (string | number | null)[];
}

const legendRightMargin = (): number => {
  // Return the right margin needed by our legend (if any), with a margin on both sides of it (see legendLeft).
  // Note: this is our natural right margin, i.e. the right margin that we share with our sibling panels (see
  //       updateMarginsAsync()).

  return legendWidth ? Math.ceil(LEGEND_LEFT_MARGIN + legendWidth + LEGEND_RIGHT_MARGIN) : 0;
};

const rightMargin = (u: uPlot): number => {
  // Our right margin must leave room for our legend (or, if we are given some shared margins, for the shared right
  // margin) and for half our last X tick label (since it is centred on its tick), with a margin on its right side.
  // Note #1: our legend is to the right of our plotting area and no taller than it while our last X tick label is below
  //          our plotting area, so they can't overlap and our right margin only needs to fit the wider of the two.
  //          In practice, our last X tick label only matters when we don't have a legend (e.g., in the standard view
  //          or if we have no traces) since our legend is otherwise always wider than half our last X tick label.
  //          Also, unlike our legend, our last X tick label is not part of our shared right margin (see
  //          updateMarginsAsync()).
  // Note #2: uPlot computes our tick labels (see axisValues()) before our padding, so our last X tick label is up to
  //          date.

  const xValues = (u.axes[0] as unknown as IAxisInternals | undefined)?._values;
  const lastXValue = xValues?.[xValues.length - 1];
  const legendSize = props.margins ? Math.max(legendRightMargin(), props.margins.right) : legendRightMargin();
  const lastXTickLabelSize = lastXValue ? 0.5 * textWidth(String(lastXValue), tickFont) + LEGEND_RIGHT_MARGIN : 0;

  return Math.ceil(Math.max(legendSize, lastXTickLabelSize));
};

// Update our margins asynchronously, i.e. after our plot has been laid out and we know how much space it needs for its
// axes and legend. This allows us to share our margins with other instances of GraphPanelWidget, so that they can align
// their plots with ours.
// Note #1: we emit our natural margins (i.e. the margins that we need) whenever they change, and get given some shared
//          margins (i.e. the biggest natural margins of all our sibling panels), which we then use (see yAxisSize() and
//          rightMargin()).
// Note #2: our natural margins must not depend on our shared margins, or our sibling panels could keep adjusting to
//          each other's margins. Our natural left margin depends on our Y tick labels, i.e. on the height of our
//          plotting area, which doesn't depend on our shared margins. However, our last X tick label depends on our X
//          ticks, i.e. on the width of our plotting area, which does depend on our shared margins. So, our natural
//          right margin only accounts for our legend (see legendRightMargin()) and each panel makes room for its own
//          last X tick label (see rightMargin()). The (unlikely) cost is that a panel which last X tick label needs
//          more room than our shared right margin has a narrower plotting area than its sibling panels.

const sameMargins = (
  firstMargins: IGraphPanelMargins | undefined,
  secondMargins: IGraphPanelMargins | undefined
): boolean => {
  return (
    firstMargins !== undefined &&
    secondMargins !== undefined &&
    firstMargins.left === secondMargins.left &&
    firstMargins.right === secondMargins.right
  );
};

const updateMarginsAsync = (): void => {
  // Coalesce multiple margin update requests into a single microtask.
  // Note: we use a microtask rather than an animation frame, so that our sibling panels (and ourselves) get relaid out
  //       using our new shared margins before the browser gets to paint us (e.g., while being resized). Otherwise, our
  //       sibling panels would be misaligned for one frame, i.e. they would flicker.

  if (marginsUpdatePending) {
    return;
  }

  marginsUpdatePending = true;

  queueMicrotask(() => {
    marginsUpdatePending = false;

    // Make sure that we have a plot and that it can be shown.

    if (!plot || isUnmounted || isPlotOutdated) {
      return;
    }

    // Emit our natural margins if they have changed.
    // Note: our natural right margin only accounts for our legend (see legendRightMargin()).

    const newMargins = {
      left: naturalYAxisSize + yAxisTitleSize(),
      right: legendRightMargin()
    };

    if (!sameMargins(newMargins, trackedMargins)) {
      trackedMargins = newMargins;

      emit('marginsUpdated', newMargins);
    }
  });
};

// Grid lines.

const lineWidth = (): number => {
  // Return the width (in canvas pixels) of a one (CSS) pixel wide line.
  // Note: we make sure that it is at least one canvas pixel wide (e.g., if our page is zoomed out a lot) since a canvas
  //       ignores a line width of zero, i.e. it would use whatever line width was used last.

  return Math.max(1, Math.round(dependencies._uPlot.pxRatio as number));
};

const drawLine = (context: CanvasRenderingContext2D, horizontal: boolean, pos: number, u: uPlot): void => {
  // Draw a crisp, one (CSS) pixel wide line across our plotting area at the given position (in canvas pixels), if it is
  // within our plotting area.

  const { left, top, width, height } = u.bbox;
  const alignedPos = Math.round(pos) + 0.5 * (lineWidth() % 2);

  if (horizontal) {
    if (alignedPos >= top && alignedPos <= top + height) {
      context.moveTo(left, alignedPos);
      context.lineTo(left + width, alignedPos);
    }
  } else if (alignedPos >= left && alignedPos <= left + width) {
    context.moveTo(alignedPos, top);
    context.lineTo(alignedPos, top + height);
  }
};

const drawLines = (u: uPlot, color: string, xValues: number[], yValues: number[]): void => {
  // Draw vertical lines at the given X values and horizontal lines at the given Y values using the given color.
  // Note: uPlot caches the state of its context, so we must restore it once we are done.

  const context = u.ctx;

  context.save();

  context.strokeStyle = color;
  context.lineWidth = lineWidth();

  context.beginPath();

  for (const xValue of xValues) {
    drawLine(context, false, u.valToPos(xValue, 'x', true), u);
  }

  for (const yValue of yValues) {
    drawLine(context, true, u.valToPos(yValue, 'y', true), u);
  }

  context.stroke();
  context.restore();
};

const drawZeroLines = (u: uPlot): void => {
  // Like Plotly, draw our zero lines.
  // Note: this gets called after uPlot draws our (major) grid lines and before it draws our traces.

  drawLines(u, themeColors.value.zeroLine, [0], [0]);
};

const drawMinorGrid = (u: uPlot): void => {
  // Draw our minor grid lines.
  // Note: this gets called before uPlot draws our (major) grid lines, so that the latter are drawn on top of the
  //       former.

  drawLines(u, themeColors.value.minorGrid, axisTicks.x?.minorTicks ?? [], axisTicks.y?.minorTicks ?? []);
};

const linearPaths: uPlot.Series.PathBuilder = (u: uPlot, seriesIndex: number, index0: number, index1: number) => {
  // uPlot doesn't support unsorted X values (e.g., phase plots) and draws each (device) pixel column of a dense trace
  // as a vertical line, which makes the steep parts of a trace look jagged. So, we use our own linear path builder
  // instead.
  // Note #1: for each set of consecutive points that are in the same (device) pixel column, we only draw its first,
  //          minimum, maximum, and last points, in their original order and at their exact position (skipping any of
  //          them that is at the same position as the point drawn before it). This means that a smooth trace is drawn
  //          as-is while the number of segments that we draw (and therefore the time it takes to draw them) is limited
  //          to four per set of consecutive points in a pixel column (e.g., with noisy data).
  // Note #2: we only ever look at consecutive points, so this works whether or not our X values are sorted.
  // Note #3: we break our path at non-finite values, so that a gap in the data is drawn as a gap in the trace.

  const [xValues, yValues] = seriesData(u, seriesIndex) ?? [];
  const xMin = u.scales.x?.min;
  const xMax = u.scales.x?.max;
  const yMin = u.scales.y?.min;
  const yMax = u.scales.y?.max;
  const stroke = new Path2D();

  if (xValues && yValues && xMin != null && xMax != null && yMin != null && yMax != null) {
    const { left, top, width, height } = u.bbox;
    const xFactor = width / (xMax - xMin);
    const yFactor = height / (yMax - yMin);
    const bottom = top + height;
    const end = Math.min(index1, xValues.length - 1, yValues.length - 1);
    let penDown = false;
    let column = Number.NaN;
    let firstIndex = -1;
    let firstXPos = 0;
    let firstYPos = 0;
    let minIndex = -1;
    let minXPos = 0;
    let minYPos = 0;
    let maxIndex = -1;
    let maxXPos = 0;
    let maxYPos = 0;
    let lastIndex = -1;
    let lastXPos = 0;
    let lastYPos = 0;

    const drawColumn = (): void => {
      // Draw the minimum and maximum points of our current column (in their original order) unless they are its first
      // point (which we have already drawn) or its last point (which we draw last), and skipping any point that is at
      // the same position as the point drawn before it (since it would result in a zero-length segment).

      // If we don't have a first point, then we don't have a column to draw.

      if (firstIndex === -1) {
        return;
      }

      // Draw the minimum and maximum points of our current column in their original order.

      let drawnXPos = firstXPos;
      let drawnYPos = firstYPos;

      const drawTo = (xPos: number, yPos: number): void => {
        if (xPos !== drawnXPos || yPos !== drawnYPos) {
          stroke.lineTo(xPos, yPos);

          drawnXPos = xPos;
          drawnYPos = yPos;
        }
      };

      const drawPoint = (index: number, xPos: number, yPos: number): void => {
        if (index !== firstIndex && index !== lastIndex) {
          drawTo(xPos, yPos);
        }
      };

      if (minIndex < maxIndex) {
        drawPoint(minIndex, minXPos, minYPos);
        drawPoint(maxIndex, maxXPos, maxYPos);
      } else {
        drawPoint(maxIndex, maxXPos, maxYPos);
        drawPoint(minIndex, minXPos, minYPos);
      }

      // Draw the last point of our current column.

      if (lastIndex !== firstIndex) {
        drawTo(lastXPos, lastYPos);
      }

      // Reset our state so that we start a new column with the next point.

      firstIndex = -1;
    };

    // Process each point in our trace.

    for (let i = index0; i <= end; ++i) {
      // Make sure that our point has finite X and Y values.

      const x = xValues[i] as number;
      const y = yValues[i] as number;

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        // Either our X or Y value is not finite, so draw our previous column, if any.

        drawColumn();

        // Reset our state so that we start a new column with the next point.

        penDown = false;
        column = Number.NaN;

        continue;
      }

      // Convert our point to device coordinates.

      const xPos = left + (x - xMin) * xFactor;
      const yPos = bottom - (y - yMin) * yFactor;
      const xPixel = Math.round(xPos);

      // If our point is in a different (device) pixel column than the previous point, then draw the previous column and
      // start a new one.

      if (xPixel !== column) {
        // Draw our previous column, if any.

        drawColumn();

        // Draw our current point.

        if (penDown) {
          stroke.lineTo(xPos, yPos);
        } else {
          stroke.moveTo(xPos, yPos);

          penDown = true;
        }

        // Start a new column.

        column = xPixel;
        firstIndex = minIndex = maxIndex = lastIndex = i;
        firstXPos = minXPos = maxXPos = lastXPos = xPos;
        firstYPos = minYPos = maxYPos = lastYPos = yPos;

        continue;
      }

      // We are in the same column, so update our minimum and maximum points if needed.

      if (yPos < minYPos) {
        minIndex = i;
        minXPos = xPos;
        minYPos = yPos;
      } else if (yPos > maxYPos) {
        maxIndex = i;
        maxXPos = xPos;
        maxYPos = yPos;
      }

      // Update our last point to be our current point.

      lastIndex = i;
      lastXPos = xPos;
      lastYPos = yPos;
    }

    drawColumn();
  }

  return { stroke, fill: null, clip: null, flags: 0 };
};

const markerPaths: uPlot.Series.Points.PathBuilder = (u: uPlot, seriesIndex: number) => {
  // Like Plotly, draw a marker for each point of our trace that has finite X and Y values, clipping our markers to our
  // plotting area.
  // Note: uPlot's markers path builder draws all the points of our trace in mode 2 (rather than only those that are in
  //       our plotting area, as in mode 1) and doesn't clip our markers to our plotting area, hence we use our own.

  const [xValues, yValues] = seriesData(u, seriesIndex) ?? [];
  const fill = new Path2D();
  const clip = new Path2D();
  const { left, top, width, height } = u.bbox;

  clip.rect(left, top, width, height);

  if (xValues && yValues) {
    const radius = 0.5 * MARKER_SIZE * (dependencies._uPlot.pxRatio as number);
    const nbOfPoints = Math.min(xValues.length, yValues.length);

    for (let i = 0; i < nbOfPoints; ++i) {
      const x = xValues[i] as number;
      const y = yValues[i] as number;

      if (Number.isFinite(x) && Number.isFinite(y)) {
        const xPos = u.valToPos(x, 'x', true);
        const yPos = u.valToPos(y, 'y', true);

        fill.moveTo(xPos + radius, yPos);
        fill.arc(xPos, yPos, radius, 0, 2 * Math.PI);
      }
    }
  }

  return { stroke: null, fill, clip, flags: 0 };
};

const setPlotSize = (u: uPlot, width: number, height: number): void => {
  // Set the size of our plot.
  // Note: if some of our visible traces have markers, then our autorange depends on the length of our axes (since the
  //       padding for markers is in pixels), so we need to autorange our axes again, which we do by resetting our data.

  u.batch(() => {
    u.setSize({ width, height });

    if (anyMarkers(u)) {
      u.setData(u.data);
    }
  });
};

const plotData = (): uPlot.AlignedData => {
  // The data to be plotted.
  // Note: uPlot needs at least one series, hence we use an empty one if we have no traces.

  const traces = props.data.traces;

  return [
    null,
    ...(traces.length
      ? traces.map((trace: IGraphPanelPlotTrace) => [trace.x, trace.y])
      : [[common.EMPTY_FLOAT64_ARRAY, common.EMPTY_FLOAT64_ARRAY]])
  ] as unknown as uPlot.AlignedData;
};

const createPlot = (width: number, height: number): void => {
  // Destroy any existing plot before creating a new one.

  plot?.destroy();

  // Create a series for each trace, using the trace's color for the stroke, our linear path builder, and our markers
  // path builder (for traces with markers).

  const series: uPlot.Series[] = [{}];

  for (let i = 0; i < Math.max(1, props.data.traces.length); ++i) {
    series.push({
      show: traceVisibilities.value[i] ?? true,
      stroke: (_plot: uPlot, seriesIndex: number) => props.data.traces[seriesIndex - 1]?.color ?? 'transparent',
      width: LINE_WIDTH,
      paths: linearPaths,
      points: {
        show: (u: uPlot, seriesIndex: number) => seriesHasMarkers(u, seriesIndex),
        paths: markerPaths,
        size: MARKER_SIZE,
        width: 0 // Note: this means that our markers are filled using the trace's color.
      },
      facets: [
        { scale: 'x', auto: true },
        { scale: 'y', auto: true }
      ]
    } as uPlot.Series);
  }

  // Create our plot.

  const colors = themeColors.value;
  const axis: uPlot.Axis = {
    stroke: colors.text,
    font: tickFont,
    labelFont: `${TITLE_FONT_SIZE}px ${FONT_FAMILY}`,
    labelGap: 0,
    gap: TICK_LABEL_GAP,
    space: 1,
    ticks: { show: false },
    grid: { stroke: colors.grid, width: 1 }
  };

  plot = new dependencies._uPlot(
    {
      mode: 2,
      width,
      height,
      padding: [0, rightMargin, 0, 0],
      legend: { show: false },
      cursor: { show: false },
      scales: {
        x: { time: false, range: scaleRange('x') },
        y: { range: scaleRange('y') }
      },
      // Note: our axis titles may contain some basic HTML (e.g., "<i>I<sub>K,r</sub></i>") while uPlot can only render
      //       plain text, so we render them ourselves (see our template), where uPlot would have rendered them. We
      //       still give uPlot an empty label for an axis that has a title, so that it reserves some space for it.
      axes: [
        {
          ...axis,
          scale: 'x',
          side: 2,
          size: props.data.xAxisTitle ? X_AXIS_SIZE_WITH_TITLE : X_AXIS_SIZE_WITHOUT_TITLE,
          label: props.data.xAxisTitle ? '' : undefined,
          labelSize: X_AXIS_TITLE_SIZE,
          splits: axisSplits('x'),
          values: axisValues('x')
        },
        {
          ...axis,
          scale: 'y',
          side: 3,
          size: yAxisSize,
          label: props.data.yAxisTitle ? '' : undefined,
          labelSize: Y_AXIS_TITLE_SIZE,
          labelGap: Y_AXIS_TITLE_GAP,
          splits: axisSplits('y'),
          values: axisValues('y')
        }
      ],
      series,
      hooks: {
        draw: [
          (u: uPlot) => {
            updatePlotRect(u);
            updateMarginsAsync();
          }
        ],
        drawAxes: [drawZeroLines],
        drawClear: [drawMinorGrid],
        setSize: [
          (u: uPlot) => {
            // Make sure that our plotting area is at least one pixel wide and high (e.g., if our container is narrower
            // than our Y axis).
            // Note: uPlot doesn't prevent its plotting area from having a negative size, in which case it would render
            //       our plot mirrored. This hook gets called after our plotting area has been laid out and before our
            //       plot gets drawn, so we can check the size of our plotting area here.

            const pxRatio = dependencies._uPlot.pxRatio as number;
            const plotWidth = u.bbox.width / pxRatio;
            const plotHeight = u.bbox.height / pxRatio;

            if (plotWidth >= 1 && plotHeight >= 1) {
              return;
            }

            // Enlarge our plot so that its plotting area is at least one pixel wide and high with whatever doesn't fit
            // in our container getting clipped.
            // Note #1: we can't enlarge our plot straight away since uPlot is in the middle of updating it, in which
            //          case it would only partly take our new size into account. So, we enlarge our plot once uPlot is
            //          done with its update, i.e. in a microtask, which also means that the mirrored plot that uPlot is
            //          about to draw gets redrawn before the browser gets to paint it.
            // Note #2: we check that our plot is still the same one as when this hook was called since it could have
            //          been destroyed (and possibly replaced) in the meantime.
            // Note #3: we only ever enlarge our plot here, so that we can't end up in an endless loop.

            const width = Math.ceil(u.width + Math.max(0, 1 - plotWidth));
            const height = Math.ceil(u.height + Math.max(0, 1 - plotHeight));

            queueMicrotask(() => {
              if (plot === u) {
                setPlotSize(u, width, height);
              }
            });
          }
        ]
      }
    } as uPlot.Options,
    plotData(),
    plotDivRef.value as HTMLElement
  ) as uPlot;
};

const updatePlot = (): void => {
  // Make sure that we haven't been unmounted (e.g., if this was scheduled using vue.nextTick() just before we got
  // unmounted) and that we can be shown (e.g., we can't if we are in a hidden file tab, in which case we will be
  // updated once we can be shown, see doResize()).

  const mainDiv = mainDivRef.value;

  if (isUnmounted || !mainDiv || !plotDivRef.value) {
    return;
  }

  // Make sure that we have a valid size.

  const width = mainDiv.clientWidth;
  const height = mainDiv.clientHeight;

  if (width <= 0 || height <= 0) {
    isPlotOutdated = true;

    return;
  }

  isPlotOutdated = false;

  // Create or update our plot.
  // Note: we only (re)create our plot if needed since it is much cheaper to update its data.

  const signature = `${props.data.traces.length}::${props.data.xAxisTitle ?? ''}::${props.data.yAxisTitle ?? ''}::${theme.useLightMode()}`;
  const newLegendWidth = measureLegendWidth();
  const legendWidthChanged = newLegendWidth !== legendWidth;

  legendWidth = newLegendWidth;

  if (!plot || signature !== plotSignature) {
    // We don't yet have a plot or the signature of our plot has changed, so create a new plot.

    plotSignature = signature;

    createPlot(width, height);
  } else {
    // We already have a plot and its signature hasn't changed, so update the visibility of its series (since our traces
    // may be different ones, e.g., when runs get tracked in interactive mode), its data, and its size (or layout, if the
    // width of our legend has changed since it is part of our right margin), if needed.

    const currentPlot = plot;

    currentPlot.batch(() => {
      for (let i = 1; i < currentPlot.series.length; ++i) {
        const plotSeries = currentPlot.series[i];

        if (plotSeries) {
          plotSeries.show = traceVisibilities.value[i - 1] ?? true;
        }
      }

      currentPlot.setData(plotData());

      if (currentPlot.width !== width || currentPlot.height !== height || legendWidthChanged) {
        currentPlot.setSize({ width, height });
      }
    });
  }
};

// Context menu handling.

const handleContextMenu = (event: Event): void => {
  // Hide our context menu if the event was dispatched by another instance of GraphPanelWidget.
  // Note: this ensures that only one context menu is open at any given time.

  const detail = (event as CustomEvent<{ sourceId?: symbol }>)?.detail;

  if (!detail || detail.sourceId === instanceId) {
    return;
  }

  contextMenuRef.value?.hide?.();
};

// Vue lifecycle hooks.

vue.onMounted(() => {
  // Listen for the custom event that is dispatched when another instance of GraphPanelWidget shows its context menu.

  window.addEventListener(CONTEXT_MENU_EVENT, handleContextMenu);

  // Start tracking the size of our container so that we can update our plot when it changes.
  // Note #1: we pass a getter (i.e. mainDivRef.value) rather than our ref (i.e. mainDivRef) since VueUse uses its own
  //          version of Vue's types, which are not compatible with ours.
  // Note #2: we resize our plot straight away rather than on the next animation frame. Indeed, a resize observer gets
  //          notified after layout but before paint, and uPlot (and Vue) update our plot (and legend) in a microtask,
  //          i.e. before paint too. So, our resized plot gets painted in the same frame as our resized container. This
  //          wouldn't be the case if we were to resize our plot on the next animation frame, in which case our plot
  //          (and legend) would be painted at their old size and position for one frame, i.e. they would flicker. Also,
  //          there is no need to coalesce our resizes since a resize observer gets notified at most once per frame.

  const { stop: stopContainer } = vueusecore.useResizeObserver(
    () => mainDivRef.value,
    () => {
      doResize();
    },
    {
      box: 'border-box'
    }
  );

  stopTrackingContainerSize = stopContainer;

  // Start tracking the size of our legend so that we can update the layout of our plot when its width changes since it
  // is part of our right margin.
  // Note: its width can change without our data changing, e.g., when our legend becomes scrollable (or stops being
  //       scrollable) as a result of our plot being resized, in which case it may get a (classic) scrollbar.

  const { stop: stopLegend } = vueusecore.useResizeObserver(
    () => legendRef.value,
    () => {
      syncLegendWidth();
    },
    {
      box: 'border-box'
    }
  );

  stopTrackingLegendSize = stopLegend;
});

vue.onBeforeUnmount(() => {
  // Make sure that we don't do anything else after we are unmounted.

  isUnmounted = true;

  // Destroy our plot, if any.

  plot?.destroy();

  plot = undefined;
});

vue.onUnmounted(() => {
  // Stop listening for the custom event that is dispatched when another instance of GraphPanelWidget shows its context
  // menu.

  window.removeEventListener(CONTEXT_MENU_EVENT, handleContextMenu);

  stopTrackingContainerSize?.();
  stopTrackingLegendSize?.();
});

// Update our plot when the data changes.

vue.watch(
  () => props.data,
  () => {
    vue.nextTick(() => {
      updatePlot();
    });
  },
  { immediate: true }
);

// Update the layout of our plot when our shared margins change.

vue.watch(
  () => props.margins,
  (newMargins: IGraphPanelMargins | undefined, oldMargins: IGraphPanelMargins | undefined) => {
    // Nothing to do if our margins haven't actually changed (e.g., if we were given a new object with the same values).

    if (sameMargins(newMargins, oldMargins)) {
      return;
    }

    vue.nextTick(() => {
      plot?.setSize({ width: plot.width, height: plot.height });

      // If we are not given shared margins anymore, then emit our margins again (since they may be needed to compute
      // new shared margins).

      if (!props.margins) {
        resetMargins();
      }
    });
  }
);

// Update the layout of our plot when our legend gets shown or hidden.

vue.watch(
  () => props.showLegend,
  () => {
    vue.nextTick(() => {
      syncLegendWidth();
    });
  }
);

// Update our plot when the theme changes.

vue.watch(
  () => theme.useLightMode(),
  () => {
    vue.nextTick(() => {
      updatePlot();
    });
  }
);
</script>

<style scoped>
  .axis-title {
    position: absolute;
    line-height: 1;
    white-space: nowrap;
    pointer-events: none;
    user-select: none;
  }

  .axis-title :deep(sub),
  .axis-title :deep(sup),
  .legend :deep(sub),
  .legend :deep(sup) {
    position: static;
  }

  .axis-title :deep(sub),
  .axis-title :deep(sup),
  .hover-name :deep(sub),
  .hover-name :deep(sup) {
    font-size: 80%;
  }

  .legend :deep(sub),
  .legend :deep(sup) {
    font-size: 70%;
  }

  .axis-title :deep(sub),
  .legend :deep(sub) {
    vertical-align: sub;
  }

  .axis-title :deep(sup),
  .legend :deep(sup) {
    vertical-align: super;
  }

  .legend {
    position: absolute;
    z-index: 2;
    padding: 5px 0;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #808ba4 transparent;
    user-select: none;
  }

  .legend-item {
    position: relative;
    min-height: 19px;
    padding: 0 5px 0 40px;
    line-height: 19px;
    white-space: nowrap;
    cursor: pointer;
  }

  .legend-item-hidden {
    opacity: 0.5;
  }

  .legend-marker {
    position: absolute;
    top: -2px;
    left: 12px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: inherit;
  }

  .legend-swatch {
    position: absolute;
    top: 8.5px;
    left: 5px;
    width: 30px;
    height: 2px;
  }
</style>
