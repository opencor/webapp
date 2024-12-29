import libOpenCOR from 'libopencor'

// @ts-ignore (window.libOpenCOR may or not be defined and that is why we test it)
const loc = window.libOpenCOR !== undefined ? window.libOpenCOR : await libOpenCOR()

export function version() {
  // @ts-ignore (window.libOpenCOR may or not be defined and that is why we test it)
  return loc.versionString() + (window.libOpenCOR !== undefined ? ' (compiled or interpreted)' : ' (interpreted)')
}
