# 文档链接分享网站

## 项目简介
这是一个允许用户上传文件并生成可访问链接的网站。用户可以方便地分享文档给其他人。

## 技术栈
- 前端：React 19 + Next.js + Tailwind CSS + shadcn UI
- 数据库：MongoDB (Sealos cloud平台)

## 项目结构
```
├── app/                    # Next.js 应用主目录
│   ├── page.tsx           # 首页
│   ├── layout.tsx         # 全局布局
│   ├── api/               # API 路由
│   │   ├── upload/        # 文件上传API
│   │   └── files/         # 文件访问API
├── components/            # React 组件
│   ├── ui/               # UI 组件 (shadcn)
│   └── FileUpload.tsx    # 文件上传组件
├── lib/                  # 工具函数
│   └── db.ts            # 数据库连接配置
├── types/               # TypeScript 类型定义
└── public/             # 静态资源
```

## 环境配置
1. 创建 `.env` 文件，添加以下配置：
```
MONGODB_URI=你的MongoDB连接地址
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 开发说明
1. 安装依赖
```bash
npm install --force
```

2. 启动开发服务器
```bash
npm run dev
```

3. 访问 http://localhost:3000

## 功能特性
- [x] 项目基础搭建
- [x] 文件上传组件
  - [x] 拖拽上传
  - [x] 文件大小限制
  - [x] 文件类型验证
- [x] 文件存储
  - [x] MongoDB 集成
  - [x] 文件元数据存储
- [x] 链接生成
  - [x] 唯一链接生成
  - [x] 文件预览支持
- [x] 文件访问
  - [x] 文件预览
  - [x] 文件下载

## 开发进度
### 已完成
- 项目初始化和基础结构搭建
- 文件上传组件开发
- MongoDB 集成
- 文件存储实现
- 链接生成系统
- 文件访问控制

### 进行中
- UI 优化
- 用户体验改进

### 待开发
- 文件访问权限控制
- 文件有效期设置
- 文件预览优化
