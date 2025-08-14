import { execSync } from 'child_process'
import fs from 'fs'

// Major version.

const majorVersion = 0

// Minor version.

const now = new Date()
const year = now.getFullYear()
const month = now.getMonth() + 1
const day = now.getDate()
const minorVersion = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`

// Patch version.

const gitDescribe = execSync('git describe --tags --long', { encoding: 'utf8' }).trim()
const match = gitDescribe.match(/^v?(\d+)\.(\d+)\.(\d+)-(\d+)-g[0-9a-f]+$/)
const [, , minor, patch] = match
let patchVersion = parseInt(patch)

if (minor === minorVersion) {
  ++patchVersion
} else {
  patchVersion = 0
}

// (Full) version.

const version = `${majorVersion}.${minorVersion}.${patchVersion}`

// Update our package.json files.

function updatePackageJsonFile(filePath) {
  const contents = JSON.parse(fs.readFileSync(filePath))

  contents.version = version

  fs.writeFileSync(filePath, `${JSON.stringify(contents, null, 2)}\n`)
}

updatePackageJsonFile('package.json')
updatePackageJsonFile('src/renderer/package.json')
