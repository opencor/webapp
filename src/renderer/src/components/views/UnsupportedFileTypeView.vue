<template>
  <div class="h-full flex flex-col items-center justify-center gap-4 p-8">
    <div class="opacity-50">
      <i class="pi pi-file text-4xl!" :style="{ color: viewCategory.color }"></i>
    </div>
    <div class="text-center">
      <h2 class="text-xl font-semibold mb-2">Unsupported File Type</h2>
      <p class="text-sm">
        The <span :style="{ color: viewCategory.color }">{{ viewName }}</span> view does not support this type of file.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ViewCategory } from '../../common/viewRegistry';

defineProps<{
  viewName: string;
  viewCategory: ViewCategory;
}>();
</script>
