import * as fs from 'node:fs';
import * as path from 'node:path';

type RendererPackageJson = {
  libopencorVersion: string;
};

const rendererPackageJsonPath = [
  path.resolve(process.cwd(), 'src/renderer/package.json'),
  path.join(import.meta.dirname, '..', 'package.json')
].find((candidatePath) => fs.existsSync(candidatePath));

const rendererPackageJson = JSON.parse(fs.readFileSync(rendererPackageJsonPath, 'utf8')) as RendererPackageJson;

export const libopencorVersion = rendererPackageJson.libopencorVersion;
