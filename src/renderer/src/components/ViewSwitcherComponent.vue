<template>
  <nav class="w-14 h-full shrink-0 flex flex-col overflow-y-auto py-1"
    :style="{ borderRight: '1px solid var(--p-content-border-color)' }"
  >
    <template v-for="([category, views], categoryIndex) in categoriesWithViews" :key="category.id">
      <div v-if="categoryIndex > 0" class="mx-2 my-1 border-t"
        style="border-color: var(--p-content-border-color);"
      />
      <button v-for="view in views" :key="view.id"
        type="button"
        :class="[
          'view-icon flex items-center justify-center mx-1 my-0.5 rounded-r-md transition-colors duration-150',
          { 'view-icon-active': view.id === activeViewId }
        ]"
        :style="{ '--view-category-color': category.color }"
        :title="view.label"
        @click="$emit('selectView', view.id)"
      >
        <i :class="view.icon" class="text-lg" />
      </button>
    </template>
  </nav>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import {
  type IViewDescriptor,
  useViewRegistry,
  ViewCategory,
  type ViewCategory as ViewCategoryType
} from '../common/viewRegistry';

defineProps<{
  activeViewId?: string;
}>();

defineEmits<{
  selectView: [viewId: string];
}>();

const viewRegistry = useViewRegistry();

const categoriesWithViews = vue.computed<Array<[ViewCategoryType, IViewDescriptor[]]>>(() => {
  const res: Array<[ViewCategoryType, IViewDescriptor[]]> = [];

  for (const category of Object.values(ViewCategory)) {
    const views = viewRegistry.descriptors(category);

    if (views.length > 0) {
      res.push([category, views]);
    }
  }

  return res;
});
</script>

<style scoped>
.view-icon {
  width: 44px;
  height: 44px;
  border-left: 3px solid transparent;
  background-color: color-mix(in srgb, var(--view-category-color) 8%, transparent);
  color: var(--p-text-muted-color);
}

.view-icon:hover {
  background-color: color-mix(in srgb, var(--view-category-color) 15%, transparent);
  color: var(--p-text-color);
}

.view-icon-active,
.view-icon-active:hover {
  background-color: color-mix(in srgb, var(--view-category-color) 20%, transparent);
  border-left-color: var(--view-category-color);
  color: var(--view-category-color);
}
</style>
