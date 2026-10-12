<template>
  <div ref="rootRef" v-if="possibleValues" @pointerdown.capture="onInteractionStart" @keydown.capture="onInteractionStart">
    <FloatLabel variant="on">
      <Select
        v-model="discreteValue"
        :options="possibleValues"
        optionLabel="name"
        @change="selectChange"
        :appendTo="appendTarget"
        class="w-full"
        size="small"
      />
      <label>{{ name }}</label>
    </FloatLabel>
  </div>
  <div ref="rootRef" v-else @pointerdown.capture="onInteractionStart" @keydown.capture="onInteractionStart">
    <InputScientificNumberWidget v-model="value"
      :label="name"
      :min="minimumValue"
      :max="maximumValue"
      :step="compStepValue"
      size="small"
      @update:model-value="inputTextValueUpdated"
    />
    <Slider v-model="value" class="w-full mt-3"
      :min="minimumValue" :max="maximumValue" :step="compStepValue"
      size="small"
      @change="sliderChange"
    />
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import * as vueCommon from '../../common/vueCommon';
import type * as locApi from '../../libopencor/locApi';

const value = defineModel<number>({ required: true });

const props = defineProps<{
  maximumValue?: number;
  minimumValue?: number;
  name: string;
  possibleValues?: locApi.IUiJsonDiscreteInputPossibleValue[];
  stepValue?: number;
}>();

const emits = defineEmits<{
  change: [name: string, newValue: number];
  changeEnd: [name: string];
}>();

let oldValue = value.value;
const discreteValue = vue.ref<locApi.IUiJsonDiscreteInputPossibleValue | undefined>(
  props.possibleValues?.find((possibleValue) => possibleValue.value === value.value)
);
const rootRef = vue.shallowRef<HTMLElement | null>(null);
const appendTarget = vueCommon.useAppendTarget(rootRef);

const compStepValue = vue.computed<number>(() => {
  if (props.stepValue !== undefined) {
    return props.stepValue;
  }

  if (props.maximumValue !== undefined && props.minimumValue !== undefined) {
    return 0.01 * (props.maximumValue - props.minimumValue);
  }

  return 1;
});

vue.watch(
  () => value.value,
  (newValue) => {
    oldValue = newValue;

    if (props.possibleValues) {
      discreteValue.value = props.possibleValues.find((pv) => pv.value === newValue);
    }
  },
  { immediate: true }
);

// Keep track of whether the user is interacting with us (e.g., dragging our slider, holding one of our spin buttons, or
// holding an arrow key), so that we can let our owner know when a change is final, i.e. when it is not made during an
// interaction (e.g., selecting a value, entering a value, or clicking on our slider bar) or when the interaction during
// which it was made has ended (see emitChange()).
// Note: an interaction may end outside of us (e.g., our slider being released outside of us or the Enter key moving the
//       focus away from our input), hence we listen to the window for the end of an interaction.

let interacting = false;
let changedWhileInteracting = false;

const onInteractionStart = (): void => {
  if (interacting) {
    return;
  }

  interacting = true;

  window.addEventListener('pointerup', onInteractionEnd);
  window.addEventListener('keyup', onInteractionEnd);
  window.addEventListener('blur', onInteractionEnd);
};

const onInteractionEnd = (): void => {
  window.removeEventListener('pointerup', onInteractionEnd);
  window.removeEventListener('keyup', onInteractionEnd);
  window.removeEventListener('blur', onInteractionEnd);

  interacting = false;

  if (changedWhileInteracting) {
    changedWhileInteracting = false;

    // Note: we emit our changeEnd event in the next tick so that it gets emitted after any pending change event (see
    //       emitChange()).

    vue.nextTick(() => {
      emits('changeEnd', props.name);
    });
  }
};

vue.onBeforeUnmount(() => {
  window.removeEventListener('pointerup', onInteractionEnd);
  window.removeEventListener('keyup', onInteractionEnd);
  window.removeEventListener('blur', onInteractionEnd);
});

// Some methods to handle a scalar value using an input component and a slider.

const emitChange = (newValue: number) => {
  const changeIsFinal = !interacting;

  if (!changeIsFinal) {
    changedWhileInteracting = true;
  }

  vue.nextTick(() => {
    value.value = newValue;

    oldValue = newValue;

    emits('change', props.name, newValue);

    if (changeIsFinal) {
      emits('changeEnd', props.name);
    }
  });
};

interface ISelectChangeEvent {
  value: {
    name: string;
    value: number;
  };
}

const selectChange = (event: ISelectChangeEvent) => {
  if (event.value.value !== oldValue) {
    emitChange(event.value.value);
  }
};

const inputTextValueUpdated = (newValue: number | undefined) => {
  if (newValue !== undefined && newValue !== oldValue) {
    emitChange(newValue);
  }
};

const sliderChange = (newValue: number | number[]) => {
  const valueToEmit = Array.isArray(newValue) ? newValue[0] : newValue;

  if (valueToEmit !== undefined && valueToEmit !== oldValue) {
    emitChange(valueToEmit);
  }
};
</script>
