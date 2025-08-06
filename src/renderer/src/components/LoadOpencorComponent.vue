<template>
  <div class="loading p-overlay-mask">
    <Message class="message" severity="secondary">
      <i class="message-icon pi pi-spin pi-cog" />
      <br />
      <span class="message-text">Loading OpenCOR...</span>
    </Message>
  </div>
</template>

<style scoped>
.loading {
  z-index: 99999;
}

.message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 1.5rem 1rem 0.75rem;
}

.message-icon {
  text-align: center;
  display: block;
  font-size: 3rem;
}

.message-text {
  font-size: 1.5rem;
}
</style>
