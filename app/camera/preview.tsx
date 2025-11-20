// app/camera/preview.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "../../store";
import { auth, db } from "@/firebase/config";
import { uploadPhoto, uploadPhotoBase64 } from "@/firebase/storage";
import { savePhotoWithAutoCleanup } from "@/firebase/firestore";
import { signInAnonymously } from "@/firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import * as FileSystem from 'expo-file-system';

export default function CameraPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uri?: string }>();
  const uri = params?.uri as string | undefined;
  const addPhoto = useAppStore(s => s.addPhoto);
  
  // 状态管理
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');

  const onBack = () => router.back();
  const onRetake = () => router.replace("/camera/shoot");
  
  const onConfirm = async () => {
    if (!uri) return;
    
    setUploading(true);
    setError('');
    
    try {
      const now = new Date();
      const dateISO = now.toISOString().slice(0, 10);
      const localId = String(Date.now());

      // 1) 先保存到本地
      addPhoto({ id: localId, uri, dateISO, createdAt: Date.now() });

      // 2) 确保用户登录（匿名也可以）
      setUploadProgress('Logging in...');
      console.log('[upload] 检查用户登录状态...');
      
      if (!auth.currentUser) {
        console.log('[upload] 当前未登录，开始匿名登录...');
        const result = await signInAnonymously();
        if (!result.success) {
          throw new Error('Login failed: ' + result.error);
        }
        console.log('✅ 匿名登录成功');
      }
      
      const uid = auth.currentUser!.uid;
      console.log('[upload] 用户 ID:', uid);

      // 3) 上传照片到 Firebase Storage
      setUploadProgress('Uploading photo...');
      console.log('[upload] 开始上传照片...');
      
      let photoUrl: string;
      
      try {
        // 先尝试 Blob 上传
        photoUrl = await uploadPhoto(uri, uid, dateISO);
        console.log('✅ Blob 上传成功:', photoUrl);
      } catch (e: any) {
        console.log('⚠️ Blob 上传失败，尝试 Base64...', e?.message);
        // 兜底使用 Base64
        photoUrl = await uploadPhotoBase64(uri, uid, dateISO, localId);
        console.log('✅ Base64 上传成功:', photoUrl);
      }

      // 4) 保存照片记录到 Firestore（会触发 Cloud Function）
      setUploadProgress('Saving to database...');
      console.log('[upload] 保存到 Firestore...');
      
      const photoId = await savePhotoWithAutoCleanup(uid, dateISO, photoUrl, localId);
      console.log('✅ Firestore 保存成功，Photo ID:', photoId);
      
      // 更新本地 store 的 URI
      useAppStore.getState().updatePhotoUri?.(localId, photoUrl);

      // 5) 等待 AI 分析完成
      setUploadProgress('AI analyzing...');
      console.log('[AI] 等待 AI 分析...');
      
      const analysisResult = await waitForAnalysis(photoId);
      
      if (analysisResult) {
        console.log('✅ AI 分析完成:', analysisResult);
        
        // 6) 跳转到 analysis 页面，传递 photoId 和分析结果
        router.push({ 
          pathname: '/camera/analysis', 
          params: { 
            uri,
            photoId,
            analysis: JSON.stringify(analysisResult)
          } 
        });
      } else {
        throw new Error('AI analysis timeout or failed');
      }
      
    } catch (err: any) {
      console.error('❌ 上传或分析失败:', err);
      setError(err.message || 'Upload failed');
      setUploading(false);
    }
  };
  
  /**
   * 等待 AI 分析完成（监听 Firestore）
   * @param photoId Firestore 照片文档 ID
   * @returns 分析结果或 null（超时）
   */
  const waitForAnalysis = (photoId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const photoRef = doc(db, 'photos', photoId);
      let timeout: NodeJS.Timeout;
      
      // 设置 30 秒超时
      timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error('AI analysis timeout (30s)'));
      }, 30000);
      
      // 监听 Firestore 文档变化
      const unsubscribe = onSnapshot(photoRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // 检查是否有 analysis 字段
          if (data.analysis) {
            console.log('[AI] 分析结果已返回:', data.analysis);
            clearTimeout(timeout);
            unsubscribe();
            resolve(data.analysis);
          }
          
          // 检查是否有错误
          if (data.analysisError) {
            console.error('[AI] 分析失败:', data.analysisError);
            clearTimeout(timeout);
            unsubscribe();
            reject(new Error(data.analysisError));
          }
        }
      }, (error) => {
        console.error('[AI] Firestore 监听错误:', error);
        clearTimeout(timeout);
        reject(error);
      });
    });
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
              {uploading ? (
                // 上传中的状态
                <View style={styles.uploadingBox}>
                  <ActivityIndicator size="large" color="#18e4aa" />
                  <Text style={styles.uploadingText}>{uploadProgress}</Text>
                  {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                  ) : null}
                </View>
              ) : (
                <>
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
                </>
              )}
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
  
  // 上传中状态
  uploadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
  },
  uploadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: "#ef4444",
    textAlign: "center",
  },
});
