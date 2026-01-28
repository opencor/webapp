<template>
  <div v-if="possibleValues">
    <FloatLabel variant="on">
      <Select
        v-model="discreteValue"
        :options="possibleValues"
        optionLabel="name"
        @change="selectChange"
        class="w-full"
        size="small"
      />
      <label>{{ name }}</label>
    </FloatLabel>
  </div>
  <div v-else>
    <InputScientificNumber v-model="scalarValue"
      :label="name"
      size="small"
      @update:model-value="inputTextValueUpdated"
    />
    <Slider v-model="scalarValue" class="w-full mt-3"
      :min="minimumValue" :max="maximumValue" :step="stepValue"
      size="small"
      @change="sliderChange"
    />
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import type * as locApi from '../../libopencor/locApi.ts';

const value = defineModel<number>({ required: true });
const emits = defineEmits<{
  (event: 'change', name: string, newValue: number): void;
}>();
const props = defineProps<{
  maximumValue?: number;
  minimumValue?: number;
  name: string;
  possibleValues?: locApi.IUiJsonDiscreteInputPossibleValue[];
  stepValue?: number;
}>();

let oldValue = value.value;
const discreteValue = vue.ref<locApi.IUiJsonDiscreteInputPossibleValue | undefined>(
  props.possibleValues?.find((possibleValue) => possibleValue.value === value.value)
);
const scalarValue = vue.ref<number>(value.value);

// Some methods to handle a scalar value using an input component and a slider.

function emitChange(newValue: number) {
  void vue.nextTick(() => {
    value.value = newValue;

    if (!props.possibleValues) {
      scalarValue.value = newValue;
    }

    oldValue = newValue;

    emits('change', props.name, newValue);
  });
}

interface ISelectChangeEvent {
  value: {
    name: string;
    value: number;
  };
}

function selectChange(event: ISelectChangeEvent) {
  if (event.value.value !== oldValue) {
    emitChange(event.value.value);
  }
}

function inputTextValueUpdated(newValue: number | undefined) {
  if (newValue === undefined) {
    scalarValue.value = oldValue;

    return;
  }

  if (newValue !== oldValue) {
    let constrainedValue = newValue;

    if (props.minimumValue !== undefined && constrainedValue < props.minimumValue) {
      constrainedValue = props.minimumValue;
    }

    if (props.maximumValue !== undefined && constrainedValue > props.maximumValue) {
      constrainedValue = props.maximumValue;
    }

    emitChange(constrainedValue);
  }
}

function sliderChange(newValue: number | number[]) {
  const valueToEmit = Array.isArray(newValue) ? newValue[0] : newValue;

  if (valueToEmit !== undefined && valueToEmit !== oldValue) {
    emitChange(valueToEmit);
  }
}
</script>
