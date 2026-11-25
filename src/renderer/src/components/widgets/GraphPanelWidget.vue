<template>
  <div ref="rootRef" class="graph-panel h-full" :style="themeStyle">
    <OpenCORPlot ref="plotRef"
      :data="data"
      :margins="margins"
      :showLegend="showLegend"
      :live="live"
      :theme="theme.useLightMode() ? 'light' : 'dark'"
      :appendTo="appendTarget"
      customContextMenu
      @contextMenu="onContextMenu"
      @csvExport="onCsvExport"
      @imageExport="onImageExport"
      @marginsUpdated="(newMargins: PlotMargins) => emit('marginsUpdated', newMargins)"
    />
    <ContextMenuWidget ref="contextMenuRef" :model="contextMenuItems" :appendTo="appendTarget" @hide="onContextMenuHide" />
  </div>
</template>

<script setup lang="ts">
// A graph panel, i.e. our plotting component (see @opencor/plot) integrated with the rest of OpenCOR:
//  - Its colours are those of our theme (see themeStyle), and its overlays (e.g., its hover tooltip) are appended to
//    our overlay container (see useAppendTarget()), like our other overlays.
//  - Its context menu is ours (see ContextMenuWidget.vue), so that it looks and behaves like our other context menus.
//  - The progress of an export to CSV is shown using our message (see OpenCORMessage.ts).
//  - The failure of an export to CSV, as well as the outcome of copying our plot to the clipboard or of exporting it to
//    an image, is shown using a toast (see OpenCORToast.ts).
// Note: @opencor/plot is imported at runtime, like our other external dependencies (see the OpenCOR Plot external
//       dependency in src/common/initialisation.ts), so we only import its types here.

import type {
  ContextMenuItem,
  default as OpenCORPlotComponent,
  PlotContextMenuEvent,
  PlotCsvExportEvent,
  PlotData,
  PlotImageExportEvent,
  PlotMargins
} from '@opencor/plot';
import type { MenuItem } from 'primevue/menuitem';
import * as vue from 'vue';

import * as common from '../../common/common';
import { LONG_DELAY } from '../../common/constants';
import * as dependencies from '../../common/dependencies';
import * as vueCommon from '../../common/vueCommon';

import { useOpenCORMessage } from '../OpenCORMessage';
import { useOpenCORToast } from '../OpenCORToast';

import ContextMenuWidget from './ContextMenuWidget.vue';

withDefaults(
  defineProps<{
    data: PlotData;
    margins?: PlotMargins;
    showLegend?: boolean;
    live?: boolean;
  }>(),
  {
    showLegend: true,
    live: false
  }
);

const emit = defineEmits<{
  marginsUpdated: [newMargins: PlotMargins];
}>();

const OpenCORPlot = dependencies._opencorPlot as typeof OpenCORPlotComponent;
const rootRef = vue.shallowRef<HTMLElement | null>(null);
const plotRef = vue.ref<InstanceType<typeof OpenCORPlotComponent> | null>(null);
const contextMenuRef = vue.ref<InstanceType<typeof ContextMenuWidget> | null>(null);
const theme = vueCommon.useTheme();
const appendTarget = vueCommon.useAppendTarget(rootRef);
const opencorMessage = useOpenCORMessage();
const addToast = useOpenCORToast();

const resetMargins = (): void => {
  // Have our plot emit its current margins again (e.g., when the shared margins we are given are reset, see
  // onResetMargins() in SimulationExperimentInteractiveView.vue).

  plotRef.value?.resetMargins();
};

defineExpose({
  resetMargins
});

// The colours of our plot, which are those of our theme (and which our plot also gives to its overlays).

const themeStyle = vue.computed<Record<string, string>>(() => {
  const useLightMode = theme.useLightMode();

  return {
    '--opencor-plot-background': 'var(--p-content-background)',
    '--opencor-plot-text-color': 'var(--p-text-color)',
    '--opencor-plot-muted-text-color': 'var(--p-text-muted-color)',
    '--opencor-plot-primary-color': 'var(--p-primary-color)',
    '--opencor-plot-grid-color': useLightMode ? 'var(--p-surface-200)' : 'var(--p-surface-800)',
    '--opencor-plot-zero-line-color': useLightMode ? 'var(--p-surface-300)' : 'var(--p-surface-600)',
    '--opencor-plot-hidden-trace-color': useLightMode ? 'var(--p-surface-300)' : 'var(--p-surface-600)',
    '--opencor-plot-hover-background': 'var(--p-content-hover-background)',
    '--opencor-plot-overlay-background': 'var(--p-overlay-popover-background)',
    '--opencor-plot-overlay-border-color': 'var(--p-overlay-popover-border-color)',
    '--opencor-plot-overlay-text-color': 'var(--p-overlay-popover-color)',
    '--opencor-plot-overlay-shadow': 'var(--opencor-overlay-shadow)',
    '--opencor-plot-border-radius': 'var(--p-border-radius-sm)',
    '--opencor-plot-focus-ring-width': 'var(--opencor-focus-ring-width)',
    '--opencor-plot-focus-ring-color': 'var(--opencor-focus-ring-color, var(--p-primary-color))'
  };
});

// Context menu, which is ours rather than our plot's (see customContextMenu), but with our plot's items.
// Note: an item that is checkable (e.g., to make an axis logarithmic) must keep its checked property, even if it is
//       false, since that is what makes it checkable (see ContextMenuWidget.vue).

const contextMenuItems = vue.shallowRef<MenuItem[]>([]);

const menuItems = (items: ContextMenuItem[]): MenuItem[] => {
  return items.map((item: ContextMenuItem): MenuItem => {
    if ('separator' in item) {
      return { separator: true };
    }

    return {
      label: item.label,
      ...(item.icon ? { icon: `pi pi-${item.icon}` } : {}),
      ...(item.checked !== undefined ? { checked: item.checked } : {}),
      ...(item.command ? { command: item.command } : {}),
      ...(item.items ? { items: menuItems(item.items) } : {})
    };
  });
};

const onContextMenu = (event: PlotContextMenuEvent): void => {
  contextMenuItems.value = menuItems(event.items);

  contextMenuRef.value?.show(
    new MouseEvent('contextmenu', { clientX: event.clientX, clientY: event.clientY }),
    event.usingKeyboard
  );
};

const onContextMenuHide = (): void => {
  // Let our plot know that our context menu has been hidden, so that it can get the keyboard focus back (if our context
  // menu was shown using the keyboard).

  plotRef.value?.contextMenuHidden();
};

// Export to CSV, the progress of which we show using our message, and the failure of which we show using a toast.
// Note: once our export has succeeded, we wait a bit before hiding our message, so that people can see that it reached
//       100%. Otherwise, we hide it straightaway, so that it doesn't block our UI for nothing, and let people know that
//       our export failed (rather than leave them wondering why no file was downloaded). Like for an export to an
//       image, we don't confirm that our export has succeeded since the file is downloaded (see onImageExport()).

const onCsvExport = async (event: PlotCsvExportEvent): Promise<void> => {
  if (event.type === 'started') {
    opencorMessage.show('Exporting data to CSV...');
  } else if (event.type === 'progress') {
    opencorMessage.update(event.percent);
  } else {
    if (event.success) {
      await common.sleep(LONG_DELAY);
    }

    opencorMessage.hide();

    if (!event.success) {
      addToast({
        severity: 'error',
        summary: 'Cannot Export Data',
        detail: 'The data could not be exported to CSV.'
      });
    }
  }
};

// Copy to the clipboard and export to an image, the outcome of which we show using a toast.
// Note: we don't confirm that an export to an image has succeeded since the image is downloaded, which is something
//       that the browser (or Electron, using a save dialog) already makes visible, unlike copying to the clipboard.

const onImageExport = (event: PlotImageExportEvent): void => {
  if (event.action === 'copy') {
    addToast(
      event.success
        ? {
            severity: 'success',
            summary: 'Plot Copied',
            detail: 'The plot has been copied to the clipboard.'
          }
        : {
            severity: 'error',
            summary: 'Cannot Copy Plot',
            detail: 'The plot could not be copied to the clipboard.'
          }
    );
  } else if (!event.success) {
    addToast({
      severity: 'error',
      summary: 'Cannot Export Plot',
      detail: `The plot could not be exported to ${event.format.toUpperCase()}.`
    });
  }
};
</script>
