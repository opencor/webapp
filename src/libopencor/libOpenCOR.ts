// @ts-ignore (window.libOpenCOR may or not be defined and that is why we test it)
const loc = window.libOpenCOR

export function version() {
  return (loc !== undefined) ? loc.version() : '1.9.6.9'
}
