// app/(tabs)/home.tsx
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useAppStore } from '../../store';

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
  
  const dailyPhotos = useAppStore(state => state.dailyPhotos);

  // 进入页面/获得焦点时，读取最近的日记录
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App Title + Bell */}
        <View style={styles.titleRow}>
          <Text style={styles.appTitle}>skiri</Text>
          <TouchableOpacity style={styles.bellTouch}>
            <Ionicons name="notifications-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

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

        {dayList.length === 0 ? (
          <Text style={{ color: "#6b7280", marginBottom: 16 }}>
            No records yet. Go to Camera → Analysis → Triggers to add today's tags.
          </Text>
        ) : (
          dayList.slice(0, 7).map((row, idx, arr) => {
            const dayPhotos = dailyPhotos[row.key] || [];
            const latestPhoto = dayPhotos[0]; // 显示当天最新的照片
            return (
              <View key={row.key}>
                <RecentItem dayKey={row.key} items={row.items} photoUri={latestPhoto?.uri} />
                {idx < Math.min(arr.length, 7) - 1 && <View style={styles.divider} />}
              </View>
            );
          })
        )}
      </ScrollView>
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
});
