// app/(tabs)/progress.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Pressable,
} from "react-native";
import { useAppStore, getPhotosArray } from '../../store';

const UI = {
  bg: "#F6F7F8",
  card: "#FFFFFF",
  text: "#11181C",
  sub: "#6B7280",
  accent: "#0F172A",
  stroke: "#E6ECF2",
  dotFilled: "#0F172A",
  dotEmpty: "#C9D3DD",
  shadow: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  } as const,
};

type Period = "90d" | "6m" | "1y" | "all";

export default function ProgressScreen() {
  const [period, setPeriod] = useState<Period>("90d");
  const dailyPhotos = useAppStore(state => state.dailyPhotos);
  const photos = getPhotosArray(dailyPhotos).slice(0, 6);

  // Mock data - 7-day streak dots
  const streakDays = [true, true, true, false, true, true, true];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.title}>Progress</Text>

        {/* Top Cards Row */}
        <View style={[styles.row, { gap: 14, marginBottom: 14 }]}>
          {/* Skin Score Card */}
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.cardLabel}>SKIN SCORE</Text>
            <Text style={styles.score}>73</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: "73%" }]} />
            </View>
          </View>

          {/* Weekly Streak Card */}
          <View style={[styles.card, { flex: 1, alignItems: "center" }]}>
            <Text style={styles.cardLabel}>THIS WEEK</Text>
            <Text style={styles.cameraEmoji}>📸</Text>

            {/* Dots */}
            <View style={styles.streakDotsRow}>
              {streakDays.map((filled, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    filled ? styles.dotFilled : styles.dotEmpty,
                  ]}
                />
              ))}
            </View>

            {/* Labels */}
            <View style={styles.streakLabelsRow}>
              {["M", "T", "W", "T", "F", "S", "S"].map((label, i) => (
                <Text key={i} style={styles.streakLabel}>
                  {label}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Segment Control */}
        <View style={styles.segmentWrap}>
          {(
            [
              { key: "90d", label: "90 Days" },
              { key: "6m", label: "6 Months" },
              { key: "1y", label: "1 Year" },
              { key: "all", label: "All time" },
            ] as const
          ).map((seg) => (
            <TouchableOpacity
              key={seg.key}
              style={[
                styles.segmentBtn,
                period === seg.key && styles.segmentBtnActive,
              ]}
              onPress={() => setPeriod(seg.key)}
            >
              <Text
                style={[
                  styles.segmentText,
                  period === seg.key && styles.segmentTextActive,
                ]}
              >
                {seg.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart Placeholder */}
        <View style={styles.chartCard}>
          <Text style={styles.chartIcon}>📊</Text>
          <Text style={styles.chartTitle}>Chart Placeholder</Text>
          <Text style={styles.chartSub}>
            Connect Recharts / Victory / Skia here
          </Text>
        </View>

        {/* Your Acne Book */}
        <Text style={styles.sectionTitle}>Your Acne Book</Text>
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => {
            const p = photos[i];
            return (
              <Pressable
                key={i}
                style={styles.gridItem}
              >
                {p
                  ? <Image source={{ uri: p.uri }} style={{ width:'100%', height:'100%', borderRadius:18 }} />
                  : <Text style={styles.placeholder}>+</Text>}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  title: { fontSize: 34, fontWeight: "800", color: UI.text, marginTop: 8, marginBottom: 12 },
  row: { flexDirection: "row" },
  card: {
    backgroundColor: UI.card,
    borderRadius: 20,
    padding: 18,
    ...UI.shadow,
  },
  cardLabel: { fontSize: 14, color: UI.sub, marginBottom: 8 },
  score: { fontSize: 42, fontWeight: "800", color: UI.text, marginBottom: 12 },
  progressBarBg: {
    height: 12,
    borderRadius: 8,
    backgroundColor: UI.stroke,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: UI.accent, borderRadius: 8 },
  cameraEmoji: { fontSize: 28, marginBottom: 8 },
  streakDotsRow: { flexDirection: "row", justifyContent: "space-between", width: "86%", marginTop: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotFilled: { backgroundColor: UI.dotFilled },
  dotEmpty: { backgroundColor: UI.dotEmpty },
  streakLabelsRow: { flexDirection: "row", justifyContent: "space-between", width: "86%", marginTop: 6 },
  streakLabel: { fontSize: 12, letterSpacing: 1, color: UI.text },

  segmentWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E9EEF5",
    padding: 6,
    borderRadius: 20,
    marginTop: 18,
  },
  segmentBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  segmentBtnActive: { backgroundColor: UI.card, ...UI.shadow },
  segmentText: { fontSize: 14, color: UI.sub, fontWeight: "600" },
  segmentTextActive: { color: UI.text },

  chartCard: {
    backgroundColor: UI.card,
    borderRadius: 22,
    paddingVertical: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    ...UI.shadow,
  },
  chartIcon: { fontSize: 28, marginBottom: 8 },
  chartTitle: { fontSize: 16, color: UI.sub, marginBottom: 6 },
  chartSub: { fontSize: 14, color: UI.sub },

  sectionTitle: { fontSize: 18, fontWeight: "800", color: UI.text, marginTop: 22, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: "#E6EBF1",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: { color: "#9AA8B6", fontSize: 14 },
});
