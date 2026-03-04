<template>
  <div class="h-full flex flex-col">
    <div class="flex p-2 space-x-2 justify-center">
      <button :class="['flex-1 px-4 py-2 rounded text-center cursor-pointer', areModelParametersTracked(voi) ? 'bg-red-600' : 'bg-green-600']" @click="trackOrUntrackModelParameters(voi)">VOI</button>
      <button :class="['flex-1 px-4 py-2 rounded text-center cursor-pointer', areModelParametersTracked(mainT) ? 'bg-red-600' : 'bg-green-600']" @click="trackOrUntrackModelParameters(mainT)">main/t</button>
      <button :class="['flex-1 px-4 py-2 rounded text-center cursor-pointer', areModelParametersTracked(mainXYZ) ? 'bg-red-600' : 'bg-green-600']" @click="trackOrUntrackModelParameters(mainXYZ)">main/xyz</button>
      <button :class="['flex-1 px-4 py-2 rounded text-center cursor-pointer', areModelParametersTracked(unknown) ? 'bg-red-600' : 'bg-green-600']" @click="trackOrUntrackModelParameters(unknown)">unknown</button>
      <button class="flex-1 px-4 py-2 rounded bg-red-600 disabled:opacity-50 text-center cursor-pointer disabled:cursor-default" :disabled="!simulationDataTracked.length" @click="untrackAllModelParameters">All</button>
    </div>
    <div class="flex flex-1">
      <OpenCOR class="flex-1" ref="opencorRef"
        omex="https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/ui/lorenz.omex"
        @simulationData="onSimulationData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import type { IOpenCORExpose, IOpenCORSimulationDataEvent } from '../index.ts';

import OpenCOR from './components/OpenCOR.vue';

const opencorRef = vue.ref<IOpenCORExpose>();
const voi = vue.ref<string[]>(['VOI']);
const mainT = vue.ref<string[]>(['main/t']);
const mainXYZ = vue.ref<string[]>(['main/x', 'main/y', 'main/z']);
const unknown = vue.ref<string[]>(['unknown']);
const simulationDataTracked = vue.ref<string[]>([]);

const areModelParametersTracked = (modelParameters: string[]): boolean => {
  return modelParameters.every((mp) => simulationDataTracked.value.includes(mp));
};

const trackOrUntrackModelParameters = (modelParameters: string[]) => {
  if (!opencorRef.value) {
    return;
  }

  if (!areModelParametersTracked(modelParameters)) {
    opencorRef.value.trackSimulationData(modelParameters);

    simulationDataTracked.value.push(...modelParameters);
  } else {
    opencorRef.value.untrackSimulationData(modelParameters);

    simulationDataTracked.value = simulationDataTracked.value.filter((mp) => !modelParameters.includes(mp));
  }
};

const untrackAllModelParameters = () => {
  opencorRef.value?.untrackAllSimulationData();
  simulationDataTracked.value = [];
};

const onSimulationData = (event: IOpenCORSimulationDataEvent) => {
  console.log('---[Simulation data]---');

  for (const modelParameter of Object.keys(event.simulationData)) {
    console.log(`Simulation data for "${modelParameter}":`);
    console.log(event.simulationData[modelParameter]);
  }

  if (event.issues.length > 0) {
    console.log('Issues:');

    event.issues.forEach((issue: string) => {
      console.log(` - ${issue}`);
    });
  } else {
    console.log('No issues.');
  }
};
</script>

<style>
@import "tailwindcss/preflight.css" layer(base);
</style>
