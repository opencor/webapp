import { electronApi } from '../common/electronApi.js'

import { _cppLocApi, _wasmLocApi } from './locApi.js'

// Some general methods.

export function cppVersion(): boolean {
  return electronApi !== undefined
}

export function wasmVersion(): boolean {
  return !cppVersion()
}

export function version(): string {
  return cppVersion() ? _cppLocApi.version() : _wasmLocApi.versionString()
}
