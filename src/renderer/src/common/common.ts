import xxhash from 'xxhash-wasm';

import { electronApi } from './electronApi.ts';

// Some interfaces.

export interface ISettingsGeneral {
  checkForUpdatesAtStartup: boolean;
}

export interface ISettings {
  general: ISettingsGeneral;
}

// Some methods to determine the operating system, whether the application is running on a mobile device, etc.
// Note: the order of the checks in osName() is important. For instance, we need to check for "iPhone" before checking
//       for "Mac" since the user agent of iPhones contains both "iPhone" and "Mac".

const osName = (): string => {
  try {
    const userAgent = window.navigator.userAgent;

    if (/Android/i.test(userAgent)) {
      return 'Android';
    }

    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      return 'iOS';
    }

    if (/Windows/i.test(userAgent)) {
      return 'Windows';
    }

    if (/Linux/i.test(userAgent)) {
      return 'Linux';
    }

    if (/Mac/i.test(userAgent)) {
      return 'macOS';
    }

    return 'Unknown';
  } catch {
    return 'Unknown';
  }
};

export const isWindows = (): boolean => {
  return osName() === 'Windows';
};

export const isLinux = (): boolean => {
  return osName() === 'Linux';
};

export const isMacOs = (): boolean => {
  return osName() === 'macOS';
};

export const isDesktop = (): boolean => {
  const currentOSName = osName();

  return currentOSName === 'Windows' || currentOSName === 'Linux' || currentOSName === 'macOS';
};

// A method to determine whether the Ctrl or Cmd key is pressed, depending on the operating system.

export const isCtrlOrCmd = (event: KeyboardEvent): boolean => {
  return isMacOs() ? event.metaKey : event.ctrlKey;
};

// A method to enable/disable the main menu.

export const enableDisableMainMenu = (enable: boolean): void => {
  electronApi?.enableDisableMainMenu(enable);
};

// A method to determine whether a given file name indicates a data URL OMEX file.

export const OMEX_PREFIX = 'OMEX #';

export const isDataUrlOmexFileName = (fileName: string): boolean => {
  return fileName.startsWith(OMEX_PREFIX);
};

// A method to determine whether a given URL is an HTTP or HTTPS URL.

export const isHttpUrl = (url: string): boolean => {
  try {
    const { protocol } = new URL(url);

    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

// A method to get the CORS proxy URL for a given URL.

export const corsProxyUrl = (url: string): string => {
  return `https://cors-proxy.opencor.workers.dev/?url=${url}`;
};

// A method to compute the XXH64 hash of some given data.

const { h64Raw } = await xxhash();

export const xxh64 = (data: Uint8Array): string => {
  return h64Raw(data).toString(16).padStart(16, '0');
};

// A method to format a given number of milliseconds into a string.

export const formatTime = (time: number): string => {
  const ms = Math.floor(time % 1000);
  const s = Math.floor((time / 1000) % 60);
  const m = Math.floor((time / (1000 * 60)) % 60);
  const h = Math.floor((time / (1000 * 60 * 60)) % 24);
  const d = Math.floor((time / (1000 * 60 * 60 * 24)) % 24);
  let res = '';

  if (d) {
    res = `${String(d)}d`;
  }

  if (h || ((m || s || ms) && res)) {
    res += `${res ? ' ' : ''}${String(h)}h`;
  }

  if (m || ((s || ms) && res)) {
    res += `${res ? ' ' : ''}${String(m)}m`;
  }

  if (s || (ms && res)) {
    res += `${res ? ' ' : ''}${String(s)}s`;
  }

  if (ms || !res) {
    res += `${res ? ' ' : ''}${String(ms)}ms`;
  }

  return res;
};

// A method to format an error into a string.

export const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

// A method to format a message, i.e. make sure that it starts with a capital letter and ends with a period, or not.

export const formatMessage = (message: string, selfContained: boolean = true): string => {
  message = selfContained
    ? message.charAt(0).toUpperCase() + message.slice(1)
    : message.charAt(0).toLowerCase() + message.slice(1);

  return message.endsWith('...')
    ? message
    : message.endsWith('.')
      ? selfContained
        ? message
        : message.slice(0, -1)
      : selfContained
        ? `${message}.`
        : message;
};

// A method to determine whether a number is divisible by another one.

export const isDivisible = (a: number, b: number): boolean => {
  return Number.isInteger(a / b);
};

// A method to trigger a browser download for a given file.

export const downloadFile = (filename: string, content: string | Blob, type: string): void => {
  const link = document.createElement('a');
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

// A method to get the file name from a given file path.

export const fileName = (filePath: string): string => {
  const res = filePath.split(/(\\|\/)/g).pop() || '';

  try {
    return decodeURIComponent(res);
  } catch (error: unknown) {
    console.error('Failed to decode the file path:', res, formatError(error));

    return res;
  }
};

// A method to sleep for a given number of milliseconds.

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Import JSZip lazily.

// biome-ignore lint/suspicious/noExplicitAny: dynamic import requires any type
export let jsZip: any = null;

export const importJsZip = async (): Promise<void> => {
  try {
    const module = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/jszip@latest/+esm');

    // biome-ignore lint/suspicious/noExplicitAny: dynamic import requires any type
    jsZip = (module as any).default ?? module;
  } catch (error: unknown) {
    console.error('Failed to import JSZip:', formatError(error));

    throw error;
  }
};

// Import Math.js lazily.

// biome-ignore lint/suspicious/noExplicitAny: dynamic import requires any type
export let mathJs: any = null;

export const importMathJs = async (): Promise<void> => {
  try {
    const module = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/mathjs@latest/+esm');

    // biome-ignore lint/suspicious/noExplicitAny: dynamic import requires any type
    mathJs = (module as any).default ?? module;
  } catch (error: unknown) {
    console.error('Failed to import Math.js:', formatError(error));

    throw error;
  }
};

// Import Plotly.js lazily.

// biome-ignore lint/suspicious/noExplicitAny: dynamic import requires any type
export let plotlyJs: any = null;

export const importPlotlyJs = async (): Promise<void> => {
  try {
    const module = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/plotly.js-gl2d-dist-min@latest/+esm');

    // biome-ignore lint/suspicious/noExplicitAny: dynamic import requires any type
    plotlyJs = (module as any).default ?? module;
  } catch (error: unknown) {
    console.error('Failed to import Plotly.js:', formatError(error));

    throw error;
  }
};
