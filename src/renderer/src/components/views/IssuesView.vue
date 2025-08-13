<template>
  <Fieldset class="ml-4! mr-4! mb-4!" legend="Issues">
    <ScrollPanel :class="simulationOnly ? 'issues-scroll-panel-only' : 'issues-scroll-panel'">
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
.issue {
  user-select: text;
}

.issues-scroll-panel-only {
  height: calc(100vh - 4.75rem);
}

.issues-scroll-panel {
  height: calc(100vh - var(--main-menu-height) - var(--file-tablist-height) - 4.75rem);
}
</style>
