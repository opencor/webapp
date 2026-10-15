<template>
  <Fieldset :legend="name">
    <DataTable
      :editMode="disabled ? undefined : 'cell'"
      resizableColumns
      showGridlines
      size="small"
      :value="properties"
      @cell-edit-complete="onCellEditComplete"
    >
      <Column field="property" header="Property" :style="columnWidth" />
      <Column field="value" header="Value" :style="columnWidth">
        <template #body="{ data, field }">
          {{ data[field as string] }}
        </template>
        <template v-if="!disabled" #editor="{ data, field }">
          <InputNumber fluid :maxFractionDigits="15" v-model="data[field]" size="small" />
        </template>
      </Column>
      <Column v-if="hasUnits" field="unit" header="Unit" :style="columnWidth" />
    </DataTable>
  </Fieldset>
</template>

<script setup lang="ts">
import type { DataTableCellEditCompleteEvent } from 'primevue/datatable';

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
    isValid?: (index: number, newValue: number) => boolean;
  }>(),
  {
    hasUnits: true
  }
);

const emit = defineEmits<{
  propertyUpdated: [index: number, newValue: number];
}>();

const columnWidth = `width: calc(100% / ${props.hasUnits ? '3' : '2'});`;

const onCellEditComplete = (event: DataTableCellEditCompleteEvent): void => {
  // Note: a property is edited using a copy of it, so we only need to ignore an invalid new value for the property to
  //       keep its current value. A new value is invalid if it is not a finite number (e.g., the field was cleared,
  //       giving a null value) or if it is deemed invalid by our owner.

  const { data, newValue, field, index } = event;

  if (
    typeof newValue !== 'number' ||
    !Number.isFinite(newValue) ||
    (props.isValid && !props.isValid(index, newValue))
  ) {
    return;
  }

  data[field] = newValue;

  emit('propertyUpdated', index, newValue);
};
</script>

<style scoped>
:deep(.p-inputnumber-input) {
  padding: 0 2px !important;
  margin: 0 !important;
  line-height: 1.2px !important;
}
</style>
