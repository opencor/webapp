#!/usr/bin/env bun

import * as bun from 'bun';

(async () => {
  if (!(await bun.file('./dist/libOpenCOR/Release/libOpenCOR.node').exists())) {
    const build = await bun.spawn(['cmake-js', 'build', '-B', 'Release', '-O', './dist/libOpenCOR'], {
      stdio: ['inherit', 'inherit', 'inherit']
    });
    const exitCode = await build.exited;

    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  }
})();
