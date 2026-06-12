<template>
  <div ref="wrapperRef" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
    <slot />
    <Popover ref="popoverRef" class="tooltip" :appendTo="appendTarget" :closeOnEscape="false">
      <div class="tooltip-content" v-html="content" />
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
}
</style>

<style>
.tooltip .p-popover-content {
  padding: 0.375rem 0.625rem;
}

/* Styles for teleported v-html content.
 * Note: they must be global since scoped styles do not survive PrimeVue's Popover teleportation. Using
 *       `.tooltip .tooltip-content` (the Popover's class) works regardless of append target (`document.body` or
 *       `.opencor` fixed container) and avoids leaking into host apps.
 */

.tooltip .tooltip-content {
  width: max-content;
  max-width: 20rem;
  font-size: 0.8rem;
}

.tooltip .tooltip-content code {
  font-size: 0.85em;
  padding: 0.1em 0.25em;
  background-color: var(--p-form-field-background);
  color: var(--p-form-field-color);
  border: 1px solid var(--p-form-field-border-color);
  border-radius: 0.2em;
}

.tooltip .tooltip-content b,
.tooltip .tooltip-content strong {
  font-weight: 600;
}

.tooltip .tooltip-content em,
.tooltip .tooltip-content i {
  font-style: italic;
}

.tooltip .tooltip-content sub {
  vertical-align: sub;
  font-size: smaller;
}
</style>
