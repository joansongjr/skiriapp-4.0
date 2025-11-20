// firebase/config.ts
// Firebase 配置和服务初始化

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase 配置对象
const firebaseConfig = {
  apiKey: 'AIzaSyCfP_BzfwUS2NsTmcKktdNU9401UXrZ8EI',
  authDomain: 'skiri2.firebaseapp.com',
  projectId: 'skiri2',
  storageBucket: 'skiri2.firebasestorage.app',  // ✅ 修正为新格式
  messagingSenderId: '138416525125',
  appId: '1:138416525125:web:e653f2ad65a9fedf20782c',
  measurementId: 'G-NQ6GNKR41Y',
};

// 初始化 Firebase（防止热重载重复初始化）
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 初始化 Auth（带 AsyncStorage 持久化）
function getAuthInstance(): Auth {
  try {
    // 尝试获取已存在的实例
    return getAuth(app);
  } catch (e) {
    // 如果不存在，创建新实例
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
}

// 导出服务实例
export const auth = getAuthInstance();
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

