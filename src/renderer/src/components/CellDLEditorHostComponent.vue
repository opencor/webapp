<template>
  <div class="celldl-editor">
    <Teleport :to="container" :disabled="!container">
      <div ref="editorRef" class="h-full" :class="{ invisible: switching }">
        <CellDLEditor
          :editorCommand="editorCommand"
          :theme="theme()"
          @editor-data="onEditorData"
          @editor-state="onEditorState"
        />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import CellDLEditor from '@celldl/editor';
import '@celldl/editor/style.css';
import * as vueusecore from '@vueuse/core';

import * as vue from 'vue';

import { useCellDLEditorHost } from '../common/celldlEditorHost';
import * as common from '../common/common';
import { useTheme } from '../common/vueCommon';

// Our shared CellDL Editor (see common/celldlEditorHost.ts).
// Note: when no CellDL Editor view is visible, our CellDL Editor is "parked" in our (invisible) root element.

const { container, editorCommand, onEditorData, onEditorState, setReady, switching } = useCellDLEditorHost();
const { theme } = useTheme();
const editorRef = vue.shallowRef<HTMLElement | null>(null);

// Let our host know when our CellDL Editor is ready.
// Note: the CellDL Editor doesn't tell us when it is ready, which it is once it has mounted itself and started editing
//       an empty diagram, i.e. once its SVG container has an SVG element. Until then, the CellDL Editor would ignore
//       our commands or fail to handle them.

const { stop: stopObservingEditor } = vueusecore.useMutationObserver(
  editorRef,
  () => {
    if (!editorRef.value?.querySelector('#svg-container > svg')) {
      return;
    }

    stopObservingEditor();

    void common.waitForNextAnimationFrame().then(setReady);
  },
  {
    childList: true,
    subtree: true
  }
);
</script>
