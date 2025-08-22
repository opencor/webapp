<template>
  <Fieldset :class="'ml-4! mr-4! mb-4! ' + (simulationOnly ? 'fieldset-simulation-only' : 'fieldset')" legend="Issues">
    <ScrollPanel :class="simulationOnly ? 'scroll-panel-simulation-only' : 'scroll-panel'">
      <div v-for="(issue, index) in issues" :key="`issue_${index}`" :class="`issue ${index > 0 ? 'mt-4!' : ''}`">
        <Message v-if="issue.type === locApi.EIssueType.ERROR" severity="error" icon="pi pi-times-circle">
          {{ issue.description }}
        </Message>
        <Message v-else severity="warn" icon="pi pi-exclamation-triangle">
          {{ issue.description }}
        </Message>
      </div>
    </ScrollPanel>
  </Fieldset>
</template>

<script setup lang="ts">
import * as locApi from '../../libopencor/locApi'

defineProps<{
  issues: locApi.IIssue[]
  simulationOnly?: boolean
}>()
</script>

<style scoped>
.fieldset,
.fieldset-simulation-only {
  overflow: hidden;
}

.fieldset {
  height: calc(var(--block-ui-height) - var(--main-menu-height) - var(--file-tablist-height) - 1rem);
}

.fieldset-simulation-only {
  height: calc(var(--block-ui-height) - 1rem);
}

.issue {
  user-select: text;
}

.scroll-panel {
  height: calc(var(--block-ui-height) - var(--main-menu-height) - var(--file-tablist-height) - 4.75rem);
}

.scroll-panel-simulation-only {
  height: calc(var(--block-ui-height) - 4.75rem);
}
</style>
