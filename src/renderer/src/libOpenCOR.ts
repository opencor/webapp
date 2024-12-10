// @ts-ignore (window.electronAPI may or not be defined and that is why we test it)
const electronAPI = window.electronAPI

// Export a function named ocVersion

export function version() {
  if (electronAPI !== undefined) {
    return 'x.y.z'
  } else {
    return 'a.b.c'
  }
}
