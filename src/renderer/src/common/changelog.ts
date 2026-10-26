import type { IOpenCORChangelogChange, IOpenCORChangelogEntry, OpenCORChangelogChangeType } from '../../index';

import changelogJson from '../../changelog.json';

import { formatError } from './common';
import { electronApi } from './electronApi';
import { currentVersion, isNewerVersion } from './version';

// The types of changes, in the order in which they are to be listed.

const CHANGE_TYPES: OpenCORChangelogChangeType[] = ['added', 'removed', 'improved', 'fixed'];

// Sanitise a changelog, i.e. keep only its valid entries (i.e. those with a valid version and at least one valid
// change) and their valid changes (i.e. those with a known type and a non-empty description), merge the entries that
// have the same version, sort the entries from the newest version to the oldest one, and sort the changes of each entry
// by type.
// Note: a changelog is maintained by hand, so we want to be robust against mistakes in it. In addition, OpenCOR fetches
//       the changelog of a newer version (see fetchChangelog() below), so its format may have evolved in the meantime.

const VERSION_REGEX = /^\d+\.\d+\.\d+$/;

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isChangelogChange = (change: unknown): change is IOpenCORChangelogChange => {
  return (
    isObject(change) &&
    CHANGE_TYPES.includes(change.type as OpenCORChangelogChangeType) &&
    typeof change.description === 'string' &&
    change.description.trim() !== ''
  );
};

const isChangelogEntry = (entry: unknown): entry is { version: string; changes: unknown[] } => {
  return (
    isObject(entry) &&
    typeof entry.version === 'string' &&
    VERSION_REGEX.test(entry.version) &&
    Array.isArray(entry.changes)
  );
};

const sanitisedChangelog = (changelog: unknown): IOpenCORChangelogEntry[] => {
  if (!Array.isArray(changelog)) {
    return [];
  }

  const entries = new Map<string, IOpenCORChangelogEntry>();

  for (const entry of changelog.filter(isChangelogEntry)) {
    const changes = entry.changes.filter(isChangelogChange).map((change: IOpenCORChangelogChange) => {
      return { type: change.type, description: change.description.trim() };
    });
    const existingEntry = entries.get(entry.version);

    if (existingEntry) {
      existingEntry.changes.push(...changes);
    } else {
      entries.set(entry.version, { version: entry.version, changes });
    }
  }

  return [...entries.values()]
    .filter((entry: IOpenCORChangelogEntry) => {
      return entry.changes.length > 0;
    })
    .map((entry: IOpenCORChangelogEntry) => {
      // Note: Array.prototype.sort() is stable, so changes of the same type remain in the order in which they are
      //       listed.

      entry.changes.sort((changeA: IOpenCORChangelogChange, changeB: IOpenCORChangelogChange) => {
        return CHANGE_TYPES.indexOf(changeA.type) - CHANGE_TYPES.indexOf(changeB.type);
      });

      return entry;
    })
    .sort((entryA: IOpenCORChangelogEntry, entryB: IOpenCORChangelogEntry) => {
      if (isNewerVersion(entryA.version, entryB.version)) {
        return -1;
      }

      return isNewerVersion(entryB.version, entryA.version) ? 1 : 0;
    });
};

// Return the entries of a changelog for the versions after the given "from" version (excluded), if any, up to the given
// "to" version (included).

const changelogEntries = (
  changelog: IOpenCORChangelogEntry[],
  fromVersion: string | null,
  toVersion: string
): IOpenCORChangelogEntry[] => {
  return changelog.filter((entry: IOpenCORChangelogEntry) => {
    return (
      (fromVersion === null || isNewerVersion(entry.version, fromVersion)) && !isNewerVersion(entry.version, toVersion)
    );
  });
};

// Our changelog, i.e. the changes for all the versions up to our current version.
// Note: we import our changelog.json file rather than inject it at build time (as we do with our current version, see
//       version.ts), so that any change to it gets picked up straight away when running the development version of
//       OpenCOR or of OpenCOR's Web app.

const changelogEntriesUpToCurrentVersion = changelogEntries(sanitisedChangelog(changelogJson), null, currentVersion);

const copiedChangelogEntry = (entry: IOpenCORChangelogEntry): IOpenCORChangelogEntry => {
  return {
    version: entry.version,
    changes: entry.changes.map((change: IOpenCORChangelogChange) => {
      return { type: change.type, description: change.description };
    })
  };
};

const changelog = (): IOpenCORChangelogEntry[] => {
  // Return a copy of our changelog, so that it cannot be modified by our caller.

  return changelogEntriesUpToCurrentVersion.map(copiedChangelogEntry);
};

// Fetch the changes for the versions after our current version (excluded) up to the given version (included).
// Note #1: OpenCOR fetches the changelog.json file of the given version from our GitHub repository (using the tag of
//          that version) while OpenCOR's Web app fetches the changelog.json file that is deployed with it (see
//          scripts/generate.version.ts), i.e. the changelog of the latest deployed version (which may be even newer
//          than the given version) with cache busting (i.e. by adding a timestamp query parameter to the URL so that
//          the browser doesn't serve a cached version).
// Note #2: we don't want to bother the user if we cannot fetch the changes, so we just return an empty list in that
//          case.

const fetchChangelog = async (toVersion: string): Promise<IOpenCORChangelogEntry[]> => {
  const url = electronApi
    ? `https://raw.githubusercontent.com/opencor/webapp/v${toVersion}/src/renderer/changelog.json`
    : `./assets/changelog.json?t=${Date.now()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`OpenCOR: failed to fetch the changelog (${response.status}: ${response.statusText}).`);

      return [];
    }

    return changelogEntries(sanitisedChangelog(await response.json()), currentVersion, toVersion);
  } catch (error: unknown) {
    console.warn('OpenCOR: failed to fetch the changelog:', formatError(error));

    return [];
  }
};

// Export our changelog functions.

export { changelog, fetchChangelog };
