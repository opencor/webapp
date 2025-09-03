<template>
  <div class="absolute w-full h-full border-[0.375rem] border-dashed border-(--p-primary-color) z-99999">
    <div
      class="message absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[1.5rem] leading-[1.25] text-center rounded-[1rem] p-[0.5rem_1rem] bg-(--p-primary-color) text-(--p-primary-contrast-color) whitespace-nowrap"
    >
      CellML files, SED-ML files, and COMBINE archives<br />
      can be dropped here.
    </div>
  </div>
</template>

<style scoped>
.message {
  box-shadow: 0 0 0.75rem 0.375rem var(--p-content-border-color);
}
</style>
