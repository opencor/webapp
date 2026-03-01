#!/usr/bin/env bun

import { spawnSync } from 'bun';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = (command, args) => {
  const result = spawnSync({
    cmd: [command, ...args],
    stdio: ['inherit', 'inherit', 'inherit']
  });

  if (result.exitCode !== 0) {
    console.error(`Command failed: ${command} ${args.join(' ')}`);

    process.exit(result.exitCode);
  }
};

const updateDependencies = (dir) => {
  process.chdir(dir);

  run('bun', ['clean']);
  run('bun', ['update', '-i']);

  fs.rmSync(path.join(dir, 'bun.lock'), { force: true });

  run('bun', ['install']);
  run('bun', ['clean']);
};

// Update dependencies in our root and renderer directories.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

updateDependencies(path.join(__dirname, '../../..'));
updateDependencies(path.join(__dirname, '..'));
