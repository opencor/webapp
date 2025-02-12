import * as fs from 'fs'

function clean(paths) {
  for (const path of paths) {
    if (fs.existsSync(path)) {
      fs.rmSync(path, { recursive: true, force: true })
    }
  }
}

clean([
  'dist',
  'node_modules',
  'out',
  'src/main/build',
  'src/renderer/components.d.ts',
  'src/renderer/dist',
  'src/renderer/node_modules'
])
