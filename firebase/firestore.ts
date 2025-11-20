// firebase/firestore.ts
// Firestore 数据库操作

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

// ========== Type Definitions ==========

type FirestoreResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  id?: string;
};

// ========== Photos Collection 操作 ==========

const photosCol = collection(db, 'photos');

export type PhotoDoc = {
  id: string;
  uid: string;
  dateISO: string;
  url: string;
  createdAt: Timestamp;
  localId?: string;
  scores?: {
    overall?: number;
    acne?: number;
    redness?: number;
    darkCircles?: number;
    wrinkles?: number;
    complexion?: number;
  };
};

/**
 * 创建照片文档
 */
export async function createPhotoDoc(
  uid: string, 
  dateISO: string, 
  url: string, 
  localId?: string
): Promise<string> {
  const ref = await addDoc(photosCol, {
    uid, 
    dateISO, 
    url, 
    localId,
    createdAt: serverTimestamp()
  });
  return ref.id;
}

/**
 * 每天最多3张：若超限，删最旧的（简化版，无需索引）
 */
export async function enforceDailyCap(
  uid: string, 
  dateISO: string, 
  cap = 3
): Promise<void> {
  // 简化查询：只用一个 where，手动过滤和排序
  const q = query(
    photosCol,
    where('uid', '==', uid)
  );
  const snap = await getDocs(q);
  
  // 手动过滤当天的照片
  const todayPhotos = snap.docs
    .filter(d => d.data().dateISO === dateISO)
    .sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis() || 0;
      const bTime = b.data().createdAt?.toMillis() || 0;
      return aTime - bTime; // 升序：旧的在前
    });
  
  if (todayPhotos.length > cap) {
    const needDelete = todayPhotos.length - cap;
    for (let i = 0; i < needDelete; i++) {
      await deleteDoc(doc(db, 'photos', todayPhotos[i].id));
    }
  }
}

/**
 * 获取最近N张照片
 */
export async function getRecentPhotos(
  uid: string, 
  limitN = 12
): Promise<PhotoDoc[]> {
  const q = query(
    photosCol, 
    where('uid', '==', uid), 
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.slice(0, limitN).map(d => ({ 
    id: d.id, 
    ...(d.data() as Omit<PhotoDoc, 'id'>) 
  }));
}

/**
 * 获取某天的所有照片
 */
export async function getDailyPhotos(
  uid: string, 
  dateISO: string
): Promise<PhotoDoc[]> {
  const q = query(
    photosCol,
    where('uid', '==', uid),
    where('dateISO', '==', dateISO),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ 
    id: d.id, 
    ...(d.data() as Omit<PhotoDoc, 'id'>) 
  }));
}

/**
 * 删除指定照片
 */
export async function deletePhotoDoc(photoId: string): Promise<void> {
  await deleteDoc(doc(db, 'photos', photoId));
}

/**
 * 获取某个日期范围的照片（用于图表）
 */
export async function getPhotosByDateRange(
  uid: string,
  startDate: string,
  endDate: string
): Promise<PhotoDoc[]> {
  const q = query(
    photosCol,
    where('uid', '==', uid),
    where('dateISO', '>=', startDate),
    where('dateISO', '<=', endDate),
    orderBy('dateISO', 'desc'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ 
    id: d.id, 
    ...(d.data() as Omit<PhotoDoc, 'id'>) 
  }));
}

/**
 * 增量同步：获取某个时间戳之后的照片（用于24小时同步、下拉刷新）
 * @param uid 用户ID
 * @param afterTimestamp 时间戳（毫秒），获取这个时间之后的照片
 * @param limitN 最多获取多少张，默认50
 * @returns 照片数组，按时间倒序
 */
export async function getPhotosAfter(
  uid: string,
  afterTimestamp: number,
  limitN = 50
): Promise<PhotoDoc[]> {
  try {
    // 简化查询：只用单字段查询避免需要复合索引
    // 在客户端进行时间过滤和排序
    const q = query(
      photosCol,
      where('uid', '==', uid)
      // 不使用 orderBy 和 where('createdAt', '>') 避免需要索引
    );
    
    const snap = await getDocs(q);
    
    if (snap.empty) {
      return [];
    }
    
    // 将毫秒时间戳转换为 Firestore Timestamp 用于比较
    const afterTime = Timestamp.fromMillis(afterTimestamp);
    
    // 客户端过滤、排序和限制
    const results = snap.docs
      .map(d => ({
        id: d.id,
        ...(d.data() as Omit<PhotoDoc, 'id'>)
      }))
      // 过滤：只要时间大于 afterTimestamp 的照片
      .filter(photo => {
        const photoTime = photo.createdAt as Timestamp;
        return photoTime.toMillis() > afterTime.toMillis();
      })
      // 排序：按时间倒序（新的在前）
      .sort((a, b) => {
        const aTime = (a.createdAt as Timestamp).toMillis();
        const bTime = (b.createdAt as Timestamp).toMillis();
        return bTime - aTime;
      })
      // 限制数量
      .slice(0, limitN);
    
    return results;
  } catch (error: any) {
    console.error('❌ getPhotosAfter 失败:', error);
    return [];
  }
}

/**
 * 分页加载：获取某个时间戳之前的照片（用于滚动加载更多历史）
 * @param uid 用户ID
 * @param beforeTimestamp 时间戳（毫秒），获取这个时间之前的照片
 * @param limitN 最多获取多少张，默认90（约30天）
 * @returns 照片数组，按时间倒序
 */
export async function getPhotosBefore(
  uid: string,
  beforeTimestamp: number,
  limitN = 90
): Promise<PhotoDoc[]> {
  try {
    // 简化查询：只用单字段查询避免需要复合索引
    // 在客户端进行时间过滤和排序
    const q = query(
      photosCol,
      where('uid', '==', uid)
      // 不使用 orderBy 和 where('createdAt', '<') 避免需要索引
    );
    
    const snap = await getDocs(q);
    
    if (snap.empty) {
      return [];
    }
    
    // 将毫秒时间戳转换为 Firestore Timestamp 用于比较
    const beforeTime = Timestamp.fromMillis(beforeTimestamp);
    
    // 客户端过滤、排序和限制
    const results = snap.docs
      .map(d => ({
        id: d.id,
        ...(d.data() as Omit<PhotoDoc, 'id'>)
      }))
      // 过滤：只要时间小于 beforeTimestamp 的照片
      .filter(photo => {
        const photoTime = photo.createdAt as Timestamp;
        return photoTime.toMillis() < beforeTime.toMillis();
      })
      // 排序：按时间倒序（新的在前）
      .sort((a, b) => {
        const aTime = (a.createdAt as Timestamp).toMillis();
        const bTime = (b.createdAt as Timestamp).toMillis();
        return bTime - aTime;
      })
      // 限制数量
      .slice(0, limitN);
    
    return results;
  } catch (error: any) {
    console.error('❌ getPhotosBefore 失败:', error);
    return [];
  }
}

/**
 * 批量上传照片并保存到Firestore
 */
export async function savePhotoWithAutoCleanup(
  uid: string,
  dateISO: string,
  url: string,
  localId: string
): Promise<string> {
  // 1. 创建照片文档
  const docId = await createPhotoDoc(uid, dateISO, url, localId);
  
  // 2. 自动清理超限照片
  await enforceDailyCap(uid, dateISO, 3);
  
  return docId;
}

// ========== User Profile Operations ==========

/**
 * 创建用户资料
 */
export const createUserProfile = async (
  userId: string,
  userData: Record<string, any>
): Promise<FirestoreResult> => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * 获取用户资料
 */
export const getUserProfile = async (
  userId: string
): Promise<FirestoreResult> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    } else {
      return { success: false, error: '用户资料不存在' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * 更新用户资料
 */
export const updateUserProfile = async (
  userId: string,
  userData: Record<string, any>
): Promise<FirestoreResult> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// ========== Skin Analysis Operations ==========

/**
 * 创建皮肤分析记录
 */
export const createSkinAnalysis = async (
  userId: string,
  analysisData: Record<string, any>
): Promise<FirestoreResult> => {
  try {
    const analysisRef = collection(db, 'skinAnalyses');
    const docRef = await addDoc(analysisRef, {
      userId,
      ...analysisData,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * 获取用户的所有分析记录
 */
export const getUserAnalyses = async (
  userId: string,
  limitCount: number = 10
): Promise<FirestoreResult<any[]>> => {
  try {
    const analysesRef = collection(db, 'skinAnalyses');
    const q = query(
      analysesRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    const analyses: any[] = [];
    querySnapshot.forEach((doc) => {
      analyses.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: analyses };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * 根据ID获取分析记录
 */
export const getAnalysisById = async (
  analysisId: string
): Promise<FirestoreResult> => {
  try {
    const analysisRef = doc(db, 'skinAnalyses', analysisId);
    const analysisDoc = await getDoc(analysisRef);
    if (analysisDoc.exists()) {
      return { 
        success: true, 
        data: { id: analysisDoc.id, ...analysisDoc.data() } 
      };
    } else {
      return { success: false, error: '分析记录不存在' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * 实时监听用户分析记录
 */
export const subscribeToUserAnalyses = (
  userId: string,
  callback: (analyses: any[]) => void
) => {
  const analysesRef = collection(db, 'skinAnalyses');
  const q = query(
    analysesRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(10)
  );

  return onSnapshot(q, (querySnapshot) => {
    const analyses: any[] = [];
    querySnapshot.forEach((doc) => {
      analyses.push({ id: doc.id, ...doc.data() });
    });
    callback(analyses);
  });
};

// ========== Survey Data Operations ==========

/**
 * 保存调查问卷数据
 */
export const saveSurveyData = async (
  userId: string,
  surveyData: Record<string, any>
): Promise<FirestoreResult> => {
  try {
    const surveyRef = doc(db, 'surveys', userId);
    await setDoc(surveyRef, {
      ...surveyData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * 获取调查问卷数据
 */
export const getSurveyData = async (
  userId: string
): Promise<FirestoreResult> => {
  try {
    const surveyRef = doc(db, 'surveys', userId);
    const surveyDoc = await getDoc(surveyRef);
    if (surveyDoc.exists()) {
      return { success: true, data: surveyDoc.data() };
    } else {
      return { success: false, error: '问卷数据不存在' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

