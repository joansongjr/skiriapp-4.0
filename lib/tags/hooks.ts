// lib/tags/hooks.ts
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { dateKey, loadDayRecords, loadTagLibrary, type TagItem } from './store';

export function useTagLibrary() {
  const [lib, setLib] = useState<TagItem[]>([]);
  useFocusEffect(useCallback(() => { loadTagLibrary().then(setLib); }, []));
  return [lib, setLib] as const;
}

export function useDayTags(d: Date = new Date()) {
  const key = dateKey(d);
  const [tags, setTags] = useState<TagItem[]>([]);
  useFocusEffect(useCallback(() => { loadDayRecords().then(m => setTags(m[key] || [])); }, [key]));
  return tags;
}

