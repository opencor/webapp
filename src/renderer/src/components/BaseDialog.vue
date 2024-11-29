<template>
  <Dialog :modal="true" @show="onShow" @hide="onHide">
    <template v-for="(_, slot) of $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { onShow, onHide } from './common.js'
</script>
