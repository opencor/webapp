<template>
  <Fieldset :legend="name">
    <DataTable
      editMode="cell"
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
        <template #editor="{ data, field }">
          <InputNumber fluid :maxFractionDigits="15" v-model="data[field]" size="small" />
        </template>
      </Column>
      <Column v-if="hasUnits" field="unit" header="Unit" :style="columnWidth" />
    </DataTable>
  </Fieldset>
</template>

<script setup lang="ts">
import { type DataTableCellEditCompleteEvent } from 'primevue/datatable'

interface IProps {
  name: string
  hasUnits?: boolean
  properties: {
    property: string
    value: number
    unit?: string
  }[]
}

const { hasUnits = true, name, properties } = defineProps<IProps>()
const columnWidth = `width: calc(100% / ${hasUnits ? '3' : '2'})`
const emit = defineEmits(['propertyUpdated'])

function onCellEditComplete(event: DataTableCellEditCompleteEvent): void {
  const { data, newValue, field } = event

  data[field] = newValue

  emit('propertyUpdated', event.index, event.newValue)
}
</script>

<style scoped>
:deep(.p-datatable-header-cell) {
  transition: none;
}

:deep(.p-inputnumber-input) {
  padding: 0 2px !important;
  margin: 0 !important;
  line-height: 1.2px !important;
}
</style>
