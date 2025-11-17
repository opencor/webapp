import { AsyncEntry } from '@napi-rs/keyring';

import electron from 'electron';

export async function clearGitHubCache(): Promise<void> {
  await Promise.all(
    ['https://github.com', 'https://api.github.com', 'https://opencorapp.firebaseapp.com'].map(async (origin) => {
      try {
        await electron.session.defaultSession.clearStorageData({ origin });
      } catch (error: unknown) {
        console.warn(`Failed to clear storage data for ${origin}:`, error);
      }
    })
  );
}

let storeAvailable = true;

function gitHubAccessTokenError(operation: string, error: unknown): void {
  if (storeAvailable) {
    console.warn(
      `Failed to ${operation} the GitHub access token using the system credential store. Subsequent attempts will be skipped.`,
      error
    );
  }

  storeAvailable = false;
}

function gitHubAccessTokenEntry(): AsyncEntry | null {
  if (!storeAvailable) {
    return null;
  }

  try {
    return new AsyncEntry('OpenCOR', 'GitHub access token');
  } catch (error: unknown) {
    gitHubAccessTokenError('initialise', error);

    return null;
  }
}

export async function deleteGitHubAccessToken(): Promise<boolean> {
  const entry = gitHubAccessTokenEntry();

  if (entry === null) {
    return false;
  }

  try {
    return await entry.deleteCredential();
  } catch (error: unknown) {
    gitHubAccessTokenError('delete', error);

    return false;
  }
}

export async function loadGitHubAccessToken(): Promise<string | null> {
  const entry = gitHubAccessTokenEntry();

  if (entry === null) {
    return null;
  }

  try {
    const password = await entry.getPassword();

    return password ?? null;
  } catch (error: unknown) {
    gitHubAccessTokenError('load', error);

    return null;
  }
}

export async function saveGitHubAccessToken(token: string): Promise<boolean> {
  if (token.trim() === '') {
    console.warn('Ignoring request to store an empty GitHub access token.');

    return false;
  }

  const entry = gitHubAccessTokenEntry();

  if (entry === null) {
    return false;
  }

  try {
    await entry.setPassword(token);

    return true;
  } catch (error: unknown) {
    gitHubAccessTokenError('store', error);

    return false;
  }
}
