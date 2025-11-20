# Skiri Cloud Functions - AI 皮肤分析

使用 Google Gemini Vision API 进行皮肤照片分析和评分。

## 🎯 功能

- **自动触发**：当用户上传照片到 Firestore `photos` 集合时自动分析
- **AI 评分**：使用 Gemini 1.5 Flash 模型分析皮肤状况
- **6 个维度**：
  - `overall` - 整体健康评分
  - `acne` - 痤疮严重程度
  - `redness` - 红肿程度
  - `darkCircles` - 黑眼圈严重程度
  - `wrinkles` - 皱纹明显程度
  - `complexion` - 肤色均匀度

## 💰 成本对比

### Gemini 1.5 Flash（推荐）
- **免费额度**：每天 1,500 次请求
- **付费价格**：$0.000075 / 1K 字符（输入），$0.0003 / 1K 字符（输出）
- **图片处理**：免费（前 1,500 张/天）
- **预估成本**：100 个用户每天上传 1 张照片 ≈ **$0.03/月**

### Gemini 1.5 Pro（更强但更贵）
- **免费额度**：每天 50 次请求
- **付费价格**：$0.00125 / 1K 字符（输入），$0.005 / 1K 字符（输出）
- **预估成本**：100 个用户每天上传 1 张照片 ≈ **$0.50/月**

### OpenAI GPT-4o（原方案，已移除）
- **价格**：$0.01 / 1K tokens（输入），$0.03 / 1K tokens（输出）
- **图片处理**：$0.00765 / 张（高精度）
- **预估成本**：100 个用户每天上传 1 张照片 ≈ **$25/月**

**💡 结论：Gemini 比 OpenAI 便宜约 800 倍！**

## 🚀 部署步骤

### 1. 获取 Gemini API Key

访问：https://makersuite.google.com/app/apikey

1. 使用 Google 账号登录
2. 点击 "Get API Key"
3. 创建新的 API Key
4. 复制保存

### 2. 配置 Firebase 环境变量

```bash
# 在项目根目录执行
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"

# 验证配置
firebase functions:config:get
```

### 3. 升级 Firebase 计费方案

Cloud Functions 需要 **Blaze（按量付费）** 方案。

访问：https://console.firebase.google.com/project/skiri2/usage/details

点击 "Upgrade to Blaze plan"

### 4. 部署 Cloud Function

```bash
# 在 functions 目录
cd functions

# 部署
npm run deploy

# 或者只部署特定函数
firebase deploy --only functions:analyzeSkinPhoto
```

## 🧪 本地测试

```bash
# 安装 Firebase Emulator Suite
firebase init emulators

# 启动模拟器
cd functions
npm run serve

# 在另一个终端测试
curl -X POST http://localhost:5001/skiri2/us-central1/analyzeSkinPhoto \
  -H "Content-Type: application/json" \
  -d '{"photoUrl": "https://example.com/photo.jpg"}'
```

## 📊 监控日志

```bash
# 实时查看日志
firebase functions:log

# 查看特定函数的日志
firebase functions:log --only analyzeSkinPhoto

# 在 Firebase Console 查看
# https://console.firebase.google.com/project/skiri2/functions/logs
```

## 🛠️ 代码结构

```typescript
functions/
├── src/
│   └── index.ts              # 主函数文件
│       ├── analyzeSkinPhoto  # Firestore 触发器
│       └── analyzeSkinWithGemini  # Gemini API 调用
├── lib/                      # 编译后的 JS 文件
├── package.json
└── tsconfig.json
```

## 🔧 自定义配置

### 切换到 Gemini Pro 模型（更强但更贵）

编辑 `src/index.ts`：

```typescript
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro", // 改为 pro
});
```

### 调整评分维度

修改 `prompt` 变量，添加或删除评分项。

### 修改触发条件

当前触发条件：`onCreate`（新照片上传时）

可选触发条件：
- `onUpdate` - 照片更新时
- `onWrite` - 新增或更新时
- `onDelete` - 照片删除时

## ⚠️ 常见问题

### 1. 部署失败：需要 Blaze 方案
**解决**：升级到 Blaze 计费方案

### 2. API Key 无效
**解决**：检查环境变量配置
```bash
firebase functions:config:get
```

### 3. 图片下载失败
**解决**：确保 Storage Rules 允许 Cloud Functions 访问

### 4. 超时错误
**解决**：增加超时时间
```typescript
export const analyzeSkinPhoto = functions
  .runWith({ timeoutSeconds: 120 }) // 增加到 120 秒
  .firestore.document("photos/{photoId}")
  .onCreate(...)
```

## 📝 TODO

- [ ] 添加重试逻辑（网络错误时）
- [ ] 添加评分缓存（相同照片不重复分析）
- [ ] 支持批量分析
- [ ] 添加 Webhook 通知用户
- [ ] 优化 Prompt 提高准确性

## 📞 支持

如有问题，请查看：
- Firebase Functions 文档：https://firebase.google.com/docs/functions
- Gemini API 文档：https://ai.google.dev/tutorials/get_started_node

