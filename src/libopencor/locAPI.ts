import libOpenCOR from 'libopencor'

interface LOCAPI {
  // Note: src/preload/index.ts needs to be in sync with this file.

  versionString: () => string
}

// @ts-expect-error (window.locAPI may or may not be defined and that is why we test it)
export const locAPI: LOCAPI = window.locAPI ?? (await libOpenCOR())
