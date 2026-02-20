import * as cache from './cache.ts';
import * as dependencies from './dependencies.ts';
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

// A method to determine whether a file name indicates a data URL OMEX file.

export const OMEX_PREFIX = 'OMEX #';

export const isDataUrlOmexFileName = (fileName: string): boolean => {
  return fileName.startsWith(OMEX_PREFIX);
};

// A method to determine whether a URL is an HTTP or HTTPS URL.

export const isHttpUrl = (url: string): boolean => {
  try {
    const { protocol } = new URL(url);

    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

// A method to get the CORS proxy URL for a URL.

export const corsProxyUrl = (url: string): string => {
  return `https://cors-proxy.opencor.workers.dev/?url=${url}`;
};

// A method to compute the XXH64 value of some data.

export const xxh64 = (data: Uint8Array): string => {
  return dependencies._xxhash.h64Raw(data).toString(16).padStart(16, '0');
};

// A method to format a number of milliseconds into a string.

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

// A method to trigger a browser download for a file.

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

// A method to get the file name from a file path.

export const fileName = (filePath: string): string => {
  const res = filePath.split(/(\\|\/)/g).pop() || '';

  try {
    return decodeURIComponent(res);
  } catch (error: unknown) {
    console.error('Failed to decode the file path:', res, formatError(error));

    return res;
  }
};

// A method to sleep for a number of milliseconds.

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// A method to retrieve the size of a remote file, if possible.

export const remoteFileSize = async (url: string): Promise<number> => {
  // Check the cache first.

  try {
    const size = await cache.remoteFileSize(url);

    if (size !== undefined) {
      return size;
    }
  } catch {}

  // Try a HEAD request first to get the content-length header.

  try {
    const head = await fetch(url, { method: 'HEAD' });
    const contentLength = head.headers.get('content-length');

    if (head.ok && contentLength && /^\d+$/.test(contentLength)) {
      const size = Number(contentLength);

      await cache.setRemoteFileSize(url, size);

      return size;
    }
  } catch {}

  // If that doesn't work, try a GET request with a Range header to get the content-range header.

  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-0' } });
    const contentRange = res.headers.get('content-range');
    const match = contentRange?.match(/\/(\d+)$/);

    if (res.ok && match) {
      const size = Number(match[1]);

      await cache.setRemoteFileSize(url, size);

      return size;
    }
  } catch {}

  const size = 0; // Unknown size.

  await cache.setRemoteFileSize(url, size);

  return size;
};

// A method to download a remote file and track the progress of the download.

export const downloadRemoteFile = async (url: string, onProgress: (percent: number) => void): Promise<Uint8Array> => {
  // Check the cache first.

  try {
    const data = await cache.remoteFile(url);

    if (data) {
      for (let percent = 0; percent <= 100; ++percent) {
        await sleep(1);

        onProgress(percent);
      }

      return data;
    }
  } catch {}

  // Download the file in chunks and track the progress.

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} was returned while trying to download ${url}.`);
  }

  if (!res.body) {
    throw new Error('ReadableStream is not supported in this browser.');
  }

  // Start with 0% progress.

  onProgress(0);

  // Try to get the total size of the file from the content-length header or the cache, if possible, to be able to
  // compute the progress. If not, we'll just show 0% until the download is complete and then show 100%.

  let totalNbOfBytes = 0;
  const contentLength = res.headers.get('content-length');

  if (contentLength && /^\d+$/.test(contentLength)) {
    totalNbOfBytes = Number(contentLength);

    await cache.setRemoteFileSize(url, totalNbOfBytes);
  } else {
    totalNbOfBytes = await remoteFileSize(url);
  }

  // Read the response body in chunks and track the progress.

  const reader = res.body.getReader();
  let oldPercent = 0;
  let crtNbOfBytes = 0;
  const buffer = totalNbOfBytes ? new Uint8Array(totalNbOfBytes) : undefined;
  const chunks: Uint8Array[] = buffer ? [] : [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    if (buffer) {
      buffer.set(value, crtNbOfBytes);
    } else {
      chunks.push(value);
    }

    crtNbOfBytes += value.length;

    if (totalNbOfBytes) {
      const percent = Math.floor((100 * crtNbOfBytes) / totalNbOfBytes);

      if (percent > oldPercent) {
        oldPercent = percent;

        onProgress(percent);
      }
    }
  }

  if (!totalNbOfBytes) {
    onProgress(100);
  }

  let data: Uint8Array;

  if (buffer) {
    data = crtNbOfBytes === totalNbOfBytes ? buffer : buffer.subarray(0, crtNbOfBytes);
  } else {
    let offset = 0;

    data = new Uint8Array(crtNbOfBytes);

    for (const chunk of chunks) {
      data.set(chunk, offset);

      offset += chunk.length;
    }
  }

  // Try to cache the remote file.

  try {
    await cache.setRemoteFile(url, data);
  } catch {}

  return data;
};
