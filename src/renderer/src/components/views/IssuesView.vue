<template>
  <Fieldset :class="`${leftMargin ? 'ml-4!' : ''} ${rightMargin ? 'mr-4!' : ''}`" legend="Issues" :style="`{ width: ${fieldsetWidth}; height: ${fieldsetHeight}; }`">
    <ScrollPanel :style="`{ width: ${width}px; height: ${scrollPanelHeight}; }`">
      <div v-for="(issue, index) in issues" :key="`issue_${index}`" :class="`select-text ${index ? 'mt-4!' : ''}`">
        <Message v-if="issue.type === locApi.EIssueType.ERROR" severity="error" icon="pi pi-times-circle">
          {{ issue.description }}
        </Message>
        <Message v-else severity="warn" icon="pi pi-exclamation-triangle">
          {{ issue.description }}
        </Message>
      </div>
    </ScrollPanel>
  </Fieldset>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import { SHORT_DELAY } from '../../common/constants.ts';
import * as locApi from '../../libopencor/locApi.ts';

const props = withDefaults(
  defineProps<{
    height?: number;
    issues: locApi.IIssue[];
    leftMargin?: boolean;
    rightMargin?: boolean;
    width?: number;
  }>(),
  {
    height: 0,
    leftMargin: true,
    rightMargin: true,
    width: 0
  }
);

// Resize our fieldset and scroll panel as needed.

const fieldsetWidth = vue.ref<string>('');
const fieldsetHeight = vue.ref<string>('');
const scrollPanelHeight = vue.ref<string>('');

function resizeElements() {
  fieldsetWidth.value = props.width ? `${String(props.width)}px` : '100%';
  fieldsetHeight.value = props.height ? `calc(${String(props.height)}px - 1rem)` : '100%';
  scrollPanelHeight.value = props.height ? `calc(${String(props.height)}px - 4.75rem)` : '100%';
}

vue.onMounted(() => {
  setTimeout(() => {
    resizeElements();
  }, SHORT_DELAY);

  vue.watch(
    () => [props.height],
    () => {
      resizeElements();
    }
  );
});
</script>
