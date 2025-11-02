import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import RingGauge from "../../components/ui/RingGauge";

export default function CameraAnalysis() {
  const router = useRouter();
  const { uri } = useLocalSearchParams(); // 从 preview 传过来的照片地址

  const goNext = () => {
    router.push("/camera/triggers");
  };

  return (
    <View style={styles.container}>
      {/* 照片区域 */}
      <View style={styles.imageWrap}>
        {uri ? (
          <Image source={{ uri: uri as string }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text>No image</Text>
          </View>
        )}

        {/* 返回按钮 */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* 下半部分内容 */}
      <ScrollView
        style={styles.bottom}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 五个结果卡 */}
        <View style={styles.scoreCard}>
          <View style={styles.metric}>
            <RingGauge value={48} color="#fca5a5" gapAngle={70} thickness={12} />
            <Text style={styles.metricLabel}>redness</Text>
          </View>
          <View style={styles.metric}>
            <RingGauge value={2} color="#86efac" gapAngle={70} thickness={12} />
            <Text style={styles.metricLabel}>acne</Text>
          </View>
          <View style={styles.metric}>
            <RingGauge value={13} color="#60a5fa" gapAngle={70} thickness={12} />
            <Text style={styles.metricLabel}>dark{"\n"}circles</Text>
          </View>
          <View style={styles.metric}>
            <RingGauge value={9} color="#bae6fd" gapAngle={70} thickness={12} />
            <Text style={styles.metricLabel}>wrinkles</Text>
          </View>
          <View style={styles.metric}>
            <RingGauge value={34} color="#fde68a" gapAngle={70} thickness={12} />
            <Text style={styles.metricLabel}>complexion</Text>
          </View>
        </View>

        {/* 文本描述 */}
        <View style={styles.textBlock}>
          <Text style={styles.paragraph}>
            today is the 1 day you use skiri,{"\n"}
            your skin is calm and clear.{"\n"}
            Fix: redness / complexion / dark circles.{"\n"}
            Let&apos;s track it and see changes every day.
          </Text>
        </View>

        {/* 底部按钮 */}
        <TouchableOpacity style={styles.btn} onPress={goNext}>
          <Text style={styles.btnText}>Continue to Record</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const MINT = "#18e4aa";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    height: "65%",
    backgroundColor: "#000",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  backBtn: {
    position: "absolute",
    top: 48,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 4,
  },

  bottom: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },

  scoreCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  metric: { alignItems: "center", width: 64 },
  metricLabel: { fontSize: 12, color: "#6b7280", fontWeight: "600", textAlign: "center" },

  textBlock: {
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 16,
  },
  paragraph: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    color: "#111",
  },

  btn: {
    backgroundColor: MINT,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    marginHorizontal: 32,
  },
  btnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
});

