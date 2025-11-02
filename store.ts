// store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PhotoItem = {
  id: string;
  uri: string;
  dateISO: string;   // 'YYYY-MM-DD'
  createdAt: number; // timestamp
};

const MAX_PHOTOS_PER_DAY = 3;

type StoreState = {
  // 每天最多保留3张照片
  dailyPhotos: Record<string, PhotoItem[]>; // { '2025-11-02': [photo1, photo2, photo3] }
  addPhoto: (p: PhotoItem) => void;
  removePhoto: (id: string) => void;
};

export const useAppStore = create<StoreState>()(
  persist(
    (set, get) => ({
      dailyPhotos: {},
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

