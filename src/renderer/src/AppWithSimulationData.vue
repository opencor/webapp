<template>
  <OpenCOR ref="opencorRef" omex="https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/ui/lorenz.omex" />
</template>

<script setup lang="ts">
import * as vue from 'vue';

import OpenCOR from './components/OpenCOR.vue';

const opencorRef = vue.ref<InstanceType<typeof OpenCOR> | null>(null);

vue.onMounted(() => {
  if (opencorRef.value) {
    const params = ['VOI', 'main/t', 'main/x', 'main/y', 'main/z', 'unknown'];

    opencorRef.value.simulationData(params).then((res) => {
      for (const modelParameter of params) {
        console.log(`Simulation data for "${modelParameter}":`);
        console.log(res.simulationData[modelParameter]);
      }

      if (res.issues.length > 0) {
        console.log('Issues:');

        res.issues.forEach((issue) => {
          console.log(` - ${issue}`);
        });
      } else {
        console.log('No issues.');
      }
    });
  }
});
</script>

<style>
@import "tailwindcss/preflight.css" layer(base);
</style>
