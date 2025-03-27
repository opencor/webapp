import libOpenCOR from 'libopencor'

// @ts-expect-error (window.locAPI may or may not be defined and that is why we test it)
export const _locAPI = window.locAPI ?? (await libOpenCOR())

// Logger API.

export { IssueType, type IIssue } from './locLoggerAPI'

// Version API.

export { cppVersion, wasmVersion, version } from './locVersionAPI'

// File API.

export { fileManager, File, FileType } from './locFileAPI'
