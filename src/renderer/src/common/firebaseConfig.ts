const importMetaEnv = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
const firebaseConfig = {
  apiKey: importMetaEnv.VITE_FIREBASE_API_KEY,
  authDomain: importMetaEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: importMetaEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: importMetaEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: importMetaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: importMetaEnv.VITE_FIREBASE_APP_ID,
  measurementId: importMetaEnv.VITE_FIREBASE_MEASUREMENT_ID
};

const requiredFirebaseKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
  'measurementId'
] as const;

function missingFirebaseKey(firebaseValue: unknown): boolean {
  return firebaseValue === undefined || firebaseValue === null || firebaseValue === '';
}

export function missingFirebaseKeys(): string[] {
  return requiredFirebaseKeys.filter((rfk) => missingFirebaseKey((firebaseConfig as Record<string, unknown>)[rfk]));
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

export default missingFirebaseKeys().length === 0 ? (firebaseConfig as FirebaseConfig) : undefined;
