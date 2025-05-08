import fs from 'fs'
import yaml from 'js-yaml'

const now = new Date()
const year = now.getFullYear()
const month = now.getMonth() + 1
const day = now.getDate()
const version = `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`

function updatePackageJsonFile(filePath) {
  const contents = JSON.parse(fs.readFileSync(filePath))

  contents.version = version

  fs.writeFileSync(filePath, JSON.stringify(contents, null, 2) + '\n')
}

updatePackageJsonFile('package.json')
updatePackageJsonFile('src/renderer/package.json')

function updateYamlFile(filePath) {
  const contents = yaml.load(fs.readFileSync(filePath))

  contents.buildVersion = version

  fs.writeFileSync(filePath, yaml.dump(contents))
}

updateYamlFile('electron-builder.yml')
