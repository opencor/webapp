#!/usr/bin/env bun

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Retrieve the version from the package.json file.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(__dirname, '../package.json');
const version = (JSON.parse(fs.readFileSync(packageJsonPath)) as { version: string }).version;

// Make sure that the dist/assets folder exists.

const distPath = path.join(__dirname, '../dist');
const distAssetsPath = path.join(distPath, 'assets');

if (!fs.existsSync(distAssetsPath)) {
  fs.mkdirSync(distAssetsPath, { recursive: true });
}

// List the files that the Web app needs to refresh when force reloading it.
// Note: we exclude index.html (the Web app refreshes the page itself using its actual URL), version.json (it is always
//       fetched with cache busting), stats.html (it is not part of the Web app), and libOpenCOR's files (their path
//       contains libOpenCOR's version, so they never get stale).

const files = (fs.readdirSync(distPath, { recursive: true }) as string[])
  .map((file) => file.split(path.sep).join('/'))
  .filter(
    (file) =>
      fs.statSync(path.join(distPath, file)).isFile() &&
      !['index.html', 'assets/version.json', 'stats.html'].includes(file) &&
      !file.startsWith('libopencor/')
  )
  .sort();

// Write the version file.

fs.writeFileSync(path.join(distAssetsPath, 'version.json'), JSON.stringify({ version, files }, null, 2));

// Log the generated version.

console.log(`Generated version.json with version ${version} and ${files.length} files.`);
