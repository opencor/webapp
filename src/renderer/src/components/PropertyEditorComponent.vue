<template>
  <Fieldset :legend="name">
    <DataTable>
      <Column field="property" header="Property"></Column>
      <Column field="value" header="Value"></Column>
      <Column v-if="hasUnits" field="unit" header="Unit"></Column>
    </DataTable>
  </Fieldset>
</template>

<script setup lang="ts">
interface Props {
  name: string
  hasUnits?: boolean
}

const { hasUnits = true } = defineProps<Props>()
</script>
