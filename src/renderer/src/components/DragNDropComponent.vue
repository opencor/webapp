<template>
  <div class="drop-area">
    <div class="message">CellML files, SED-ML files, and COMBINE archives can be dropped here.</div>
  </div>
</template>

<style scoped>
.drop-area {
  width: 100%;
  height: 100%;
  border: 0.375rem dashed;
  background-color: var(--p-content-background);
  border-color: var(--p-emerald-500);
  z-index: 99999;
}

@media (prefers-color-scheme: dark) {
  .drop-area {
    border-color: var(--p-emerald-400);
  }
}

.message {
  font-size: 1.5rem;
  text-align: center;
  border-radius: 1rem;
  padding: 0.5rem 1rem;
  background-color: var(--p-emerald-500);
  color: var(--p-content-background);
  box-shadow: 0 0 0.75rem 0.375rem var(--p-content-border-color);
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

@media (prefers-color-scheme: dark) {
  .message {
    background-color: var(--p-emerald-400);
  }
}
</style>
