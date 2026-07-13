import * as fs from 'node:fs';
import * as path from 'node:path';

type RendererPackageJson = {
  libopencorVersion: string;
};

const resolvedPaths = [
  path.resolve(process.cwd(), 'src/renderer/package.json'),
  path.join(import.meta.dirname, '..', 'package.json')
];
const rendererPackageJsonPath = resolvedPaths.find((candidatePath) => {
  return fs.existsSync(candidatePath);
});

if (rendererPackageJsonPath === undefined) {
  throw new Error(`Could not find package.json in any of the following paths: ${resolvedPaths.join(', ')}.`);
}

const rendererPackageJson = JSON.parse(fs.readFileSync(rendererPackageJsonPath, 'utf8')) as RendererPackageJson;

export const libopencorVersion = rendererPackageJson.libopencorVersion;
