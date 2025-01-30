import * as fs from 'fs'

fs.rmSync('out/libOpenCOR', { recursive: true, force: true })
fs.rmSync('out/libOpenCOR.node', { force: true })
