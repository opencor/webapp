import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Major version.

const majorVersion = 0;

// Minor version.

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth() + 1;
const day = now.getDate();
const minorVersion = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;

// Patch version.

const scriptDirName = path.dirname(fileURLToPath(import.meta.url));
const currentVersion = JSON.parse(fs.readFileSync(`${scriptDirName}/../package.json`)).version;
const currentVersionParts = currentVersion.split('.');
let patchVersion = 0;

patchVersion = parseInt(currentVersionParts[2], 10);

if (currentVersionParts[1] === minorVersion) {
  ++patchVersion;
} else {
  patchVersion = 0;
}

// (Full) version.

const version = `${majorVersion}.${minorVersion}.${patchVersion}`;

// Update our package.json files.

function updatePackageJsonFile(filePath) {
  const contents = JSON.parse(fs.readFileSync(filePath));

  contents.version = version;

  fs.writeFileSync(filePath, `${JSON.stringify(contents, null, 2)}\n`);
}

// Perform the updates.

updatePackageJsonFile(`${scriptDirName}/../../../package.json`);
updatePackageJsonFile(`${scriptDirName}/../package.json`);
