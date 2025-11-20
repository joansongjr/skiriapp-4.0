/**
 * Skiri - AI 皮肤分析 Cloud Functions
 * 
 * 功能：
 * 1. 监听 Firestore photos 集合的新照片
 * 2. 调用 Google Gemini Vision 模型进行皮肤分析
 * 3. 将评分结果写回 Firestore
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {GoogleGenerativeAI} from "@google/generative-ai";

// 初始化 Firebase Admin
admin.initializeApp();

// 初始化 Gemini 客户端（API Key 从 Firebase Config 读取）
const GEMINI_API_KEY = functions.config().gemini?.api_key;

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY 未配置！请运行: firebase functions:config:set gemini.api_key=\"YOUR_API_KEY\"");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

/**
 * Cloud Function: 当新照片上传到 Firestore 时触发
 * 监听 photos/{photoId} 的 onCreate 事件
 */
export const analyzeSkinPhoto = functions.firestore
  .document("photos/{photoId}")
  .onCreate(async (snap, context) => {
    const photoId = context.params.photoId;
    const photoData = snap.data();

    console.log(`[analyzeSkinPhoto] 开始分析照片: ${photoId}`);

    try {
      // 1. 检查照片是否已经分析过
      if (photoData.analysis) {
        console.log(`[analyzeSkinPhoto] 照片已分析，跳过: ${photoId}`);
        return null;
      }

      // 2. 获取照片的下载 URL
      const photoUrl = photoData.url;
      if (!photoUrl) {
        console.error(`[analyzeSkinPhoto] 照片缺少 URL: ${photoId}`);
        return null;
      }

      console.log(`[analyzeSkinPhoto] 照片 URL: ${photoUrl}`);

      // 3. 调用 Gemini 视觉模型进行分析
      const analysisResult = await analyzeSkinWithGemini(photoUrl);

      console.log(`[analyzeSkinPhoto] 分析结果:`, analysisResult);

      // 4. 将分析结果写回 Firestore
      await snap.ref.update({
        analysis: analysisResult,
        analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[analyzeSkinPhoto] 分析完成: ${photoId}`);

      return null;
    } catch (error: any) {
      console.error(`[analyzeSkinPhoto] 分析失败: ${photoId}`, error);

      // 记录错误信息
      await snap.ref.update({
        analysisError: error.message || "分析失败",
        analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return null;
    }
  });

/**
 * 调用 Google Gemini Vision 模型分析皮肤照片
 * @param imageUrl 照片的 HTTPS URL
 * @returns 分析结果 JSON
 */
async function analyzeSkinWithGemini(imageUrl: string) {
  const prompt = `
你是一个专业的皮肤分析AI。请仔细观察这张皮肤照片，并给出以下维度的评分（0-100分）：

1. overall（整体评分）：皮肤的总体健康状况
2. acne（痤疮/痘痘）：痤疮的严重程度（0=完全没有，100=非常严重）
3. redness（红肿）：皮肤发红/炎症的程度（0=完全没有，100=非常严重）
4. darkCircles（黑眼圈）：黑眼圈的严重程度（0=完全没有，100=非常严重）
5. wrinkles（皱纹）：皱纹的明显程度（0=完全没有，100=非常明显）
6. complexion（肤色均匀度）：肤色的均匀程度（0=非常不均匀，100=非常均匀）

请只返回 JSON 格式的结果，不要包含任何其他文字说明。

格式示例：
{
  "overall": 75,
  "acne": 20,
  "redness": 15,
  "darkCircles": 30,
  "wrinkles": 10,
  "complexion": 80
}
`.trim();

  try {
    // 使用 Gemini Pro Vision 模型
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // 或 "gemini-1.5-pro" (更强但更贵)
    });

    // 1. 下载图片数据
    console.log(`[Gemini] 下载图片: ${imageUrl}`);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`下载图片失败: ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");

    // 2. 调用 Gemini API
    console.log(`[Gemini] 开始分析...`);
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      },
      {text: prompt},
    ]);

    const response = await result.response;
    const content = response.text();

    console.log(`[Gemini] 原始返回:`, content);

    // 解析 JSON（移除可能的 markdown 代码块标记）
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Gemini 返回的内容无法解析为 JSON");
    }

    const analysisResult = JSON.parse(jsonMatch[0]);

    // 验证结果格式
    const requiredFields = [
      "overall",
      "acne",
      "redness",
      "darkCircles",
      "wrinkles",
      "complexion",
    ];
    for (const field of requiredFields) {
      if (typeof analysisResult[field] !== "number") {
        throw new Error(`缺少必需字段: ${field}`);
      }
    }

    return analysisResult;
  } catch (error: any) {
    console.error("[Gemini] 调用失败:", error);
    throw new Error(`Gemini 分析失败: ${error.message}`);
  }
}

