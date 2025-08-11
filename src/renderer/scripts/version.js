import fs from 'fs'

const versionMajor = 0
const versionPatch = 0

const now = new Date()
const year = now.getFullYear()
const month = now.getMonth() + 1
const day = now.getDate()

const version = `${versionMajor}.${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}.${versionPatch}`

function updatePackageJsonFile(filePath) {
  const contents = JSON.parse(fs.readFileSync(filePath))

  contents.version = version

  fs.writeFileSync(filePath, `${JSON.stringify(contents, null, 2)}\n`)
}

updatePackageJsonFile('package.json')
updatePackageJsonFile('src/renderer/package.json')
