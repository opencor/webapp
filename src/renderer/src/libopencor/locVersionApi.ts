import { electronApi } from '../common/electronApi.ts';

import { _cppLocApi, _wasmLocApi } from './locApi.ts';

// Some general methods.

export function cppVersion(): boolean {
  return electronApi !== undefined;
}

export function wasmVersion(): boolean {
  return !cppVersion();
}

export function version(): string {
  return cppVersion() ? _cppLocApi.version() : _wasmLocApi.versionString();
}
