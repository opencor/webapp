import { existsSync, rmSync } from 'fs'

function clean(paths) {
  for (const path of paths) {
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true })
    }
  }
}

clean(process.argv.slice(2))
