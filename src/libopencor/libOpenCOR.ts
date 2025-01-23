import libOpenCOR from 'libopencor'

interface locAPI {
  versionString: () => string
}

// @ts-expect-error (window.libOpenCOR may or not be defined and that is why we test it)
const winLoc = window.libOpenCOR ?? undefined
const loc: locAPI = winLoc ?? (await libOpenCOR())
const cppLoc = !!winLoc

export function version() {
  return loc.versionString() + (cppLoc ? ' (compiled or interpreted)' : ' (interpreted)')
}
