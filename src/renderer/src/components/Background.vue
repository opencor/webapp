import './assets/base.css'

<template>
  <img class="logo" src="../assets/logo.svg" />
</template>

<style>
#app {
  display: flex;
  place-items: center;
  place-content: center;
  height: 100vh;
}
</style>

<style scoped>
.logo {
  width: 308px;
  height: 264px;
  border-radius: 5%;
  padding: 8px;
  box-shadow: 0 0 10px 5px var(--shadow);
}
</style>
