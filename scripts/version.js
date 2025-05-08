import fs from 'fs'

const now = new Date()
const year = now.getFullYear()
const month = now.getMonth() + 1
const day = now.getDate()
const version = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`

function updateVersion(packageJsonPath) {
  const json = JSON.parse(fs.readFileSync(packageJsonPath))

  json.version = version

  fs.writeFileSync(packageJsonPath, JSON.stringify(json, null, 2) + '\n')
}

updateVersion('package.json')
updateVersion('src/renderer/package.json')
