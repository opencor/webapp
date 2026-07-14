#!/usr/bin/env node

// Ensure that the Electron binary is installed.
// Note: indeed, unlike npm, Bun's package manager doesn't run lifecycle scripts from dependencies, so the `electron`
//       package's `install.js` (which downloads the platform-specific binary) is never executed automatically. This
//       script runs it explicitly after `bun install` to prevent the "Electron uninstall" error from `electron-vite`.

import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const installScript = resolve(__dirname, '../../../node_modules/electron/install.js');
const result = spawnSync(process.execPath, [installScript], {
  cwd: resolve(__dirname, '../../..'),
  env: { ...process.env },
  stdio: 'inherit'
});

if (result.status === null) {
  // The child process failed to spawn or was terminated by a signal. status will be null, so surfacing the error (if
  // present) to avoid silently exiting 0 and misleading the user into thinking Electron was installed.

  console.error(result.error ?? new Error('The Electron install script failed to run.'));

  process.exit(1);
}

process.exit(result.status);
