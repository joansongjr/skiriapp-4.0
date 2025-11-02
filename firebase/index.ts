import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCfP_BzfwUS2NsTmcKktdNU9401UXrZ8EI",
  authDomain: "skiri2.firebaseapp.com",
  projectId: "skiri2",
  storageBucket: "skiri2.firebasestorage.app",
  messagingSenderId: "138416525125",
  appId: "1:138416525125:web:e653f2ad65a9fedf20782c",
  measurementId: "G-NQ6GNKR41Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services with React Native persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

