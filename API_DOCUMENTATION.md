# InkyBean iOS App API 接口文档

## 概述

本文档为 InkyBean iOS App 后端 API 的详细接口说明，面向前端开发工程师。所有接口均基于 RESTful 设计原则，使用 JSON 格式进行数据交换。

### 基础信息
- **Base URL**: `https://api.inkybean.com`
- **Content-Type**: `application/json`
- **认证方式**: Bearer Token (JWT)

### 通用响应格式

#### 成功响应
```json
{
  "data": "响应数据",
  "message": "操作成功"
}
```

#### 错误响应
```json
{
  "error": "错误描述",
  "code": "ERROR_CODE",
  "details": "详细错误信息 (可选)"
}
```

### 通用错误码
- `UNAUTHORIZED`: 未授权访问
- `FORBIDDEN`: 权限不足
- `VALIDATION_ERROR`: 请求参数验证失败
- `INTERNAL_ERROR`: 服务器内部错误

---

## 认证接口

### 1. 用户注册
**POST** `/auth/register`

#### 请求参数
```json
{
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

#### 响应示例
```json
{
  "message": "用户注册成功",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

#### 错误码
- `EMAIL_EXISTS`: 邮箱已存在
- `PASSWORD_MISMATCH`: 密码不匹配
- `VALIDATION_ERROR`: 参数验证失败

### 2. 用户登录
**POST** `/auth/login`

#### 请求参数
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### 响应示例
```json
{
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

#### 错误码
- `INVALID_CREDENTIALS`: 邮箱或密码错误
- `USER_NOT_FOUND`: 用户不存在

### 3. 微信授权登录
**POST** `/auth/wechat`

#### 功能说明
使用微信授权码进行用户登录，支持新用户自动注册。

#### 请求参数
```json
{
  "code": "微信授权码"
}
```

#### 响应示例
```json
{
  "message": "WeChat login successful",
  "user": {
    "id": "uuid",
    "nickname": "微信昵称",
    "avatar": "头像URL",
    "openid": "微信openid",
    "unionid": "微信unionid",
    "lastLoginAt": "2024-01-15T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 错误码
- `MISSING_CODE`: 缺少授权码
- `WECHAT_TOKEN_ERROR`: 微信授权失败
- `WECHAT_USERINFO_ERROR`: 获取用户信息失败
- `DATABASE_ERROR`: 数据库操作失败
- `USER_CREATION_ERROR`: 用户创建失败
- `USER_UPDATE_ERROR`: 用户信息更新失败

#### 微信授权流程
1. 前端通过微信SDK获取授权码 (code)
2. 将授权码发送到此接口
3. 后端使用授权码向微信服务器换取 access_token 和 openid
4. 使用 access_token 获取用户基本信息
5. 检查用户是否已存在，存在则更新信息，不存在则创建新用户
6. 返回JWT token供后续API调用使用

#### 环境配置
需要在 `.env` 文件中配置：
```
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret
```

---

## 书籍接口

### 1. 获取书籍列表
**GET** `/books`

#### 功能说明
获取所有已发布书籍的基本信息，不包含用户学习进度。

#### 请求头
```
Authorization: Bearer <token>
```

#### 响应示例
```json
[
  {
    "bookId": "a14e6684-1d23-4d53-a917-6d5fff7feab5",
    "title": "English Grammar Basics",
    "author": "John Smith",
    "description": "Learn fundamental English grammar rules",
    "coverImageUrl": null,
    "questionCount": 50,
    "createdAt": "2025-01-14T10:00:00.000Z",
    "updatedAt": "2025-01-14T10:00:00.000Z"
  },
  {
    "bookId": "44b16a72-429a-47ab-9fab-7aab94b341c6",
    "title": "《人类简史》",
    "author": "尤瓦尔·赫拉利",
    "description": "一本通俗易懂但又引人深思的书，讲述了从石器时代到今天的人类发展史。",
    "coverImageUrl": "https://placehold.co/400x600/6366f1/ffffff?text=人类简史",
    "questionCount": 3,
    "createdAt": "2025-01-14T10:00:00.000Z",
    "updatedAt": "2025-01-14T10:00:00.000Z"
  }
]
```

#### 字段说明
- `bookId`: 书籍唯一标识符
- `title`: 书籍标题
- `author`: 作者
- `description`: 书籍描述
- `coverImageUrl`: 封面图片URL (可为null)
- `questionCount`: 题目总数
- `createdAt`: 创建时间 (ISO 8601格式)
- `updatedAt`: 更新时间 (ISO 8601格式)

#### 错误码
- `BOOKS_FETCH_ERROR`: 获取书籍列表失败
- `UNAUTHORIZED`: 未授权访问

### 2. 获取书籍题目
**GET** `/books/:bookId/questions`

#### 请求头
```
Authorization: Bearer <token>
```

#### 路径参数
- `bookId`: 书籍ID

#### 查询参数
- `limit`: 题目数量限制 (可选，默认10)
- `shuffle`: 是否随机排序 (可选，默认true)

#### 响应示例
```json
{
  "book": {
    "bookId": "44b16a72-429a-47ab-9fab-7aab94b341c6",
    "title": "《人类简史》"
  },
  "questions": [
    {
      "questionId": "25b72be2-c2bc-4aaf-b321-060aac9483ab",
      "statement": "智人是历史上唯一存在过的人类物种。",
      "imageUrl": null,
      "isPure": false,
      "explanation": "错误。历史上曾存在多个人类物种，如尼安德特人。智人最终胜出并成为唯一幸存的人种。"
    }
  ],
  "totalCount": 1
}
```

#### 字段说明
- `book`: 书籍信息
  - `bookId`: 书籍唯一标识符
  - `title`: 书籍标题
- `questions`: 题目数组
  - `questionId`: 题目唯一标识符
  - `statement`: 题目陈述
  - `imageUrl`: 题目图片URL (可为null)
  - `isPure`: 是否为纯净题目
  - `explanation`: 题目解释
- `totalCount`: 返回的题目总数

#### 错误码
- `BOOK_NOT_FOUND`: 书籍不存在或未发布
- `QUESTIONS_FETCH_ERROR`: 获取题目失败
- `UNAUTHORIZED`: 未授权访问

### 3. 生成书籍题目
**POST** `/books/:bookId/generate-questions`

#### 功能说明
基于书籍信息和现有题目，调用AI服务生成新的高质量题目并自动插入数据库。

#### 请求头
```
Authorization: Bearer <token>
```

#### 路径参数
- `bookId`: 书籍ID (uuid)

#### 响应示例
```json
{
  "message": "Questions generated successfully",
  "result": {
    "bookId": "44b16a72-429a-47ab-9fab-7aab94b341c6",
    "bookTitle": "《人类简史》",
    "generatedCount": 5,
    "newQuestionCount": 6,
    "questions": [
      {
        "questionId": "new-uuid-1",
        "statement": "认知革命使智人能够创造虚构的概念，如宗教、货币和法律。",
        "isPure": true,
        "explanation": "正确。认知革命约发生在7万年前，使智人具备了创造和相信虚构概念的能力，这是智人能够大规模合作的关键。"
      }
    ]
  }
}
```

#### 字段说明
- `generatedCount`: 本次生成的题目数量
- `newQuestionCount`: 书籍更新后的总题目数量
- `questions`: 新生成的题目数组
  - `questionId`: 题目唯一标识符
  - `statement`: 题目陈述
  - `isPure`: 是否为正确陈述
  - `explanation`: 题目解释

#### 错误码
- `BOOK_NOT_FOUND`: 书籍不存在或未发布
- `QUESTIONS_FETCH_ERROR`: 获取现有题目失败
- `AI_SERVICE_ERROR`: AI服务调用失败
- `INVALID_AI_RESPONSE`: AI返回数据格式无效
- `QUESTIONS_INSERT_ERROR`: 题目插入数据库失败
- `UNAUTHORIZED`: 未授权访问

---

## 学习进度接口

### 1. 提交学习进度
**POST** `/books/:bookId/submit`

#### 请求头
```
Authorization: Bearer <token>
```

#### 路径参数
- `bookId`: 书籍ID (uuid)

#### 请求参数
```json
{
  "correctCount": 3,
  "totalCount": 5
}
```

#### 字段说明
- `correctCount`: 本次答对的题目数量 (整数，≥0)
- `totalCount`: 本次总题目数量 (整数，≥1)
- 注意：`correctCount` 不能大于 `totalCount`

#### 响应示例
```json
{
  "message": "Progress submitted successfully",
  "result": {
    "bookId": "a14e6684-1d23-4d53-a917-6d5fff7feab5",
    "bookTitle": "English Grammar Basics",
    "currentAccuracy": 0.6,
    "correctCount": 3,
    "totalCount": 5,
    "progress": {
      "highestAccuracy": 1,
      "totalAttempts": 3,
      "lastAttemptedAt": "2025-10-14T11:49:33.296+00:00",
      "corruptionLevel": 0.1
    },
    "isNewRecord": false
  }
}
```

#### 字段说明
- `currentAccuracy`: 本次正确率 (0-1之间的小数)
- `progress.highestAccuracy`: 历史最高正确率
- `progress.totalAttempts`: 总尝试次数
- `progress.lastAttemptedAt`: 最后尝试时间
- `progress.corruptionLevel`: 腐蚀度等级 (基于艾宾浩斯遗忘曲线计算)
- `isNewRecord`: 是否创建了新的最高正确率记录

#### 错误码
- `PROGRESS_UPDATE_ERROR`: 进度更新失败
- `BOOK_NOT_FOUND`: 书籍不存在
- `VALIDATION_ERROR`: 请求参数验证失败

### 2. 获取学习进度 (已废弃)

~~**GET** `/progress/:bookId`~~

#### 替代方案
**注意**: 此接口暂未实现，学习进度信息可通过用户进度接口 `GET /user/progress` 获取

使用 `GET /user/progress` 接口获取用户所有书籍的学习进度信息。

---

## 用户接口

### 1. 获取用户学习进度
**GET** `/user/progress`

#### 功能说明
获取用户正在巩固的每本书的信息，包括学习进度、腐蚀等级等详细数据。

#### 请求头
```
Authorization: Bearer <token>
```

#### 响应示例
```json
[
  {
    "bookId": "a14e6684-1d23-4d53-a917-6d5fff7feab5",
    "title": "English Grammar Basics",
    "author": "John Smith",
    "description": "Learn fundamental English grammar rules",
    "coverImageUrl": null,
    "questionCount": 50,
    "highestAccuracy": 85,
    "totalAttempts": 12,
    "lastAttemptedAt": "2025-01-14T10:30:00.000Z",
    "corruptionLevel": 2,
    "createdAt": "2025-01-14T08:00:00.000Z",
    "updatedAt": "2025-01-14T10:30:00.000Z"
  },
  {
    "bookId": "44b16a72-429a-47ab-9fab-7aab94b341c6",
    "title": "《人类简史》",
    "author": "尤瓦尔·赫拉利",
    "description": "一本通俗易懂但又引人深思的书，讲述了从石器时代到今天的人类发展史。",
    "coverImageUrl": "https://placehold.co/400x600/6366f1/ffffff?text=人类简史",
    "questionCount": 3,
    "highestAccuracy": 90,
    "totalAttempts": 5,
    "lastAttemptedAt": "2025-01-13T15:20:00.000Z",
    "corruptionLevel": 3,
    "createdAt": "2025-01-13T14:00:00.000Z",
    "updatedAt": "2025-01-13T15:20:00.000Z"
  }
]
```

#### 字段说明
- `bookId`: 书籍唯一标识符
- `title`: 书籍标题
- `author`: 作者
- `description`: 书籍描述
- `coverImageUrl`: 封面图片URL (可为null)
- `questionCount`: 题目总数
- `highestAccuracy`: 最高准确率 (0-100)
- `totalAttempts`: 总尝试次数
- `lastAttemptedAt`: 最后尝试时间 (ISO 8601格式)
- `corruptionLevel`: 腐蚀等级 (1-5，基于艾宾浩斯遗忘曲线计算)
- `createdAt`: 进度记录创建时间 (ISO 8601格式)
- `updatedAt`: 进度记录更新时间 (ISO 8601格式)

#### 排序规则
返回结果按最后学习时间降序排列（最近学习的在前）。

#### 错误码
- `USER_PROGRESS_FETCH_ERROR`: 获取用户进度失败
- `BOOKS_FETCH_ERROR`: 获取书籍信息失败

#### 注意事项
- 只返回用户有学习记录的书籍
- 如果用户没有任何学习进度，返回空数组 `[]`
- 书籍必须是已发布状态才会显示

---

## 腐蚀等级说明

腐蚀等级基于艾宾浩斯遗忘曲线计算，反映知识的遗忘程度：

- **等级 1**: 新鲜知识 (绿色) - 刚学习或复习不久
- **等级 2**: 轻微遗忘 (浅黄色) - 需要适当复习
- **等级 3**: 中度遗忘 (橙色) - 建议尽快复习
- **等级 4**: 严重遗忘 (红色) - 急需复习
- **等级 5**: 完全遗忘 (深红色) - 需要重新学习

### 计算因素
- 最后学习时间
- 学习准确率
- 学习次数
- 时间间隔

---

## 状态码说明

### HTTP 状态码
- `200`: 请求成功
- `201`: 创建成功
- `400`: 请求参数错误
- `401`: 未授权
- `403`: 权限不足
- `404`: 资源不存在
- `429`: 请求过于频繁
- `500`: 服务器内部错误

---

## 开发注意事项

### 1. 认证处理
- 所有需要认证的接口都需要在请求头中携带 `Authorization: Bearer <token>`
- Token 过期时会返回 401 状态码，需要重新登录
- Token 有效期为 7 天

### 2. 错误处理
- 始终检查响应的状态码
- 错误响应包含 `error` 和 `code` 字段
- 根据 `code` 字段进行具体的错误处理

### 3. 数据格式
- 所有时间字段使用 ISO 8601 格式
- UUID 字段为标准 UUID v4 格式
- 图片URL支持 HTTPS 协议

### 4. 性能优化
- 题目列表支持分页和随机排序
- 建议合理设置 `limit` 参数避免一次性加载过多数据
- 图片资源建议进行缓存处理

### 5. 测试环境
- 开发环境地址: `http://localhost:3000`
- 健康检查接口: `GET /health`
- 支持 CORS，允许本地开发调试

---

## 示例代码

### JavaScript (Fetch API)
```javascript
// 登录
const login = async (email, password) => {
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  if (response.ok) {
    localStorage.setItem('token', data.token);
    return data;
  } else {
    throw new Error(data.error);
  }
};

// 获取书籍列表
const getBooks = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:3000/books', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (response.ok) {
    return await response.json();
  } else {
    const error = await response.json();
    throw new Error(error.error);
  }
};
```

### Swift (iOS)
```swift
// 登录
func login(email: String, password: String) async throws -> LoginResponse {
    let url = URL(string: "http://localhost:3000/auth/login")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body = ["email": email, "password": password]
    request.httpBody = try JSONSerialization.data(withJSONObject: body)
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
        return try JSONDecoder().decode(LoginResponse.self, from: data)
    } else {
        let error = try JSONDecoder().decode(ErrorResponse.self, from: data)
        throw APIError.serverError(error.error)
    }
}

// 获取书籍列表
func getBooks(token: String) async throws -> [Book] {
    let url = URL(string: "http://localhost:3000/books")!
    var request = URLRequest(url: url)
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
        return try JSONDecoder().decode([Book].self, from: data)
    } else {
        let error = try JSONDecoder().decode(ErrorResponse.self, from: data)
        throw APIError.serverError(error.error)
    }
}
```

---

## 更新日志

### v1.4.0 (2025-01-14)
- ✅ 新增微信授权登录功能
- **新增**: `POST /auth/wechat` 接口，支持微信OAuth2.0授权登录
- **新增**: 用户表增加微信相关字段 (wechat_openid, wechat_unionid, wechat_nickname, wechat_avatar)
- **新增**: 微信登录验证规则和错误处理
- **功能**: 支持新用户自动注册和已有用户信息更新
- **安全**: JWT token包含登录类型标识，便于区分登录方式
- **配置**: 需要配置微信应用的 APP_ID 和 APP_SECRET

### v1.3.0 (2025-01-14)
- ✅ 重构书籍和用户进度接口
- **新增**: `GET /user/progress` 接口，专门获取用户学习进度信息
- **更新**: `GET /books` 接口现在只返回书籍基本信息，不包含用户进度
- **改进**: 接口职责更加清晰，书籍信息和用户进度分离
- **优化**: 用户进度接口按最后学习时间排序，便于用户查看最近学习的内容
- **说明**: 原有的进度获取功能迁移到新的用户进度接口

### v1.2.0 (2025-01-14)
- ✅ 修复学习进度提交接口
- **更新**: 学习进度提交接口路径从 `/progress/submit` 更改为 `/books/:bookId/submit`
- **更新**: 请求参数简化为 `correctCount` 和 `totalCount`
- **修复**: 数据库触发器字段名问题，现在能正确更新 `updatedAt` 字段
- **改进**: 响应格式更加详细，包含书籍信息和完整的进度数据
- **说明**: 单独的获取进度接口暂未实现，可通过书籍列表接口获取进度信息

### v1.1.0 (2025-01-14)
- 修复书籍列表获取问题
- 优化用户认证流程
- 改进错误处理机制

### v1.0.0 (2025-01-14)
- 初始版本发布
- 实现基础认证功能
- 实现书籍和题目管理
- 实现学习进度跟踪