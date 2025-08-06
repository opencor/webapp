<template>
  <ProgressSpinner class="spinning-wheel" />
</template>

<style scoped>
.spinning-wheel {
  width: 50% !important;
  height: 50% !important;
  position: fixed !important;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 99999;
}
</style>
