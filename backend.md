# Cobean iOS App Backend Documentation

## Overview

Cobean iOS App 后端服务是一个基于 Node.js + Express + Supabase 的 RESTful API 服务，为 iOS 应用提供用户认证、书籍管理、题目获取和学习进度跟踪功能。

### 技术栈
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + JWT
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting

### 核心功能
- 用户注册和登录认证
- 书籍列表获取（含腐蚀度计算）
- 题目获取和随机排序
- 学习进度提交和跟踪
- 基于艾宾浩斯遗忘曲线的腐蚀度计算

## Database Schema

### 1. books 表
存储书籍基本信息

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| bookId | uuid | PRIMARY KEY | gen_random_uuid() | 书籍唯一标识 |
| title | text | NOT NULL | - | 书籍标题 |
| author | text | NULLABLE | - | 作者 |
| description | text | NULLABLE | - | 书籍描述 |
| coverImageUrl | text | NULLABLE | - | 封面图片URL |
| questionCount | integer | NOT NULL | 0 | 题目数量 |
| isPublished | boolean | NOT NULL | false | 是否已发布 |
| createdAt | timestamptz | NOT NULL | now() | 创建时间 |
| updatedAt | timestamptz | NOT NULL | now() | 更新时间 |

### 2. questions 表
存储题目信息

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| questionId | uuid | PRIMARY KEY | gen_random_uuid() | 题目唯一标识 |
| bookId | uuid | FOREIGN KEY | - | 关联书籍ID |
| statement | text | NOT NULL | - | 题目陈述 |
| imageUrl | text | NULLABLE | - | 题目图片URL |
| isPure | boolean | NOT NULL | - | 是否为纯净题目 |
| explanation | text | NOT NULL | - | 题目解释 |
| createdAt | timestamptz | NOT NULL | now() | 创建时间 |
| updatedAt | timestamptz | NOT NULL | now() | 更新时间 |

### 3. user_progress 表
存储用户学习进度

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| progressId | uuid | PRIMARY KEY | gen_random_uuid() | 进度记录唯一标识 |
| userId | uuid | FOREIGN KEY | - | 用户ID (关联 auth.users) |
| bookId | uuid | FOREIGN KEY | - | 书籍ID |
| lastAttemptedAt | timestamptz | NULLABLE | - | 最后学习时间 |
| highestAccuracy | float8 | NOT NULL | 0 | 最高正确率 (0-1) |
| totalAttempts | integer | NOT NULL | 0 | 总尝试次数 |
| createdAt | timestamptz | NOT NULL | now() | 创建时间 |
| updatedAt | timestamptz | NOT NULL | now() | 更新时间 |

### 4. dialogues 表
存储对话内容（扩展功能）

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | uuid | PRIMARY KEY | gen_random_uuid() | 对话唯一标识 |
| dialogueId | text | UNIQUE | - | 对话ID |
| context | text | NOT NULL | - | 对话上下文 |
| condition | text | NULLABLE | - | 对话条件 |
| texts | text[] | NOT NULL | - | 对话文本数组 |
| version | text | NOT NULL | '1.0.0' | 版本号 |
| createdAt | timestamptz | NOT NULL | now() | 创建时间 |
| updatedAt | timestamptz | NOT NULL | now() | 更新时间 |

## API Endpoints

### 认证接口 (`/auth`)

#### POST /auth/register
用户注册

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应示例:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "token": "jwt_token_here"
}
```

#### POST /auth/login
用户登录

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应示例:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "lastSignInAt": "2024-01-01T00:00:00Z"
  },
  "token": "jwt_token_here"
}
```

### 书籍接口 (`/books`)

#### GET /books
获取用户的所有书籍列表及对应的学习状态

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**响应示例:**
```json
[
  {
    "bookId": "uuid",
    "title": "《人类简史》",
    "author": "尤瓦尔·赫拉利",
    "description": "书籍描述",
    "coverImageUrl": "https://example.com/cover.jpg",
    "questionCount": 20,
    "corruptionLevel": 0.75,
    "highestAccuracy": 0.85,
    "totalAttempts": 3,
    "lastAttemptedAt": "2024-01-01T00:00:00Z"
  }
]
```

#### GET /books/:bookId/questions
获取一本书的所有题目

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**响应示例:**
```json
{
  "book": {
    "bookId": "uuid",
    "title": "《人类简史》"
  },
  "questions": [
    {
      "questionId": "uuid",
      "statement": "题目陈述",
      "imageUrl": "https://example.com/question.jpg",
      "isPure": true,
      "explanation": "题目解释"
    }
  ],
  "totalCount": 20
}
```

### 进度接口 (`/progress`)

#### POST /books/:bookId/submit
用户完成一次闯关后，提交本次结果

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**请求体:**
```json
{
  "correctCount": 18,
  "totalCount": 20
}
```

**响应示例:**
```json
{
  "message": "Progress submitted successfully",
  "result": {
    "bookId": "uuid",
    "bookTitle": "《人类简史》",
    "currentAccuracy": 0.9,
    "correctCount": 18,
    "totalCount": 20,
    "progress": {
      "highestAccuracy": 0.9,
      "totalAttempts": 4,
      "lastAttemptedAt": "2024-01-01T00:00:00Z",
      "corruptionLevel": 0.1
    },
    "isNewRecord": true
  }
}
```

## Project Structure

```
InkyBeanService/
├── config/
│   └── database.js          # Supabase 数据库配置
├── middleware/
│   ├── auth.js              # JWT 认证中间件
│   └── validation.js        # 请求验证中间件
├── routes/
│   ├── auth.js              # 认证路由
│   ├── books.js             # 书籍路由
│   └── progress.js          # 进度路由
├── utils/
│   └── corruptionCalculator.js  # 腐蚀度计算工具
├── index.js                 # 应用入口文件
├── package.json             # 项目依赖配置
├── .env                     # 环境变量
├── .env.example             # 环境变量示例
├── backend.md               # 后端文档
└── API_DOCUMENTATION.md     # 前端接口文档
```

### 文件说明

- **config/database.js**: Supabase 客户端配置，包含普通客户端和管理员客户端
- **middleware/auth.js**: JWT 令牌验证中间件，保护需要认证的路由
- **middleware/validation.js**: 使用 Joi 进行请求体验证
- **routes/**: 各功能模块的路由定义
- **utils/corruptionCalculator.js**: 实现艾宾浩斯遗忘曲线的腐蚀度计算算法
- **index.js**: Express 应用主入口，配置中间件和路由
- **API_DOCUMENTATION.md**: 面向前端开发工程师的详细接口文档

## 腐蚀度计算逻辑

腐蚀度是产品的核心功能，模拟艾宾浩斯遗忘曲线：

### 基础算法
```javascript
function calculateCorruptionLevel(lastAttemptedAt) {
  // 如果从未学习过，腐蚀度为100%
  if (!lastAttemptedAt) {
    return 1.0;
  }

  const now = new Date();
  const lastAttempt = new Date(lastAttemptedAt);
  
  // 计算时间差（小时）
  const hoursPassed = (now.getTime() - lastAttempt.getTime()) / (1000 * 60 * 60);

  // 应用遗忘曲线公式
  // 刚完成时腐蚀度为10%，每小时增加1%，最高100%
  const corruptionLevel = Math.min(1.0, 0.1 + (hoursPassed * 0.01));
  
  return Math.round(corruptionLevel * 100) / 100;
}
```

### 高级算法（可选）
考虑用户最高正确率的影响：
- 正确率越高，遗忘越慢
- 使用指数衰减模型
- 更符合真实的记忆遗忘规律

## Setup & Deployment Guide

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0
- Supabase 项目

### 本地开发设置

1. **克隆项目并安装依赖**
```bash
cd InkyBeanService
npm install
```

2. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，填入正确的 Supabase 配置
```

3. **启动开发服务器**
```bash
npm run dev
```

4. **健康检查**
访问 `http://localhost:3000/health` 确认服务正常运行

### 生产部署

1. **设置环境变量**
```bash
export NODE_ENV=production
export PORT=3000
export SUPABASE_URL=your_supabase_url
export SUPABASE_ANON_KEY=your_anon_key
export JWT_SECRET=your_jwt_secret
```

2. **启动生产服务**
```bash
npm start
```

### Docker 部署（可选）
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Security Features

- **Helmet**: 设置安全相关的 HTTP 头
- **CORS**: 跨域资源共享配置
- **Rate Limiting**: API 请求频率限制（15分钟内最多100次请求）
- **JWT Authentication**: 基于令牌的身份验证
- **Input Validation**: 使用 Joi 进行严格的输入验证
- **Environment Variables**: 敏感信息通过环境变量管理

## Error Handling

所有 API 响应都遵循统一的错误格式：

```json
{
  "error": "错误描述",
  "code": "ERROR_CODE",
  "details": [] // 可选，验证错误时包含详细信息
}
```

### 常见错误码
- `MISSING_TOKEN`: 缺少认证令牌
- `INVALID_TOKEN`: 无效或过期的令牌
- `VALIDATION_FAILED`: 请求验证失败
- `BOOK_NOT_FOUND`: 书籍不存在
- `RATE_LIMIT_EXCEEDED`: 请求频率超限
- `INTERNAL_ERROR`: 服务器内部错误

## Changelog

### 2025-01-14 - 创建前端接口文档
- **新增**: 创建 `API_DOCUMENTATION.md` 文件，为前端开发工程师提供详细的接口说明
- **内容包含**:
  - 完整的 API 接口列表和使用方法
  - 详细的请求/响应示例
  - 错误码说明和处理建议
  - 腐蚀等级计算逻辑说明
  - JavaScript 和 Swift 示例代码
  - 开发注意事项和最佳实践
- **目的**: 帮助前端开发者快速理解和集成后端 API

### 2025-01-14 - 修复书籍列表获取问题
- **问题**: `GET /books` 接口返回空数组，无法获取已发布的书籍
- **原因**: 
  1. JWT token 中的用户ID字段映射错误（`req.user.id` vs `req.user.userId`）
  2. Supabase RLS (Row Level Security) 策略阻止了普通客户端访问 books 表
  3. PostgreSQL 字段名大小写敏感问题
- **解决方案**:
  1. 修复 `middleware/auth.js` 中的用户ID字段映射：`req.user.id` → `req.user.userId`
  2. 修复 `routes/books.js` 中的用户ID引用：`req.user.id` → `req.user.userId`
  3. 使用 `supabaseAdmin` 客户端绕过 RLS 策略获取书籍数据
  4. 确保字段名使用双引号包围以处理大小写敏感问题
- **影响**: 书籍列表接口现在能正确返回所有已发布的书籍及用户进度信息

### Version 1.0.2 (2024-01-14)
- ✅ 修复数据库触发器字段名问题
- **问题**: 学习进度更新失败，错误信息 `record "new" has no field "updated_at"`
- **根本原因**: 数据库触发器函数 `handle_updated_at` 使用了错误的字段名 `updated_at`，而实际表结构使用的是 `updatedAt`（camelCase）
- **解决方案**: 
  1. 通过 Supabase 查询触发器函数定义，确认字段名问题
  2. 执行数据库迁移，修复触发器函数使用正确的字段名 `"updatedAt"`
  3. 触发器现在能正确自动更新 `updatedAt` 字段
- **影响**: 学习进度提交接口现在能正确创建和更新用户进度记录

### Version 1.0.1 (2024-01-14)
- ✅ 修复书籍列表接口的数据库查询问题
- **问题**: 书籍列表接口返回空数组，无法获取书籍数据
- **解决方案**: 
  1. 修改查询语句，正确处理 LEFT JOIN 和字段别名
  2. 修复字段名大小写问题（`bookId` -> `"bookId"`）
  3. 使用 `supabaseAdmin` 客户端绕过 RLS 策略获取书籍数据
  4. 确保字段名使用双引号包围以处理大小写敏感问题
- **影响**: 书籍列表接口现在能正确返回所有已发布的书籍及用户进度信息

### Version 1.0.0 (2024-01-14)
- ✅ 初始版本发布
- ✅ 实现用户认证系统（注册/登录）
- ✅ 实现书籍管理接口
- ✅ 实现题目获取接口（含随机排序）
- ✅ 实现学习进度跟踪
- ✅ 实现腐蚀度计算算法（基于艾宾浩斯遗忘曲线）
- ✅ 添加安全中间件（Helmet, CORS, Rate Limiting）
- ✅ 添加输入验证和错误处理
- ✅ 完善项目文档

### 待实现功能
- [ ] 用户个人资料管理
- [ ] 书籍收藏功能
- [ ] 学习统计和分析
- [ ] 推送通知
- [ ] 管理员后台接口
- [ ] 数据导入/导出功能
- [ ] 缓存优化
- [ ] 日志系统
- [ ] 单元测试覆盖

---

**最后更新**: 2024-01-14  
**文档版本**: 1.0.0  
**维护者**: Cobean 开发团队