<template>
  <div class="drop-area p-overlay-mask">
    <div class="message">
      CellML files, SED-ML files, and COMBINE archives<br />
      can be dropped here.
    </div>
  </div>
</template>

<style scoped>
.drop-area {
  width: 100%;
  height: 100%;
  border: 0.375rem dashed;
  border-color: var(--p-primary-color);
  z-index: 99999;
}

.message {
  font-size: 1.5rem;
  line-height: 1.25;
  text-align: center;
  border-radius: 1rem;
  padding: 0.5rem 1rem;
  background-color: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  box-shadow: 0 0 0.75rem 0.375rem var(--p-content-border-color);
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
