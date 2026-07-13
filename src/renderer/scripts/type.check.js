#!/usr/bin/env node

// Type-checking wrapper for projects that use TypeScript 7 while `vue-tsc` still expects TypeScript 6 internals.
// Note: this requires the `typescript-6` package alias to be installed in the project (so that we can have both
//       TypeScript 6 and TypeScript 7 installed at the same time).

import Module from 'node:module';
import path from 'node:path';

const currentWorkingDir = process.cwd();
const currentFolder = path.basename(currentWorkingDir);
const parentFolder = path.basename(path.resolve(currentWorkingDir, '..'));
const projectRoot =
  currentFolder === 'scripts' && parentFolder === 'renderer'
    ? path.resolve(currentWorkingDir, '..')
    : currentWorkingDir;
const origResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, ...args) {
  if (request === 'typescript/lib/tsc') {
    return path.join(projectRoot, 'node_modules', 'typescript-6', 'lib', 'tsc.js');
  }

  return origResolveFilename.call(this, request, parent, ...args);
};

await import(path.join(projectRoot, 'node_modules', 'vue-tsc', 'bin', 'vue-tsc.js'));
