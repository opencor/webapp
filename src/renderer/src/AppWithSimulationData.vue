<template>
  <OpenCOR ref="opencorRef" omex="https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/ui/lorenz.omex" />
</template>

<script setup lang="ts">
import * as vue from 'vue';

import OpenCOR from './components/OpenCOR.vue';

const opencorRef = vue.ref<InstanceType<typeof OpenCOR> | null>(null);

vue.onMounted(() => {
  if (opencorRef.value) {
    for (const modelParameter of ['VOI', 'main/t', 'main/x', 'main/y', 'main/z', 'unknown']) {
      opencorRef.value
        .simulationData(modelParameter)
        .then((simulationData: Float64Array) => {
          console.log(`Simulation data for "${modelParameter}":`);
          console.log(simulationData);
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }
});
</script>

<style>
@import "tailwindcss/preflight.css" layer(base);
</style>
