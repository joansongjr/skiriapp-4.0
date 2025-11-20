// store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PhotoDoc } from '@/firebase/firestore';
import { Timestamp } from 'firebase/firestore';

export type PhotoItem = {
  id: string;
  uri: string;
  dateISO: string;   // 'YYYY-MM-DD'
  createdAt: number; // timestamp
  cloudUrl?: string; // 云端URL（如果已上传）
  uploaded?: boolean; // 是否已上传到云端
};

const MAX_PHOTOS_PER_DAY = 3;

type SyncStatus = 'idle' | 'syncing' | 'loading_more' | 'error';

type StoreState = {
  // 本地照片（用户拍的照片）
  dailyPhotos: Record<string, PhotoItem[]>; // { '2025-11-02': [photo1, photo2, photo3] }
  
  // 同步相关状态
  syncStatus: SyncStatus;
  lastSyncTime: number;  // 上次同步时间戳
  hasMoreHistory: boolean;  // 是否还有更早的照片可以加载
  
  // 照片操作
  addPhoto: (p: PhotoItem) => void;
  removePhoto: (id: string) => void;
  updatePhotoUri?: (id: string, newUri: string) => void;
  
  // 同步操作
  setSyncStatus: (status: SyncStatus) => void;
  mergeSyncedPhotos: (photos: PhotoDoc[]) => void;  // 合并同步的照片（用于增量同步）
  appendOlderPhotos: (photos: PhotoDoc[]) => void;  // 追加更早的照片（用于分页加载）
  setHasMoreHistory: (hasMore: boolean) => void;
  updateLastSyncTime: (time: number) => void;
};

export const useAppStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // 初始状态
      dailyPhotos: {},
      syncStatus: 'idle',
      lastSyncTime: 0,
      hasMoreHistory: true,
      
      // ========== 照片操作 ==========
      
      // 添加照片：每天最多3张，超过则删除最旧的
      addPhoto: (p) => {
        const current = get().dailyPhotos;
        const existing = current[p.dateISO];
        
        // 兼容旧数据：确保 dayPhotos 是数组
        let dayPhotos: PhotoItem[] = [];
        if (Array.isArray(existing)) {
          dayPhotos = existing;
        } else if (existing) {
          // 如果是旧格式的单个对象，转换为数组
          dayPhotos = [existing as any];
        }
        
        // 添加新照片到数组头部
        const updated = [p, ...dayPhotos];
        
        // 如果超过3张，只保留最新的3张
        const limited = updated.slice(0, MAX_PHOTOS_PER_DAY);
        
        set({ 
          dailyPhotos: { ...current, [p.dateISO]: limited } 
        });
      },
      
      // 删除指定照片
      removePhoto: (id) => {
        const current = get().dailyPhotos;
        const updated: Record<string, PhotoItem[]> = {};
        
        Object.entries(current).forEach(([date, photos]) => {
          const filtered = photos.filter(p => p.id !== id);
          if (filtered.length > 0) {
            updated[date] = filtered;
          }
        });
        
        set({ dailyPhotos: updated });
      },
      
      // 更新照片URI（上传成功后替换为Firebase URL）
      updatePhotoUri: (id, newUri) => {
        const current = get().dailyPhotos;
        const updated: Record<string, PhotoItem[]> = {};
        
        Object.entries(current).forEach(([date, photos]) => {
          updated[date] = photos.map(p => 
            p.id === id ? { ...p, uri: newUri, cloudUrl: newUri, uploaded: true } : p
          );
        });
        
        set({ dailyPhotos: updated });
      },
      
      // ========== 同步操作 ==========
      
      // 设置同步状态
      setSyncStatus: (status) => {
        set({ syncStatus: status });
      },
      
      // 合并同步的照片（用于增量同步、下拉刷新）
      mergeSyncedPhotos: (photos) => {
        const current = get().dailyPhotos;
        const updated = { ...current };
        
        // 将 PhotoDoc 转换为 PhotoItem 并合并
        photos.forEach(photoDoc => {
          const photoItem: PhotoItem = {
            id: photoDoc.id,
            uri: photoDoc.url,  // 云端URL
            cloudUrl: photoDoc.url,
            dateISO: photoDoc.dateISO,
            createdAt: typeof photoDoc.createdAt === 'number' 
              ? photoDoc.createdAt 
              : (photoDoc.createdAt as Timestamp).toMillis(),
            uploaded: true,
          };
          
          const dayPhotos = updated[photoItem.dateISO] || [];
          
          // 检查是否已存在（避免重复）
          const exists = dayPhotos.some(p => p.id === photoItem.id);
          if (!exists) {
            // 添加到对应日期的数组头部
            updated[photoItem.dateISO] = [photoItem, ...dayPhotos].slice(0, MAX_PHOTOS_PER_DAY);
          }
        });
        
        set({ dailyPhotos: updated });
      },
      
      // 追加更早的照片（用于分页加载）
      appendOlderPhotos: (photos) => {
        const current = get().dailyPhotos;
        const updated = { ...current };
        
        // 将 PhotoDoc 转换为 PhotoItem 并追加
        photos.forEach(photoDoc => {
          const photoItem: PhotoItem = {
            id: photoDoc.id,
            uri: photoDoc.url,
            cloudUrl: photoDoc.url,
            dateISO: photoDoc.dateISO,
            createdAt: typeof photoDoc.createdAt === 'number' 
              ? photoDoc.createdAt 
              : (photoDoc.createdAt as Timestamp).toMillis(),
            uploaded: true,
          };
          
          const dayPhotos = updated[photoItem.dateISO] || [];
          
          // 检查是否已存在
          const exists = dayPhotos.some(p => p.id === photoItem.id);
          if (!exists) {
            // 追加到数组尾部
            updated[photoItem.dateISO] = [...dayPhotos, photoItem];
          }
        });
        
        set({ dailyPhotos: updated });
      },
      
      // 设置是否还有更多历史
      setHasMoreHistory: (hasMore) => {
        set({ hasMoreHistory: hasMore });
      },
      
      // 更新上次同步时间
      updateLastSyncTime: (time) => {
        set({ lastSyncTime: time });
      },
    }),
    { name: 'skiri-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);

// 辅助函数：将dailyPhotos转换为扁平数组（按时间排序）
export const getPhotosArray = (dailyPhotos: Record<string, PhotoItem[]>): PhotoItem[] => {
  const allPhotos = Object.values(dailyPhotos).flat();
  return allPhotos.sort((a, b) => b.createdAt - a.createdAt);
};

// 选择器
export const selectRecent = (n = 10) => (s: StoreState) => getPhotosArray(s.dailyPhotos).slice(0, n);
export const selectByDate = (iso: string) => (s: StoreState) => s.dailyPhotos[iso] || [];
export const selectWeekStreak = () => (s: StoreState) => {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0,10);
    if (s.dailyPhotos[iso]?.length > 0) streak++; else break;
  }
  return streak;
};

