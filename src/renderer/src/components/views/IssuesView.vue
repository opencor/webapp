<template>
  <Fieldset :class="`${leftMargin ? 'ml-4!' : ''} ${rightMargin ? 'mr-4!' : ''}`" legend="Issues" :style="`{ width: ${fieldsetWidth}; height: ${fieldsetHeight}; }`">
    <ScrollPanel :style="`{ width: ${width}px; height: ${scrollPanelHeight}; }`">
      <div v-for="(issue, index) in issues" :key="`issue_${index}`" :class="`select-text ${index > 0 ? 'mt-4!' : ''}`">
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

import { SHORT_DELAY } from '../../common/constants';
import * as locApi from '../../libopencor/locApi';

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
  fieldsetWidth.value = (props.width === 0) ? '100%' : `${String(props.width)}px`;
  fieldsetHeight.value = (props.height === 0) ? '100%' : `calc(${String(props.height)}px - 1rem)`;
  scrollPanelHeight.value = (props.height === 0) ? '100%' : `calc(${String(props.height)}px - 4.75rem)`;
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
