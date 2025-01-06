import libOpenCOR from 'libopencor'

interface locAPI {
  versionString: () => string
}

// @ts-expect-error (window.libOpenCOR may or not be defined and that is why we test it)
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const winLoc = window.libOpenCOR ?? undefined
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const loc: locAPI = winLoc ?? (await libOpenCOR())
const cppLoc = !!winLoc

export function version() {
  return loc.versionString() + (cppLoc ? ' (compiled or interpreted)' : ' (interpreted)')
}
