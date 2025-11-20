// firebase/auth.ts
// Firebase Authentication 方法

import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously as firebaseSignInAnonymously,
  signOut,
  onAuthStateChanged,
  deleteUser,
  updateProfile,
  User,
  UserCredential
} from 'firebase/auth';
import { auth } from './config';

// ========== Auth Helper Functions ==========

type AuthResult = {
  success: boolean;
  user?: User;
  error?: string;
};

type AuthSuccessResult = {
  success: true;
};

type AuthErrorResult = {
  success: false;
  error: string;
};

/**
 * 注册用户
 */
export const registerUser = async (
  email: string,
  password: string
): Promise<AuthResult> => {
  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * 用户登录
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<AuthResult> => {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * 匿名登录
 */
export const signInAnonymously = async (): Promise<AuthResult> => {
  try {
    const userCredential: UserCredential = await firebaseSignInAnonymously(auth);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * 用户退出
 */
export const logoutUser = async (): Promise<
  AuthSuccessResult | AuthErrorResult
> => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * 监听认证状态
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * 更新用户资料
 */
export const updateUserProfile = async (
  user: User,
  profile: { displayName?: string; photoURL?: string }
): Promise<AuthSuccessResult | AuthErrorResult> => {
  try {
    await updateProfile(user, profile);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * 删除用户
 */
export const deleteUserAccount = async (
  user: User
): Promise<AuthSuccessResult | AuthErrorResult> => {
  try {
    await deleteUser(user);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

