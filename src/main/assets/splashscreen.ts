// @ts-ignore (window.electronAPI is injected by Electron)
window.electronAPI.onInitSplashScreenWindow((info) => {
  // @ts-ignore(the copyright element exists)
  document.getElementById('copyright').innerText = info.copyright
  // @ts-ignore(the version element exists)
  document.getElementById('version').innerText = info.version
})
