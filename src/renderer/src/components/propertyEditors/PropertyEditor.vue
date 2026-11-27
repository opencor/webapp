<template>
  <section class="property-editor side-panel-section">
    <!--
    Note: a property editor is shown in the side panel of a simulation experiment view, so it uses the styles of the
          sections and fields of that side panel (see simulation-experiment-view.css).
    -->
    <h3 class="opencor-section-title opencor-section-title-small">{{ name }}</h3>
    <div class="side-panel-fields">
      <InputScientificNumberWidget v-for="(property, index) in properties" :key="property.property"
        :ref="(element: unknown) => (fieldRefs[index] = element as InputScientificNumberWidgetInstance | null)"
        :modelValue="property.value"
        :label="common.labelWithUnit(property.property, hasUnits ? property.unit : undefined)"
        :disabled="disabled"
        size="small"
        @update:modelValue="(newValue: number | undefined) => onValueUpdated(index, newValue)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import * as common from '../../common/common';

const props = withDefaults(
  defineProps<{
    name: string;
    disabled?: boolean;
    hasUnits?: boolean;
    properties: {
      property: string;
      value: number;
      unit?: string;
    }[];
    validate?: (index: number, newValue: number) => string | undefined;
  }>(),
  {
    hasUnits: true
  }
);

const emit = defineEmits<{
  propertyUpdated: [index: number, newValue: number];
}>();

// The input fields of our properties, which we use to have a property's input field show its current value again when
// its new value is invalid.
// Note: an input field shows the value that was entered (or spun to), even if it doesn't get accepted, so we need to
//       ask it to show the current value of its property again, which it does without losing the keyboard focus (so
//       that, for instance, the user can keep spinning its value).

interface InputScientificNumberWidgetInstance {
  discardEdit: (reason?: string) => void;
}

const fieldRefs: (InputScientificNumberWidgetInstance | null)[] = [];

const onValueUpdated = (index: number, newValue: number | undefined): void => {
  // Ignore an invalid new value for the property, i.e. keep its current value, and let the user know why (see
  // discardEdit() in InputScientificNumberWidget.vue). A new value is invalid if it is not a finite number or if our
  // owner says why it is invalid. A valid new value is emitted, and it is then up to our owner to update its property
  // (and therefore ours).

  const property = props.properties[index];

  if (!property || newValue === property.value) {
    return;
  }

  if (typeof newValue !== 'number' || !Number.isFinite(newValue)) {
    fieldRefs[index]?.discardEdit('This is not a valid number.');

    return;
  }

  const invalidReason = props.validate?.(index, newValue);

  if (invalidReason) {
    fieldRefs[index]?.discardEdit(invalidReason);

    return;
  }

  emit('propertyUpdated', index, newValue);
};
</script>
