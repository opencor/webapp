<template>
  <PropertyEditor name="Simulation" :properties="properties" @propertyUpdated="onPropertyUpdated" />
</template>

<script setup lang="ts">
import * as vue from 'vue'

import * as locApi from '../../../../libopencor/locApi'

const props = defineProps<{
  file: locApi.File
}>()

const sedSimulationUniformTimeCourse = props.file.sedDocument().simulation(0) as locApi.SedSimulationUniformTimeCourse
const voiUnit = props.file.sedInstance().task(0).voiUnit()

const properties = vue.ref([
  {
    property: 'Starting point',
    value: sedSimulationUniformTimeCourse.outputStartTime(),
    unit: voiUnit
  },
  {
    property: 'Ending point',
    value: sedSimulationUniformTimeCourse.outputEndTime(),
    unit: voiUnit
  },
  {
    property: 'Point interval',
    value:
      (sedSimulationUniformTimeCourse.outputEndTime() - sedSimulationUniformTimeCourse.outputStartTime()) /
      sedSimulationUniformTimeCourse.numberOfSteps(),
    unit: voiUnit
  }
])

function onPropertyUpdated(index, value): void {
  if (index === 0) {
    sedSimulationUniformTimeCourse.setOutputStartTime(value)
  } else if (index === 1) {
    sedSimulationUniformTimeCourse.setOutputEndTime(value)
  } else if (index === 2) {
    sedSimulationUniformTimeCourse.setNumberOfSteps((properties.value[1].value - properties.value[0].value) / value)
  }
}
</script>
