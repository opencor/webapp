import xxhash from 'xxhash-wasm';

// biome-ignore lint/suspicious/noExplicitAny: dynamic import requires any type
export type Module = any;

export let _jsonSchema: Module = null;
export let _jsZip: Module = null;
export let _mathJs: Module = null;
export let _plotlyJs: Module = null;
export let _vueTippy: Module = null;
export const _xxhash = await xxhash();

export const setJsonSchema = (module: Module): void => {
  _jsonSchema = module;
};

export const setJsZip = (module: Module): void => {
  _jsZip = module;
};

export const setMathJs = (module: Module): void => {
  _mathJs = module;
};

export const setPlotlyJs = (module: Module): void => {
  _plotlyJs = module;
};

export const setVueTippy = (module: Module): void => {
  _vueTippy = module;
};
