<template>
  <div ref="wrapperRef" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
    <slot />
    <Popover ref="popoverRef" class="tooltip" :appendTo="appendTarget" :closeOnEscape="false">
      <div class="tooltip" v-html="content" />
    </Popover>
  </div>
</template>

<script setup lang="ts">
import Popover from 'primevue/popover';
import * as vue from 'vue';

import * as vueCommon from '../../common/vueCommon';

const props = defineProps<{
  content: string;
}>();

const wrapperRef = vue.ref<HTMLElement | undefined>();
const popoverRef = vue.ref<InstanceType<typeof Popover> | undefined>();
const appendTarget = vueCommon.useAppendTarget();

const onMouseEnter = (event: MouseEvent) => {
  if (!props.content) {
    return;
  }

  popoverRef.value?.show(event, wrapperRef.value);
};

const onMouseLeave = () => {
  popoverRef.value?.hide();
};
</script>

<style scoped>
.tooltip {
  width: max-content;
  max-width: 20rem;
  font-size: 0.8rem;
}

.tooltip :deep(code) {
  font-size: 0.85em;
  padding: 0.1em 0.25em;
  background-color: var(--p-form-field-background);
  color: var(--p-form-field-color);
  border: 1px solid var(--p-form-field-border-color);
  border-radius: 0.2em;
}
</style>

<style>
.tooltip .p-popover-content {
  padding: 0.375rem 0.625rem;
}
</style>
