<template>
  <img class="logo" src="../assets/logo.svg" />
</template>

<style scoped>
.logo {
  /* Original dimensions:
   *  - Width: 828.12px; and
   *  - Height: 704.92px.
   * Final dimensions:
   *  - Width: 303px + 8px = 311px; and
   *  - Height: 257.92px + 8px = ~266px
   */

  max-width: 311px;
  max-height: 266px;
  border-radius: 1rem;
  padding: 0.5rem;
  box-shadow: 0 0 0.75rem 0.375rem var(--p-content-border-color);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: -1;
}
</style>
