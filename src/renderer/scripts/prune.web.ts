#!/usr/bin/env bun

import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Prune the assets of our deployed Web app that are not used anymore.
// Note: our assets have a hash in their file names (see vite.config.ts), so every deployment that changes an asset
//       uploads it under a new name and leaves the previous one behind. We cannot, however, delete an old asset as soon
//       as it is not part of our current deployment since some clients may still be using a previous version of
//       index.html (e.g., one that was loaded just before we deployed or one that was cached by a proxy). So, instead,
//       we keep track of when we first noticed that an asset was not used anymore and we only delete it once it has
//       been unused for a while.
// Note: we use OpenSSH's sftp since it comes with all the GitHub-hosted runners.

const GRACE_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days, in milliseconds.
const HASHED_ASSET_REGEX = /^\w[\w.-]*-[\w-]{8}\.\w+$/;
const PRUNE_FILE_NAME = '.prune.json';

const remotePath = process.argv[2];
const remoteHost = process.env.REMOTE_HOST;
const remotePort = process.env.REMOTE_PORT || '22';
const remoteUser = process.env.REMOTE_USER;
const sshPrivateKey = process.env.SSH_PRIVATE_KEY;

if (!remotePath || !remoteHost || !remoteUser || !sshPrivateKey) {
  console.error(
    'Usage: REMOTE_HOST=<host> [REMOTE_PORT=<port>] REMOTE_USER=<user> SSH_PRIVATE_KEY=<key> bun src/renderer/scripts/prune.web.ts <remote path>'
  );

  process.exit(1);
}

// Retrieve the assets of our current deployment.
// Note: only our hashed assets can be pruned, so that we never touch anything else (e.g., version.json).

const distPath = 'src/renderer/dist';
const localAssets = new Set(
  fs.readdirSync(path.join(distPath, 'assets')).filter((fileName) => HASHED_ASSET_REGEX.test(fileName))
);

if (localAssets.size === 0) {
  throw new Error('No hashed assets were found in our current deployment.');
}

const tmpPath = fs.mkdtempSync(path.join(os.tmpdir(), 'opencor-prune-'));

try {
  // Run the given sftp commands and return their output.

  const keyFile = path.join(tmpPath, 'key');

  fs.writeFileSync(keyFile, sshPrivateKey.endsWith('\n') ? sshPrivateKey : `${sshPrivateKey}\n`, { mode: 0o600 });

  const sftp = (commands: string[]): string => {
    const batchFile = path.join(tmpPath, 'batch');

    fs.writeFileSync(batchFile, `${commands.join('\n')}\n`);

    const res = childProcess.spawnSync(
      'sftp',
      [
        '-b',
        batchFile,
        '-P',
        remotePort,
        '-i',
        keyFile,
        '-o',
        'BatchMode=yes',
        '-o',
        'IdentitiesOnly=yes',
        '-o',
        'StrictHostKeyChecking=no',
        '-o',
        'UserKnownHostsFile=/dev/null',
        '-o',
        'LogLevel=ERROR',
        `${remoteUser}@${remoteHost}`
      ],
      { encoding: 'utf8' }
    );

    if (res.error) {
      throw res.error;
    }

    if (res.status !== 0) {
      throw new Error(`sftp failed (exit code: ${res.status}): ${res.stderr.trim()}`);
    }

    return res.stdout;
  };

  // Retrieve our deployed index.html, our deployed assets, and when we first noticed that some of them were not used
  // anymore.
  // Note: a command prefixed with "-" doesn't abort sftp if it fails, which is what we want since our prune file
  //       doesn't exist the first time we are run.
  // Note: we use a long listing so that we only consider regular files (i.e. lines that start with "-"), and since our
  //       hashed assets have no space in their names, their name is the last field of their line.

  const remoteIndexHtmlFile = path.join(tmpPath, 'index.html');
  const pruneFile = path.join(tmpPath, PRUNE_FILE_NAME);
  const remoteAssets = sftp([
    `cd "${remotePath}"`,
    `get index.html "${remoteIndexHtmlFile}"`,
    'cd assets',
    `-get ${PRUNE_FILE_NAME} "${pruneFile}"`,
    'ls -l'
  ])
    .split('\n')
    .filter((line) => line.startsWith('-'))
    .map((line) => line.trim().split(/\s+/).pop() ?? '')
    .filter((fileName) => HASHED_ASSET_REGEX.test(fileName));

  // Make sure that our current deployment is the one that is deployed. Otherwise, we would consider the assets of the
  // deployed version of our Web app as not being used anymore.

  if (!fs.readFileSync(remoteIndexHtmlFile).equals(fs.readFileSync(path.join(distPath, 'index.html')))) {
    throw new Error('The deployed index.html is not the one of our current deployment.');
  }

  const unusedSince = new Map<string, number>();

  if (fs.existsSync(pruneFile)) {
    try {
      const pruneData: unknown = JSON.parse(fs.readFileSync(pruneFile, 'utf8'));

      if (pruneData && typeof pruneData === 'object' && !Array.isArray(pruneData)) {
        for (const [fileName, time] of Object.entries(pruneData)) {
          if (typeof time === 'number' && Number.isFinite(time)) {
            unusedSince.set(fileName, time);
          }
        }
      }
    } catch (error: unknown) {
      // Our prune file is invalid, so start afresh, i.e. as if no asset had been unused for a while.

      console.warn('Our prune file is invalid, so it is going to be reset:', error);
    }
  }

  // Determine which of our deployed assets can be deleted and which ones are still within their grace period.

  const now = Date.now();
  const assetsToDelete: string[] = [];
  const newUnusedSince = new Map<string, number>();

  for (const fileName of remoteAssets) {
    if (localAssets.has(fileName)) {
      continue;
    }

    const since = unusedSince.get(fileName) ?? now;

    if (now - since >= GRACE_PERIOD) {
      assetsToDelete.push(fileName);
    } else {
      newUnusedSince.set(fileName, since);
    }
  }

  // Delete the assets that have been unused for long enough and update our prune file.

  fs.writeFileSync(pruneFile, JSON.stringify(Object.fromEntries(newUnusedSince), null, 2));

  sftp([
    `cd "${remotePath}/assets"`,
    ...assetsToDelete.map((fileName) => `rm "${fileName}"`),
    `put "${pruneFile}" ${PRUNE_FILE_NAME}`
  ]);

  for (const fileName of assetsToDelete) {
    console.log(`Deleted ${fileName}.`);
  }

  console.log(
    `Pruned ${assetsToDelete.length} asset(s), ${newUnusedSince.size} unused asset(s) are still within their grace period.`
  );
} finally {
  fs.rmSync(tmpPath, { recursive: true, force: true });
}
