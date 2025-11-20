# Skiri - 空白模板

一个配置好 Expo + Firebase 的空白项目模板。

## 已配置

✅ **Expo SDK 54** - 最新版本  
✅ **Expo Router** - 文件路由系统  
✅ **Firebase** - Auth, Firestore, Storage 已配置  
✅ **TypeScript** - 类型支持  
✅ **React Native** - 移动端开发

## 项目结构

```
skiri/
├── app/                    # 路由页面
│   ├── _layout.tsx        # 根布局
│   └── index.tsx          # 首页（空白）
├── firebase/              # Firebase 配置
│   └── index.ts          # Firebase 初始化
├── types/                # TypeScript 类型
│   └── index.ts
└── assets/               # 静态资源
```

## 开始开发

```bash
npx expo start
```

然后按 `i` (iOS) 或 `a` (Android) 启动模拟器。

## Firebase 使用

Firebase 已配置并可直接使用：

```typescript
import { auth, db, storage } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

// 示例：匿名登录
await signInAnonymously(auth);

// 示例：写入数据
await addDoc(collection(db, 'items'), { name: 'test' });

// 示例：上传文件
const storageRef = ref(storage, 'path/to/file.jpg');
await uploadBytes(storageRef, blob);
```

## 创建新页面

在 `app/` 目录下创建文件即可自动生成路由：

```
app/
├── index.tsx          → /
├── about.tsx         → /about
└── profile/
    └── index.tsx     → /profile
```

现在可以开始您自己的设计了！🎨
