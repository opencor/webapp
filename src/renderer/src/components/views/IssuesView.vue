<template>
  <Fieldset class="ml-4! mr-4!" legend="Issues" :style="`{ width: ${width}px; height: ${fieldsetHeight}; }`">
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

const props = defineProps<{
  height: number;
  issues: locApi.IIssue[];
  width: number;
}>();

// Resize our fieldset and scroll panel as needed.

const fieldsetHeight = vue.ref<string>('0px');
const scrollPanelHeight = vue.ref<string>('0px');

function resizeElements() {
  fieldsetHeight.value = `calc(${String(props.height)}px - 1rem)`;
  scrollPanelHeight.value = `calc(${String(props.height)}px - 4.75rem)`;
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
