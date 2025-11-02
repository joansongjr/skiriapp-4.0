// app/camera/shoot.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Paths, File } from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// 你 Home 页的薄荷绿主色（跟之前保持一致）
const MINT = "#b7ffe6";

export default function ShootScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);

  // 相机权限
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<CameraType>("front"); // 先用前置，方便自拍
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted]);

  const goBack = () => router.back();

  const onPickFromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      router.push({ pathname: "/camera/preview", params: { uri: res.assets[0].uri } });
    }
  };

  const onShoot = async () => {
    if (!cameraRef.current || busy) return;
    try {
      setBusy(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: true,
      });
      if (photo?.uri) {
        const destFile = new File(Paths.document, `skiri_${Date.now()}.jpg`);
        const sourceFile = new File(photo.uri);
        await sourceFile.move(destFile);
        router.push({ pathname: "/camera/preview", params: { uri: destFile.uri } });
      }
    } catch (e) {
      console.warn("takePicture error:", e);
    } finally {
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#000", fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
          Camera permission is needed
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={{ color: "#000", fontWeight: "700" }}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* 相机预览全屏 */}
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={type}
          mode="picture"
        />

        {/* 顶部：返回 & 相册 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.roundBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={onPickFromLibrary} style={styles.roundBtn}>
            <Ionicons name="images-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* 中部：椭圆取景框（描边 + 轻微外阴影） */}
        <View pointerEvents="none" style={styles.ovalWrap}>
          <View style={styles.ovalStroke} />
        </View>

        {/* 底部：快门 */}
        <View style={styles.bottomBar}>
          <TouchableOpacity activeOpacity={0.85} style={styles.shutterOuter} onPress={onShoot}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </View>

        {/* 拍照中小提示 */}
        {busy && (
          <View style={styles.busyMask}>
            <ActivityIndicator color="#fff" />
            <Text style={{ color: "#fff", marginTop: 8 }}>Capturing…</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },

  header: {
    paddingHorizontal: 12,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  // 椭圆描边（近似你的UI）。如需暗角遮罩，我们后续可以用 MaskedView 做"镂空"效果
  ovalWrap: {
    position: "absolute",
    top: SCREEN_H * 0.16,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  ovalStroke: {
    width: SCREEN_W * 0.92,
    height: SCREEN_H * 0.58,
    borderRadius: (SCREEN_W * 0.92) / 2, // 再拉伸高度形成椭圆
    transform: [{ scaleY: 1.25 }],
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },

  bottomBar: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
  },

  busyMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  permBtn: {
    backgroundColor: MINT,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
});

