import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  getReactNativePersistence,
  inMemoryPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: 'AIzaSyAAtQuMwlhNmF0kDJVlA1ovaRyRJj7c29w',
  authDomain: 'campus-connect-41b23.firebaseapp.com',
  projectId: 'campus-connect-41b23',
  storageBucket: 'campus-connect-41b23.firebasestorage.app',
  messagingSenderId: '561127901173',
  appId: '1:561127901173:web:3b1b74f8242f2b2683c2bc',
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let authInstance: any;
try {
  if (Platform.OS === 'web') {
    authInstance = initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } else {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} catch {
  authInstance = getAuth(app);
}

// Secondary auth instance isolated to SecondaryAuth app.
// Used for provisioning and updating credentials in the cloud without logging out the active admin.
let secondaryAuthInstance: any;
try {
  const secondaryApp =
    getApps().find((a) => a.name === 'SecondaryAuth') ||
    initializeApp(firebaseConfig, 'SecondaryAuth');
  if (Platform.OS === 'web') {
    secondaryAuthInstance = initializeAuth(secondaryApp, {
      persistence: inMemoryPersistence,
    });
  } else {
    secondaryAuthInstance = initializeAuth(secondaryApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} catch {
  try {
    const secondaryApp =
      getApps().find((a) => a.name === 'SecondaryAuth') || getApp('SecondaryAuth');
    secondaryAuthInstance = getAuth(secondaryApp);
  } catch {
    secondaryAuthInstance = authInstance;
  }
}

export const auth = authInstance;
export const secondaryAuth = secondaryAuthInstance;
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;