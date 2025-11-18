const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const firebaseEnvVarMap = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
  measurementId: 'VITE_FIREBASE_MEASUREMENT_ID'
} as const;

export function missingFirebaseKeys(): string[] {
  function missingFirebaseKey(firebaseValue: unknown): boolean {
    return firebaseValue === undefined || firebaseValue === null || firebaseValue === '';
  }

  return (Object.entries(firebaseEnvVarMap) as Array<[keyof typeof firebaseEnvVarMap, string]>)
    .filter(([prop]) => missingFirebaseKey((firebaseConfig as Record<string, unknown>)[prop as string]))
    .map(([, envName]) => envName);
}

export interface IFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

export default missingFirebaseKeys().length === 0 ? (firebaseConfig as IFirebaseConfig) : undefined;
