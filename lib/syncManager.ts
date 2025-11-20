// lib/syncManager.ts
// 照片同步管理模块 - 处理增量同步、分页加载、WiFi检测等

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { auth } from '@/firebase/config';
import { getPhotosAfter, getPhotosBefore, PhotoDoc } from '@/firebase/firestore';
import { Timestamp } from 'firebase/firestore';

// ========== 常量配置 ==========

const SYNC_CONFIG = {
  // 自动同步间隔（24小时）
  autoSyncInterval: 24 * 60 * 60 * 1000,
  
  // 首次登录加载天数（30天）
  firstLoadDays: 30,
  
  // 分页加载每次天数（30天，约90张照片）
  paginationDays: 30,
  
  // 同步超时时间（10秒）
  syncTimeout: 10000,
};

const STORAGE_KEYS = {
  lastSyncTime: 'skiri_last_sync_time',
  syncedPhotos: 'skiri_synced_photos',
  hasMoreHistory: 'skiri_has_more_history',
};

// ========== 类型定义 ==========

export type SyncResult = {
  success: boolean;
  newPhotos?: PhotoDoc[];
  error?: string;
  skipped?: boolean;
  reason?: 'offline' | 'timeout' | 'recently_synced' | 'mobile_network';
};

export type LoadMoreResult = {
  success: boolean;
  photos?: PhotoDoc[];
  hasMore?: boolean;
  error?: string;
};

// ========== WiFi 检测 ==========

/**
 * 检查是否连接到 WiFi
 */
export async function isWiFi(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.type === 'wifi';
  } catch (e) {
    console.error('❌ WiFi检测失败:', e);
    return false; // 保守起见，当作移动网络
  }
}

/**
 * 检查是否有网络连接
 */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true;
  } catch (e) {
    console.error('❌ 网络状态检测失败:', e);
    return false;
  }
}

// ========== 同步时间管理 ==========

/**
 * 获取上次同步时间
 */
export async function getLastSyncTime(): Promise<number> {
  try {
    const time = await AsyncStorage.getItem(STORAGE_KEYS.lastSyncTime);
    return time ? parseInt(time, 10) : 0;
  } catch (e) {
    console.error('❌ 获取上次同步时间失败:', e);
    return 0;
  }
}

/**
 * 保存同步时间
 */
export async function saveLastSyncTime(timestamp: number = Date.now()): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.lastSyncTime, timestamp.toString());
  } catch (e) {
    console.error('❌ 保存同步时间失败:', e);
  }
}

/**
 * 检查是否需要同步（基于24小时间隔）
 */
export async function shouldAutoSync(): Promise<boolean> {
  const lastSync = await getLastSyncTime();
  if (!lastSync) return true; // 从未同步过
  
  const hoursSinceSync = (Date.now() - lastSync) / (60 * 60 * 1000);
  return hoursSinceSync >= 24;
}

// ========== 增量同步（获取新照片）==========

/**
 * 增量同步：只获取上次同步之后的新照片
 * 用于：24小时自动同步、用户下拉刷新
 */
export async function syncNewPhotos(options?: {
  forceSync?: boolean;  // 强制同步（忽略时间间隔）
  checkWiFi?: boolean;  // 是否检查WiFi
}): Promise<SyncResult> {
  const { forceSync = false, checkWiFi = true } = options || {};
  
  try {
    // 1. 检查用户登录状态
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: '用户未登录' };
    }
    
    // 2. 检查网络状态
    const online = await isOnline();
    if (!online) {
      return { 
        success: false, 
        skipped: true, 
        reason: 'offline',
        error: '无网络连接'
      };
    }
    
    // 3. 检查是否是WiFi（可选）
    if (checkWiFi && !forceSync) {
      const wifi = await isWiFi();
      if (!wifi) {
        // 移动网络下，检查是否需要同步
        const shouldSync = await shouldAutoSync();
        if (!shouldSync) {
          return {
            success: false,
            skipped: true,
            reason: 'mobile_network',
            error: '移动网络下暂不自动同步'
          };
        }
      }
    }
    
    // 4. 检查同步间隔（除非强制同步）
    if (!forceSync) {
      const shouldSync = await shouldAutoSync();
      if (!shouldSync) {
        return {
          success: false,
          skipped: true,
          reason: 'recently_synced',
          error: '24小时内已同步'
        };
      }
    }
    
    // 5. 获取上次同步时间
    const lastSyncTime = await getLastSyncTime();
    const afterTimestamp = lastSyncTime || (Date.now() - SYNC_CONFIG.firstLoadDays * 24 * 60 * 60 * 1000);
    
    console.log('[syncManager] 开始增量同步，上次同步时间:', new Date(afterTimestamp).toISOString());
    
    // 6. 查询新照片（带超时）
    const newPhotos = await Promise.race([
      getPhotosAfter(user.uid, afterTimestamp, 50),
      new Promise<PhotoDoc[]>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), SYNC_CONFIG.syncTimeout)
      )
    ]);
    
    console.log(`[syncManager] 同步完成，发现 ${newPhotos.length} 张新照片`);
    
    // 7. 保存同步时间
    await saveLastSyncTime();
    
    return {
      success: true,
      newPhotos,
    };
    
  } catch (error: any) {
    console.error('❌ 增量同步失败:', error);
    
    if (error.message === 'timeout') {
      return {
        success: false,
        skipped: true,
        reason: 'timeout',
        error: '同步超时'
      };
    }
    
    return {
      success: false,
      error: error.message || '同步失败'
    };
  }
}

// ========== 分页加载（加载更早的照片）==========

/**
 * 分页加载：获取更早的照片（用于滚动加载更多）
 * @param beforeTimestamp 在这个时间之前的照片
 * @returns 照片数组和是否还有更多
 */
export async function loadMorePhotos(beforeTimestamp: number): Promise<LoadMoreResult> {
  try {
    // 1. 检查用户登录状态
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: '用户未登录' };
    }
    
    // 2. 检查网络状态
    const online = await isOnline();
    if (!online) {
      return { 
        success: false, 
        error: '无网络连接，无法加载更多'
      };
    }
    
    console.log('[syncManager] 开始加载更多照片，时间点:', new Date(beforeTimestamp).toISOString());
    
    // 3. 查询更早的照片（每次约30天，90张）
    const photos = await getPhotosBefore(user.uid, beforeTimestamp, 90);
    
    console.log(`[syncManager] 加载完成，获取 ${photos.length} 张照片`);
    
    // 4. 判断是否还有更多（如果返回90张，说明可能还有更多）
    const hasMore = photos.length >= 90;
    
    return {
      success: true,
      photos,
      hasMore,
    };
    
  } catch (error: any) {
    console.error('❌ 加载更多失败:', error);
    return {
      success: false,
      error: error.message || '加载失败'
    };
  }
}

// ========== 首次同步（新用户/新设备）==========

/**
 * 首次同步：加载最近30天的照片
 */
export async function firstTimeSync(): Promise<SyncResult> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: '用户未登录' };
    }
    
    const online = await isOnline();
    if (!online) {
      return { 
        success: false, 
        skipped: true, 
        reason: 'offline',
        error: '无网络连接'
      };
    }
    
    console.log('[syncManager] 首次同步，加载最近30天照片');
    
    // 计算30天前的时间戳
    const thirtyDaysAgo = Date.now() - SYNC_CONFIG.firstLoadDays * 24 * 60 * 60 * 1000;
    
    // 查询照片
    const photos = await getPhotosAfter(user.uid, thirtyDaysAgo, 200);
    
    console.log(`[syncManager] 首次同步完成，获取 ${photos.length} 张照片`);
    
    // 保存同步时间
    await saveLastSyncTime();
    
    // 标记可能还有更早的历史
    await AsyncStorage.setItem(STORAGE_KEYS.hasMoreHistory, 'true');
    
    return {
      success: true,
      newPhotos: photos,
    };
    
  } catch (error: any) {
    console.error('❌ 首次同步失败:', error);
    return {
      success: false,
      error: error.message || '首次同步失败'
    };
  }
}

// ========== 工具函数 ==========

/**
 * 将 Firestore Timestamp 转换为毫秒时间戳
 */
export function timestampToMs(timestamp: Timestamp | number): number {
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  return timestamp.toMillis();
}

/**
 * 清除所有同步缓存（用于登出）
 */
export async function clearSyncCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.lastSyncTime,
      STORAGE_KEYS.syncedPhotos,
      STORAGE_KEYS.hasMoreHistory,
    ]);
    console.log('[syncManager] 同步缓存已清除');
  } catch (e) {
    console.error('❌ 清除同步缓存失败:', e);
  }
}

