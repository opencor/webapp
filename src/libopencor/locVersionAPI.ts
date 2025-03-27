import { electronAPI } from '../electronAPI'

import { _locAPI } from './locAPI'

// Some general methods.

export function cppVersion(): boolean {
  return electronAPI !== undefined
}

export function wasmVersion(): boolean {
  return !cppVersion()
}

export function version(): string {
  return cppVersion() ? _locAPI.version() : _locAPI.versionString()
}
