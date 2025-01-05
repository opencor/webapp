/* eslint-disable */

// @ts-expect-error (window.electronAPI is injected by Electron)
window.electronAPI.onInitSplashScreenWindow((info) => {
  // @ts-expect-error(the copyright element exists)
  document.getElementById('copyright').innerText = info.copyright
  // @ts-expect-error(the version element exists)
  document.getElementById('version').innerText = info.version
})
