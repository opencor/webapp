const REMOTE_FILE_SIZES_STORE_NAME = 'remoteFileSizes';
const REMOTE_FILE_STORE_NAME = 'remoteFiles';

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open('OpenCOR');

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(REMOTE_FILE_SIZES_STORE_NAME)) {
        db.createObjectStore(REMOTE_FILE_SIZES_STORE_NAME);
      }

      if (!db.objectStoreNames.contains(REMOTE_FILE_STORE_NAME)) {
        db.createObjectStore(REMOTE_FILE_STORE_NAME);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const remoteFileSize = async (url: string): Promise<number | undefined> => {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(REMOTE_FILE_SIZES_STORE_NAME, 'readonly');
    const store = tx.objectStore(REMOTE_FILE_SIZES_STORE_NAME);
    const req = store.get(url);

    req.onsuccess = () => {
      resolve(req.result as number | undefined);
    };

    req.onerror = () => {
      reject(req.error);
    };
  });
};

export const setRemoteFileSize = async (url: string, size: number): Promise<void> => {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(REMOTE_FILE_SIZES_STORE_NAME, 'readwrite');
    const store = tx.objectStore(REMOTE_FILE_SIZES_STORE_NAME);
    const req = store.put(size, url);

    req.onsuccess = () => {
      resolve();
    };

    req.onerror = () => {
      reject(req.error);
    };
  });
};

export const remoteFile = async (url: string): Promise<Uint8Array | undefined> => {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(REMOTE_FILE_STORE_NAME, 'readonly');
    const store = tx.objectStore(REMOTE_FILE_STORE_NAME);
    const req = store.get(url);

    req.onsuccess = () => {
      resolve(req.result as Uint8Array | undefined);
    };

    req.onerror = () => {
      reject(req.error);
    };
  });
};

export const setRemoteFile = async (url: string, contents: Uint8Array): Promise<void> => {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(REMOTE_FILE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(REMOTE_FILE_STORE_NAME);
    const req = store.put(contents, url);

    req.onsuccess = () => {
      resolve();
    };

    req.onerror = () => {
      reject(req.error);
    };
  });
};
