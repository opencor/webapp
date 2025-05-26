import { electronApi } from '../electronApi'

import { _locApi } from './locApi'

// Some general methods.

export function cppVersion(): boolean {
  return electronApi !== undefined
}

export function wasmVersion(): boolean {
  return !cppVersion()
}

export function version(): string {
  return cppVersion() ? _locApi.version() : _locApi.versionString()
}
