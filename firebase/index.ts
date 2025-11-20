// firebase/index.ts
// Firebase 主入口 - 导出所有 Firebase 相关功能

// Firebase 配置和服务
export { auth, db, storage } from './config';

// 认证服务
export {
  registerUser,
  loginUser,
  signInAnonymously,
  logoutUser,
  onAuthStateChange,
  updateUserProfile as updateAuthUserProfile,
  deleteUserAccount
} from './auth';

// Firestore 服务
export {
  // User Profile
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  // Skin Analysis
  createSkinAnalysis,
  getUserAnalyses,
  getAnalysisById,
  subscribeToUserAnalyses,
  // Survey Data
  saveSurveyData,
  getSurveyData,
  // Photos (existing)
  createPhotoDoc,
  enforceDailyCap,
  getRecentPhotos,
  getDailyPhotos,
  deletePhotoDoc,
  getPhotosByDateRange,
  savePhotoWithAutoCleanup,
  // Photos (sync)
  getPhotosAfter,
  getPhotosBefore
} from './firestore';

// Firestore Types
export type { PhotoDoc } from './firestore';

// Storage 服务
export {
  uploadPhoto,
  uploadPhotoBase64,
  deletePhoto,
  uploadPhotoBatch
} from './storage';

// Storage Types
export type { UploadProgress } from './storage';

// Context 和 Hooks
export {
  AuthProvider,
  useAuth
} from './context';
