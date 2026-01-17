<template>
  <Dialog :modal="true" appendTo="self" :pt:mask:style="{ position: 'absolute' }" @show="onShow" @hide="onHide">
    <template v-for="(_event, slot) of $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import { enableDisableMainMenu } from '../../common/common.ts';

let dialogElement: HTMLElement | null = null;
let containerElement: HTMLElement | null | undefined = null;
let mutationObserver: MutationObserver | null = null;

function checkDialogPosition() {
  if (dialogElement instanceof HTMLElement && containerElement instanceof HTMLElement) {
    const dialogRect = dialogElement.getBoundingClientRect();
    const containerRect = containerElement.getBoundingClientRect();

    dialogElement.style.top = `${String(Math.max(Math.min(dialogRect.top, containerRect.bottom - dialogRect.height), containerRect.top))}px`;
    dialogElement.style.left = `${String(Math.max(Math.min(dialogRect.left, containerRect.right - dialogRect.width), containerRect.left))}px`;
  }
}

function onShow() {
  enableDisableMainMenu(false);

  void vue.nextTick(() => {
    dialogElement = document.querySelector('.p-dialog');
    containerElement = dialogElement?.closest('[data-pc-section="mask"]');

    if (dialogElement && containerElement) {
      mutationObserver = new MutationObserver(() => {
        checkDialogPosition();
      });

      mutationObserver.observe(dialogElement, { attributes: true, attributeFilter: ['style'] });

      checkDialogPosition();
    }
  });
}

function onHide() {
  enableDisableMainMenu(true);

  void vue.nextTick(() => {
    if (mutationObserver) {
      mutationObserver.disconnect();

      mutationObserver = null;
    }
  });
}
</script>
