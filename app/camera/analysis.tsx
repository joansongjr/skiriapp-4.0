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
  
  // Parse AI analysis results
  const analysis = useMemo<AnalysisResult>(() => {
    try {
      if (analysisStr && typeof analysisStr === 'string') {
        return JSON.parse(analysisStr);
      }
    } catch (e) {
      console.error('Failed to parse AI results:', e);
    }
    
    // Default values (if parsing fails)
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
  
  // Get the 3 lowest-scoring areas that need improvement (lower score = more severe issue)
  const getTopConcerns = (data: AnalysisResult): string[] => {
    const concerns = [
      { name: 'redness', value: data.redness },
      { name: 'acne', value: data.acne },
      { name: 'dark circles', value: data.darkCircles },
      { name: 'wrinkles', value: data.wrinkles },
    ];
    
    // Lower scores need more attention, filter out scores < 70
    return concerns
      .filter(c => c.value < 70)
      .sort((a, b) => a.value - b.value) // Sort low to high
      .slice(0, 3)
      .map(c => c.name);
  };

  return (
    <View style={styles.container}>
      {/* Image area */}
      <View style={styles.imageWrap}>
        {uri ? (
          <Image source={{ uri: uri as string }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text>No image</Text>
          </View>
        )}

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom content - no scroll */}
      <View style={styles.bottom}>
        {/* Five result cards - showing real AI analysis results */}
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
            <Text style={styles.metricLabel}>skin{"\n"}tone</Text>
          </View>
        </View>

        {/* Score explanation */}
        <View style={styles.scoreNote}>
          <Text style={styles.scoreNoteText}>
            ✨ Higher score = Better skin condition
          </Text>
        </View>

        {/* Text description - based on AI results */}
        <View style={styles.textBlock}>
          <Text style={styles.paragraph}>
            Overall skin score: {analysis.overall}/100{"\n"}
            {analysis.overall >= 80 ? "Your skin is in great condition! 🎉" : 
             analysis.overall >= 60 ? "Your skin looks good with room for improvement." :
             "Let's work on improving your skin health together."}
            {getTopConcerns(analysis).length > 0 && (
              `\n\nFocus areas: ${getTopConcerns(analysis).join(", ")}`
            )}
          </Text>
        </View>

        {/* Bottom button */}
        <TouchableOpacity style={styles.btn} onPress={goNext}>
          <Text style={styles.btnText}>Continue to Record</Text>
        </TouchableOpacity>
      </View>
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
    paddingTop: 12,
    paddingBottom: 20,
    justifyContent: "space-between",
  },

  scoreCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  metric: { alignItems: "center", width: 60 },
  metricLabel: { fontSize: 12, color: "#6b7280", fontWeight: "600", textAlign: "center", marginTop: 4 },

  scoreNote: {
    marginTop: 12,
    marginHorizontal: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  scoreNoteText: {
    fontSize: 13,
    color: "#166534",
    textAlign: "center",
    fontWeight: "600",
  },

  textBlock: {
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 20,
  },
  paragraph: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    color: "#111",
  },

  btn: {
    backgroundColor: MINT,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
    marginHorizontal: 32,
  },
  btnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
});

