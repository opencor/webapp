import * as fs from 'node:fs';
import * as path from 'node:path';

import { libopencorVersion } from './libopencor.version';

export const downloadLibopencorJsIfNeeded = async (destDir: string): Promise<void> => {
  // Check if the file already exists.

  const destFile = path.join(destDir, 'libopencor.js');

  if (fs.existsSync(destFile)) {
    return;
  }

  // Create the destination directory if it doesn't exist.

  fs.mkdirSync(destDir, { recursive: true });

  // Download libopencor.js.

  const url = `https://opencor.ws/libopencor/downloads/wasm/${libopencorVersion}/libopencor.js`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  fs.writeFileSync(destFile, buffer);

  const stats = fs.statSync(destFile);

  console.log(`Downloaded libopencor.js (${(stats.size / 1024).toFixed(0)} KB) to ${destFile}.`);
};
