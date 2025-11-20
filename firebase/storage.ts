// firebase/storage.ts
// Firebase Storage 文件操作

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';

export type UploadProgress = {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
};

/**
 * 上传照片到Firebase Storage
 * @param localUri 本地照片URI
 * @param userId 用户ID
 * @param dateISO 日期 YYYY-MM-DD
 * @returns Firebase Storage的下载URL
 */
export async function uploadPhoto(
  localUri: string,
  userId: string,
  dateISO: string
): Promise<string> {
  try {
    console.log('[storage] 开始上传照片');
    console.log('[storage] URI:', localUri);
    
    // 生成唯一文件名
    const timestamp = Date.now();
    const fileName = `${dateISO}_${timestamp}.jpg`;
    // 临时使用 temp 路径（调试期间）
    const storagePath = `temp/${userId}/${fileName}`;
    console.log('[storage] 存储路径:', storagePath);
    
    // 读取本地文件为blob
    console.log('[storage] 开始 fetch 本地文件...');
    const response = await fetch(localUri);
    console.log('[storage] Fetch 成功，状态:', response.status);
    
    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }
    
    const blob = await response.blob();
    console.log('[storage] Blob 大小:', blob.size, 'bytes');
    console.log('[storage] Blob 类型:', blob.type);
    
    // 创建Storage引用
    const storageRef = ref(storage, storagePath);
    console.log('[storage] 开始上传到 Firebase Storage...');
    
    // 上传文件
    await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg',
    });
    console.log('[storage] 上传完成，获取下载 URL...');
    
    // 获取下载URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log('[storage] 下载 URL:', downloadURL);
    
    return downloadURL;
  } catch (error: any) {
    console.error('[storage] ❌ 上传失败');
    console.error('[storage] 错误代码:', error?.code);
    console.error('[storage] 错误信息:', error?.message);
    console.error('[storage] 错误名称:', error?.name);

    try {
      console.error('[storage] 完整错误:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch {}

    throw error;
  }
}

/**
 * 上传照片到Firebase Storage (Base64兜底方案)
 * @param localUri 本地照片URI
 * @param userId 用户ID
 * @param dateISO 日期 YYYY-MM-DD
 * @param localId 本地照片ID
 * @returns Firebase Storage的下载URL
 */
export async function uploadPhotoBase64(
  localUri: string,
  userId: string,
  dateISO: string,
  localId: string
): Promise<string> {
  try {
    console.log('[storage] Base64: 开始上传');
    console.log('[storage] Base64: URI:', localUri);
    
    // 生成唯一文件名
    const timestamp = Date.now();
    const fileName = `${dateISO}_${timestamp}.jpg`;
    // 临时使用 temp 路径（调试期间）
    const storagePath = `temp/${userId}/${fileName}`;
    console.log('[storage] Base64: 存储路径:', storagePath);
    
    // 读取文件为base64（使用 legacy API）
    console.log('[storage] Base64: 读取文件...');
    const base64 = await readAsStringAsync(localUri, {
      encoding: EncodingType.Base64,
    });
    console.log('[storage] Base64: 文件大小:', base64.length, '字符');
    
    // React Native 环境：直接使用 base64 上传
    console.log('[storage] Base64: 转换为 Blob...');
    const response = await fetch(`data:image/jpeg;base64,${base64}`);
    const blob = await response.blob();
    console.log('[storage] Base64: Blob 大小:', blob.size, 'bytes');
    
    // 创建Storage引用
    const storageRef = ref(storage, storagePath);
    console.log('[storage] Base64: 开始上传到 Firebase...');
    
    // 上传文件
    await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg',
    });
    console.log('[storage] Base64: 上传完成，获取 URL...');
    
    // 获取下载URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log('[storage] Base64: 下载 URL:', downloadURL);
    
    return downloadURL;
  } catch (error: any) {
    console.error('[storage] Base64: ❌ 上传失败');
    console.error('[storage] Base64: 错误代码:', error?.code);
    console.error('[storage] Base64: 错误信息:', error?.message);

    try {
      console.error('[storage] Base64: 完整错误:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch {}

    throw error;
  }
}

/**
 * 删除Firebase Storage中的照片
 * @param photoUrl Firebase Storage URL
 */
export async function deletePhoto(photoUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, photoUrl);
    await deleteObject(storageRef);
  } catch (error: any) {
    // 打印 SDK 错误码
    console.log('[storage] deletePhoto code =', error?.code);

    // 尽量把隐藏的字段打印出来
    try {
      console.log('[storage] deletePhoto full error =', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch {}

    throw error;
  }
}

/**
 * 批量上传照片（限制并发）
 */
export async function uploadPhotoBatch(
  photos: Array<{ localUri: string; dateISO: string }>,
  userId: string,
  maxConcurrent = 3
): Promise<string[]> {
  const results: string[] = [];
  
  for (let i = 0; i < photos.length; i += maxConcurrent) {
    const batch = photos.slice(i, i + maxConcurrent);
    const urls = await Promise.all(
      batch.map(p => uploadPhoto(p.localUri, userId, p.dateISO))
    );
    results.push(...urls);
  }
  
  return results;
}

