// app/(tabs)/home.tsx
import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useAppStore, getPhotosArray } from '../../store';
import { syncNewPhotos, loadMorePhotos, firstTimeSync } from '@/lib/syncManager';

// 与 triggers.tsx 对齐：Home 仅需要读取当天/历史已保存的 Selected 标签
type TagItem = { label: string }; // 现在只用坏标签一种样式，简化为只读 label
type DayMap = Record<string, TagItem[]>; // { "YYYY-MM-DD": TagItem[] }
const DAY_RECORDS_KEY = "skiri_day_records_v1";

// 工具：将 "YYYY-MM-DD" 转成 Date 并排序、做展示用文案
const parseDateKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};
const isSameDate = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const dayLabelFromKey = (key: string) => {
  const d = parseDateKey(key);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (isSameDate(d, today)) return "Today";
  if (isSameDate(d, yest)) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// —— UI: 只渲染"坏标签"一种样式 ——
const Pill = ({ label }: { label: string }) => {
  return (
    <View style={[styles.pill, styles.pillBad]}>
      <Text style={[styles.pillText, styles.pillTextBad]}>{label}</Text>
    </View>
  );
};

const RecentItem = ({
  dayKey,
  items,
  photoUri,
}: {
  dayKey: string;
  items: TagItem[];
  photoUri?: string;
}) => {
  const [a, b, ...rest] = items;
  return (
    <View style={styles.recentRow}>
      <View style={styles.thumbPlaceholder}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.thumbImage} />
        ) : (
          <>
            <View style={[styles.thumbCircle, { width: 72, height: 72 }]} />
            <View style={[styles.thumbCircle, { width: 48, height: 48 }]} />
            <View style={[styles.thumbCircle, { width: 24, height: 24 }]} />
          </>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.recentDay}>{dayLabelFromKey(dayKey)}</Text>

        <View style={styles.tagRow}>
          {a && <Pill label={a.label} />}
          {b && <Pill label={b.label} />}
          {rest.length > 0 && (
            <Text style={{ marginLeft: 8, color: "#6b7280", fontWeight: "600" }}>
              +{rest.length} more
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.recentTime}>{dayKey}</Text>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const [dayList, setDayList] = useState<Array<{ key: string; items: TagItem[] }>>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  
  // Store 状态
  const dailyPhotos = useAppStore(state => state.dailyPhotos);
  const syncStatus = useAppStore(state => state.syncStatus);
  const hasMoreHistory = useAppStore(state => state.hasMoreHistory);
  const lastSyncTime = useAppStore(state => state.lastSyncTime);
  const mergeSyncedPhotos = useAppStore(state => state.mergeSyncedPhotos);
  const appendOlderPhotos = useAppStore(state => state.appendOlderPhotos);
  const setSyncStatus = useAppStore(state => state.setSyncStatus);
  const setHasMoreHistory = useAppStore(state => state.setHasMoreHistory);
  const updateLastSyncTime = useAppStore(state => state.updateLastSyncTime);

  // 获取所有照片的数组（按时间倒序）
  const photosArray = getPhotosArray(dailyPhotos);
  
  // 按日期分组
  const photosByDate = Object.keys(dailyPhotos)
    .sort((a, b) => +parseDateKey(b) - +parseDateKey(a))
    .map(dateKey => ({
      dateKey,
      photos: dailyPhotos[dateKey],
      tags: dayList.find(d => d.key === dateKey)?.items || [],
    }));

  // 进入页面时，读取标签记录
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const raw = await AsyncStorage.getItem(DAY_RECORDS_KEY);
        const map: DayMap = raw ? JSON.parse(raw) : {};
        const sorted = Object.keys(map)
          .sort((a, b) => +parseDateKey(b) - +parseDateKey(a))
          .map((k) => ({ key: k, items: map[k] || [] }));
        setDayList(sorted);
      })();
    }, [])
  );

  // 首次加载或24小时自动同步
  useEffect(() => {
    (async () => {
      // 如果从未同步过，执行首次同步
      if (!lastSyncTime || lastSyncTime === 0) {
        console.log('[Home] 首次同步');
        setSyncStatus('syncing');
        const result = await firstTimeSync();
        
        if (result.success && result.newPhotos) {
          mergeSyncedPhotos(result.newPhotos);
          updateLastSyncTime(Date.now());
          setSyncMessage(`已加载 ${result.newPhotos.length} 张照片`);
          setTimeout(() => setSyncMessage(''), 3000);
        }
        
        setSyncStatus('idle');
        return;
      }
      
      // 24小时自动同步（不强制，会检查WiFi）
      const result = await syncNewPhotos({ forceSync: false, checkWiFi: true });
      
      if (result.success && result.newPhotos && result.newPhotos.length > 0) {
        mergeSyncedPhotos(result.newPhotos);
        updateLastSyncTime(Date.now());
        setSyncMessage(`发现 ${result.newPhotos.length} 张新照片`);
        setTimeout(() => setSyncMessage(''), 3000);
      } else if (result.skipped) {
        console.log('[Home] 同步跳过:', result.reason);
      }
    })();
  }, []);

  // 下拉刷新
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setSyncMessage('');
    
    // 强制同步（忽略时间间隔和WiFi检查）
    const result = await syncNewPhotos({ forceSync: true, checkWiFi: false });
    
    if (result.success && result.newPhotos) {
      mergeSyncedPhotos(result.newPhotos);
      updateLastSyncTime(Date.now());
      
      if (result.newPhotos.length > 0) {
        setSyncMessage(`已同步 ${result.newPhotos.length} 张新照片`);
      } else {
        setSyncMessage('已是最新');
      }
    } else if (result.error) {
      setSyncMessage(result.error);
    }
    
    setTimeout(() => setSyncMessage(''), 3000);
    setRefreshing(false);
  }, [mergeSyncedPhotos, updateLastSyncTime]);

  // 滚动到底部，加载更多
  const onLoadMore = useCallback(async () => {
    if (loadingMore || !hasMoreHistory) return;
    
    // 获取最旧的照片的时间戳
    const oldestPhoto = photosArray[photosArray.length - 1];
    if (!oldestPhoto) {
      setHasMoreHistory(false);
      return;
    }
    
    console.log('[Home] 加载更多历史照片，最旧照片时间:', new Date(oldestPhoto.createdAt).toISOString());
    
    setLoadingMore(true);
    setSyncStatus('loading_more');
    
    const result = await loadMorePhotos(oldestPhoto.createdAt);
    
    if (result.success && result.photos) {
      appendOlderPhotos(result.photos);
      setHasMoreHistory(result.hasMore || false);
      
      if (result.photos.length > 0) {
        setSyncMessage(`已加载 ${result.photos.length} 张历史照片`);
        setTimeout(() => setSyncMessage(''), 2000);
      }
    } else if (result.error) {
      setSyncMessage(result.error);
      setTimeout(() => setSyncMessage(''), 2000);
    }
    
    setLoadingMore(false);
    setSyncStatus('idle');
  }, [loadingMore, hasMoreHistory, photosArray, appendOlderPhotos, setHasMoreHistory]);

  // 渲染列表头部
  const renderHeader = () => (
    <>
        {/* App Title + Bell */}
        <View style={styles.titleRow}>
          <Text style={styles.appTitle}>skiri</Text>
          <TouchableOpacity style={styles.bellTouch}>
            <Ionicons name="notifications-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

      {/* 同步消息提示 */}
      {syncMessage ? (
        <View style={styles.syncMessage}>
          <Text style={styles.syncMessageText}>{syncMessage}</Text>
        </View>
      ) : null}

        {/* Card: Today's Photo */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="camera-outline" size={22} color="#000" />
            <Text style={styles.cardTitle}>Today&apos;s Photo</Text>
          </View>

          <Text style={styles.cardSubtitle}>No photo for today</Text>

          <TouchableOpacity
            style={styles.takePhotoBtn}
            onPress={() => router.push("/camera/shoot")}
          >
            <Text style={styles.takePhotoText}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Card: This Week's Progress */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="trending-up-outline" size={22} color="#000" />
            <Text style={styles.cardTitle}>This Week's Progress</Text>
          </View>

          <View style={styles.progressRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.progressLabel}>Acne area</Text>

              <View style={styles.calendarRow}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color="#000"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.calendarText}>
                  Recorded {Math.min(dayList.length, 7)} / 7 days
                </Text>
              </View>
            </View>

            <Text style={styles.progressValue}>-12%</Text>
          </View>
        </View>

        {/* Recently Upload */}
        <Text style={styles.sectionTitle}>Recently Upload</Text>

      {photosByDate.length === 0 && (
          <Text style={{ color: "#6b7280", marginBottom: 16 }}>
          No records yet. Pull down to sync from cloud or take a photo.
          </Text>
      )}
    </>
  );

  // 渲染每一天的照片
  const renderItem = ({ item, index }: { item: typeof photosByDate[0]; index: number }) => {
    const latestPhoto = item.photos[0];
    
    return (
      <View>
        <RecentItem 
          dayKey={item.dateKey} 
          items={item.tags} 
          photoUri={latestPhoto?.uri} 
        />
        {index < photosByDate.length - 1 && <View style={styles.divider} />}
      </View>
    );
  };

  // 渲染底部加载更多
  const renderFooter = () => {
    if (!hasMoreHistory) {
      return (
        <View style={styles.footerText}>
          <Text style={{ color: "#9ca3af", fontSize: 14 }}>已加载全部历史照片</Text>
        </View>
      );
    }
    
    if (loadingMore) {
            return (
        <View style={styles.footerLoading}>
          <ActivityIndicator color="#18e4aa" />
          <Text style={{ color: "#6b7280", marginLeft: 8 }}>加载更多...</Text>
              </View>
            );
    }
    
    return <View style={{ height: 20 }} />;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={photosByDate}
        keyExtractor={(item) => item.dateKey}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#18e4aa"
            colors={['#18e4aa']}
          />
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#ffffff" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120, backgroundColor: "#fff" },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: 8, marginBottom: 16,
  },
  appTitle: { fontSize: 36, fontWeight: "700", color: "#000" },
  bellTouch: { padding: 8 },

  // 同步消息提示
  syncMessage: {
    backgroundColor: "#18e4aa",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  syncMessageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },

  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 }, elevation: 4, borderWidth: 1, borderColor: "rgba(0,0,0,0.03)",
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontSize: 20, fontWeight: "700", color: "#000", marginLeft: 10 },
  cardSubtitle: { fontSize: 15, fontWeight: "500", color: "#6b7280", marginBottom: 16 },

  takePhotoBtn: { backgroundColor: "#18e4aa", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  takePhotoText: { fontSize: 18, fontWeight: "700", color: "#000" },

  progressRow: { flexDirection: "row", alignItems: "flex-start" },
  progressLabel: { fontSize: 17, fontWeight: "700", color: "#000", marginBottom: 8 },
  calendarRow: { flexDirection: "row", alignItems: "center" },
  calendarText: { fontSize: 15, fontWeight: "500", color: "#4b5563" },
  progressValue: { fontSize: 24, fontWeight: "700", color: "#000" },

  sectionTitle: { fontSize: 24, fontWeight: "700", color: "#000", marginTop: 8, marginBottom: 16 },
  recentRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  thumbPlaceholder: {
    width: 88, height: 88, borderRadius: 12, backgroundColor: "#f9fafb",
    borderWidth: 1, borderColor: "#e5e7eb", marginRight: 16, justifyContent: "center", alignItems: "center", overflow: "hidden",
  },
  thumbCircle: { position: "absolute", borderRadius: 999, borderWidth: 1, borderColor: "#d1d5db" },
  thumbImage: { width: "100%", height: "100%", resizeMode: "cover" },
  recentDay: { fontSize: 20, fontWeight: "700", color: "#000", marginBottom: 8 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  recentTime: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  divider: { height: 1, backgroundColor: "#e5e7eb", marginBottom: 16 },

  pill: { borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  pillBad: { backgroundColor: "#ef444430" },
  pillText: { fontSize: 13, fontWeight: "600" },
  pillTextBad: { color: "#7f1d1d" },

  // 底部加载状态
  footerLoading: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  footerText: {
    alignItems: "center",
    paddingVertical: 20,
  },
});
