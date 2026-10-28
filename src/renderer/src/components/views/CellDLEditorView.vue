<template>
  <div class="celldl-editor relative h-full flex flex-col">
    <div class="grow min-h-0 relative">
      <IssuesView v-if="client.issues.length" class="m-4" style="height: calc(100% - 2rem);" :issues="client.issues" />
      <div v-show="!client.issues.length" ref="containerRef" class="h-full" />
      <BlockingMessageComponent v-if="!client.loaded && !client.issues.length" message="Loading CellDL Editor..." />
    </div>
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import { type ICellDLEditorClient, useCellDLEditorHost } from '../../common/celldlEditorHost';
import * as common from '../../common/common';
import type * as locApi from '../../libopencor/locApi';

const props = defineProps<{
  file: locApi.File;
  isActiveFile: boolean;
}>();

const host = useCellDLEditorHost();
const containerRef = vue.shallowRef<HTMLElement | null>(null);
const celldlFileName = common.fileName(props.file.canonicalPath());

// Our view is kept alive, so keep track of whether it is active, i.e. whether it is visible in its file tab.

const isActiveView = vue.ref<boolean>(true);

vue.onActivated(() => {
  isActiveView.value = true;
});

vue.onDeactivated(() => {
  isActiveView.value = false;
});

// Use our shared CellDL Editor (see common/celldlEditorHost.ts), which shows our diagram when we are visible.

const client = vue.reactive({
  name: celldlFileName,
  container: null,
  data: new TextDecoder().decode(props.file.contents()),
  active: vue.computed<boolean>(() => props.isActiveFile && isActiveView.value),
  loaded: false,
  issues: []
}) as ICellDLEditorClient;

vue.onMounted(() => {
  client.container = containerRef.value;

  host.register(client);
});

vue.onBeforeUnmount(() => {
  host.unregister(client);
});
</script>
