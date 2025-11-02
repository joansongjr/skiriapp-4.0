// app/camera/preview.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "../../store";

export default function CameraPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uri?: string }>();
  const uri = params?.uri as string | undefined;
  const addPhoto = useAppStore(s => s.addPhoto);

  const onBack = () => router.back();
  const onRetake = () => router.replace("/camera/shoot");
  const onConfirm = () => {
    // 保存照片到store
    if (uri) {
      const now = new Date();
      const dateISO = now.toISOString().slice(0,10);
      addPhoto({ id: String(Date.now()), uri, dateISO, createdAt: Date.now() });
    }
    // 跳到分析页，并传递照片 uri
    router.push({ pathname: "/camera/analysis", params: { uri } });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      {/* 背景：拍到的照片；若没有传uri，用纯灰色背景占位 */}
      {uri ? (
        <ImageBackground source={{ uri }} style={styles.bg} resizeMode="cover">
          <SafeAreaView style={styles.safe}>
            {/* 顶部自定义返回 */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* 底部文案 + 按钮组 */}
            <View style={styles.bottomWrap}>
              <View style={styles.tipBox}>
                <Text style={styles.tipText}>
                  Face: make sure it's clear and well lit.
                </Text>
                <Text style={styles.tipText}>
                  Others: ensure good lighting and focus.
                </Text>
              </View>

              <TouchableOpacity style={styles.retakeBtn} onPress={onRetake}>
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
                <Text style={styles.confirmText}>Confirm & Analyze</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </ImageBackground>
      ) : (
        // 没有传uri的占位：保证页面也能跑起来
        <SafeAreaView style={[styles.bg, { backgroundColor: "#111" }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: "#999" }}>No image preview. Pass ?uri=...</Text>
          </View>

          <View style={styles.bottomWrap}>
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                Face: make sure it's clear and well lit.
              </Text>
              <Text style={styles.tipText}>
                Others: ensure good lighting and focus.
              </Text>
            </View>

            <TouchableOpacity style={styles.retakeBtn} onPress={onRetake}>
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>Confirm & Analyze</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const MINT = "#b7ffe6"; // 按你Home页的薄荷绿风格

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  bg: { flex: 1, width: "100%", height: "100%" },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 12,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 24,
    paddingHorizontal: 16,
    gap: 12,
  },
  tipBox: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    maxWidth: "92%",
  },
  tipText: { color: "#fff", fontSize: 16, lineHeight: 22, textAlign: "center" },
  retakeBtn: {
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
  },
  retakeText: { color: "#111", fontSize: 20, fontWeight: "700" },
  confirmBtn: {
    backgroundColor: MINT,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmText: { color: "#000", fontSize: 20, fontWeight: "700" },
});
