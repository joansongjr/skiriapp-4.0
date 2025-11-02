// lib/tags/store.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Sentiment, TagSource } from './constants';

export interface TagItem { label: string; sentiment: Sentiment; source: TagSource }
export type DayMap = Record<string, TagItem[]>; // { 'YYYY-MM-DD': TagItem[] }

export const TAG_LIB_KEY = 'skiri_user_tag_library_v1'; // 只存用户自建
export const DAY_RECORDS_KEY = 'skiri_day_records_v1';

export const dateKey = (d = new Date()) => d.toISOString().slice(0,10);

export async function loadTagLibrary(): Promise<TagItem[]> {
  const raw = await AsyncStorage.getItem(TAG_LIB_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as TagItem[] } catch { return [] }
}
export async function saveTagLibrary(tags: TagItem[]) {
  await AsyncStorage.setItem(TAG_LIB_KEY, JSON.stringify(tags));
}

export async function loadDayRecords(): Promise<DayMap> {
  const raw = await AsyncStorage.getItem(DAY_RECORDS_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw) as DayMap } catch { return {} }
}
export async function saveDayRecords(map: DayMap) {
  await AsyncStorage.setItem(DAY_RECORDS_KEY, JSON.stringify(map));
}

export const dedupeByLabel = (arr: TagItem[]) => {
  const map = new Map<string, TagItem>();
  for (const t of arr) map.set(t.label, t);
  return Array.from(map.values());
};

