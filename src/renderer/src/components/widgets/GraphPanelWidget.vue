<template>
  <div ref="rootRef" class="flex flex-row h-full">
    <div v-if="showMarker" class="w-0.75 bg-primary" />
    <div ref="mainDivRef" class="grow h-full min-w-0 relative overflow-hidden" :style="{ backgroundColor: themeColors.background }"
      @contextmenu="onContextMenu"
    >
      <div ref="plotDivRef" class="absolute inset-0" />
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

defineEmits<{
  marginsUpdated: [newMargins: IGraphPanelMargins];
}>();

const queueResize = (): void => {
  // Make sure that we don't queue multiple resizes at the same time.

  if (resizeRafId !== undefined) {
    return;
  }

  // Queue a resize to be performed on the next animation frame.

  resizeRafId = requestAnimationFrame(() => {
    resizeRafId = undefined;

    // Make sure that we still have a valid size.

    const width = mainDivRef.value?.clientWidth || 0;
    const height = mainDivRef.value?.clientHeight || 0;

    if (width <= 0 || height <= 0) {
      return;
    }

    // Update our plot or its size, if needed.

    if (!plot || isPlotOutdated) {
      updatePlot();
    } else if (plot.width !== width || plot.height !== height) {
      plot.setSize({ width, height });
    }
  });
};

const resize = (): Promise<unknown> => {
  // Queue a resize to be performed on the next animation frame.

  queueResize();

  return Promise.resolve();
};

const resetMargins = (): void => {
  // Note: we don't share our margins with sibling panels yet, so there is nothing to reset.
};

defineExpose({
  resetMargins,
  resize
});

const instanceId = Symbol('GraphPanelWidget');
const rootRef = vue.shallowRef<HTMLElement | null>(null);
const mainDivRef = vue.shallowRef<HTMLElement | null>(null);
const plotDivRef = vue.shallowRef<HTMLElement | null>(null);
const theme = vueCommon.useTheme();
const contextMenuRef = vue.ref<InstanceType<typeof ContextMenu> | null>(null);
const appendTarget = vueCommon.useAppendTarget(rootRef);
const progressMessage = useOpenCORProgressMessage();
let plot: uPlot | undefined;
let plotSignature: string | undefined;
let isPlotOutdated = false;
let isUnmounted = false;
let stopTrackingContainerSize: (() => void) | undefined;
let resizeRafId: number | undefined;

// Our theme.

interface IThemeColors {
  background: string;
  text: string;
  grid: string;
}

const themeColors = vue.computed<IThemeColors>(() => {
  const useLightMode = theme.useLightMode();

  return {
    background: useLightMode ? '#ffffff' : '#18181b', // --p-content-background
    text: useLightMode ? '#334155' : '#ffffff', // --p-text-color
    grid: useLightMode ? '#e2e8f0' : '#3f3f46' // --p-surface-200 / --p-surface-700
  };
});

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

const finiteDataRange = (u: uPlot, axisKey: AxisKey): Range | undefined => {
  // Determine the range of the (finite) values of our visible traces for the given axis.

  const data = u.data as unknown as [null, ...[math.FloatArray, math.FloatArray][]];
  const facetIndex = axisKey === 'x' ? 0 : 1;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let i = 1; i < data.length; ++i) {
    const values = data[i]?.[facetIndex];

    if (!values || u.series[i]?.show === false) {
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
        // No (finite) data, so we use a default range.

        return [0, 1000];
      }

      [min, max] = finiteRange;
    }

    // Make sure that we have a non-zero range.

    return min === max ? [min - 1, max + 1] : [min, max];
  };
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

  const [xValues, yValues] = (u.data as unknown as [null, ...[math.FloatArray, math.FloatArray][]])[seriesIndex] ?? [];
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

  // Create a series for each trace, using the trace's color for the stroke, our linear path builder, and no points.

  const series: uPlot.Series[] = [{}];

  for (let i = 0; i < Math.max(1, props.data.traces.length); ++i) {
    series.push({
      stroke: (_plot: uPlot, seriesIndex: number) => props.data.traces[seriesIndex - 1]?.color ?? 'transparent',
      width: 2,
      paths: linearPaths,
      points: { show: false },
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
    ticks: { show: false },
    grid: { stroke: colors.grid, width: 1 }
  };

  plot = new dependencies._uPlot(
    {
      mode: 2,
      width,
      height,
      legend: { show: false },
      cursor: { show: false },
      scales: {
        x: { time: false, range: scaleRange('x') },
        y: { range: scaleRange('y') }
      },
      axes: [
        { ...axis, scale: 'x', side: 2, label: props.data.xAxisTitle },
        { ...axis, scale: 'y', side: 3, label: props.data.yAxisTitle }
      ],
      series,
      hooks: {
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
                u.setSize({ width, height });
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
  // updated once we can be shown, see queueResize()).

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

  if (!plot || signature !== plotSignature) {
    // We don't yet have a plot or the signature of our plot has changed, so create a new plot.

    plotSignature = signature;

    createPlot(width, height);
  } else {
    // We already have a plot and its signature hasn't changed, so update its data and size, if needed.

    const currentPlot = plot;

    currentPlot.batch(() => {
      currentPlot.setData(plotData());

      if (currentPlot.width !== width || currentPlot.height !== height) {
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
  // Note: we pass a getter (i.e. mainDivRef.value) rather than our ref (i.e. mainDivRef) since VueUse uses its own
  //       version of Vue's types, which are not compatible with ours.

  const { stop } = vueusecore.useResizeObserver(
    () => mainDivRef.value,
    () => {
      queueResize();
    },
    {
      box: 'border-box'
    }
  );

  stopTrackingContainerSize = stop;
});

vue.onBeforeUnmount(() => {
  // Make sure that we don't queue any more resizes after we are unmounted.

  isUnmounted = true;

  // Stop tracking the size of our container.

  if (resizeRafId !== undefined) {
    cancelAnimationFrame(resizeRafId);

    resizeRafId = undefined;
  }

  // Destroy our plot, if any.

  plot?.destroy();

  plot = undefined;
});

vue.onUnmounted(() => {
  // Stop listening for the custom event that is dispatched when another instance of GraphPanelWidget shows its context
  // menu.

  window.removeEventListener(CONTEXT_MENU_EVENT, handleContextMenu);

  stopTrackingContainerSize?.();
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
