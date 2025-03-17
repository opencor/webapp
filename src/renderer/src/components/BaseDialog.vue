<template>
  <Dialog :modal="true" @show="disableMainMenu()" @hide="enableMainMenu()">
    <template v-for="(_event, slot) of $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { disableMainMenu, enableMainMenu } from '../common'
</script>
