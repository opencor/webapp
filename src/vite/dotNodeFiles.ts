import * as fs from 'fs/promises'
import * as path from 'path'
import type { PluginOption } from 'vite'

export default function dotNodeFiles(): PluginOption {
  const dotNodeFileNames = new Set<string>()

  return {
    name: 'dotNodeFiles',
    async generateBundle(_options: any, _bundle: any) {
      for (const dotNodeFileName of dotNodeFileNames) {
        const dotNodeBaseName = path.basename(dotNodeFileName)
        const dotNodeFileContents = await fs.readFile(dotNodeFileName)

        this.emitFile({ type: 'asset', fileName: dotNodeBaseName, source: dotNodeFileContents })
      }
    },
    async load(id: string) {
      if (id.endsWith('.node')) {
        // Keep track of the .node file so that we can copy it to the output directory in the generateBundle hook.

        dotNodeFileNames.add(id)

        // Return an empty string so that the bundler thinks the .node file is empty. Indeed, we are going to copy the
        // .node file to the output directory ourselves rather than have the bundler do it, not least since the bundler
        // can't handle .node files (it only knows about JavaScript files).

        return ''
      }

      return null
    },
    transform(code: string, id: string) {
      if (id.endsWith('.node')) {
        // Load the .node file using a custom require function since the bundler can't handle .node files itself.
        // Module "module" has been externalized for browser compatibility.

        const dotNodeBaseName = path.basename(id)

        return `
        import { createRequire } from 'module'

        const require = createRequire(import.meta.url)
        const content = require('./${dotNodeBaseName}')

        export default content
        `
      }

      return code
    }
  }
}
