import React, { useMemo } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import RingGauge from "../../components/ui/RingGauge";

type AnalysisResult = {
  overall: number;
  acne: number;
  redness: number;
  darkCircles: number;
  wrinkles: number;
  complexion: number;
};

export default function CameraAnalysis() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { uri, photoId, analysis: analysisStr } = params;
  
  // 解析 AI 分析结果
  const analysis = useMemo<AnalysisResult>(() => {
    try {
      if (analysisStr && typeof analysisStr === 'string') {
        return JSON.parse(analysisStr);
      }
    } catch (e) {
      console.error('解析 AI 结果失败:', e);
    }
    
    // 默认值（如果解析失败）
    return {
      overall: 0,
      acne: 0,
      redness: 0,
      darkCircles: 0,
      wrinkles: 0,
      complexion: 0,
    };
  }, [analysisStr]);

  const goNext = () => {
    router.push("/camera/triggers");
  };
  
  // 获取得分最高的3个需要改善的问题
  const getTopConcerns = (data: AnalysisResult): string[] => {
    const concerns = [
      { name: 'redness', value: data.redness },
      { name: 'acne', value: data.acne },
      { name: 'dark circles', value: data.darkCircles },
      { name: 'wrinkles', value: data.wrinkles },
    ];
    
    // 分数越高越需要关注，筛选出 > 20 的问题
    return concerns
      .filter(c => c.value > 20)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map(c => c.name);
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
        {/* 五个结果卡 - 显示真实的 AI 分析结果 */}
        <View style={styles.scoreCard}>
          <View style={styles.metric}>
            <RingGauge value={analysis.redness} color="#fca5a5" gapAngle={70} thickness={12} />
            <Text style={styles.metricLabel}>redness</Text>
          </View>
          <View style={styles.metric}>
            <RingGauge value={analysis.acne} color="#86efac" gapAngle={70} thickness={12} />
            <Text style={styles.metricLabel}>acne</Text>
          </View>
          <View style={styles.metric}>
            <RingGauge value={analysis.darkCircles} color="#60a5fa" gapAngle={70} thickness={12} />
            <Text style={styles.metricLabel}>dark{"\n"}circles</Text>
          </View>
          <View style={styles.metric}>
            <RingGauge value={analysis.wrinkles} color="#bae6fd" gapAngle={70} thickness={12} />
            <Text style={styles.metricLabel}>wrinkles</Text>
          </View>
          <View style={styles.metric}>
            <RingGauge value={analysis.complexion} color="#fde68a" gapAngle={70} thickness={12} />
            <Text style={styles.metricLabel}>complexion</Text>
          </View>
        </View>

        {/* 文本描述 - 根据 AI 结果生成 */}
        <View style={styles.textBlock}>
          <Text style={styles.paragraph}>
            Overall skin score: {analysis.overall}/100{"\n"}
            {analysis.overall >= 80 ? "Your skin is in great condition! 🎉" : 
             analysis.overall >= 60 ? "Your skin looks good with room for improvement." :
             "Let's work on improving your skin health together."}
            {"\n\n"}
            {getTopConcerns(analysis).length > 0 && (
              `Focus areas: ${getTopConcerns(analysis).join(", ")}.`
            )}
            {"\n"}
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

