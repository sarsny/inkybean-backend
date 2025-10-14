# Cobean iOS App API 接口文档

## 概述

本文档为 Cobean iOS App 后端 API 的详细接口说明，面向前端开发工程师。所有接口均基于 RESTful 设计原则，使用 JSON 格式进行数据交换。

### 基础信息
- **Base URL**: `http://localhost:3000` (开发环境)
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

---

## 书籍接口

### 1. 获取书籍列表
**GET** `/books`

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
    "corruptionLevel": 1,
    "highestAccuracy": 0,
    "totalAttempts": 0,
    "lastAttemptedAt": null
  },
  {
    "bookId": "44b16a72-429a-47ab-9fab-7aab94b341c6",
    "title": "《人类简史》",
    "author": "尤瓦尔·赫拉利",
    "description": "一本通俗易懂但又引人深思的书，讲述了从石器时代到今天的人类发展史。",
    "coverImageUrl": "https://placehold.co/400x600/6366f1/ffffff?text=人类简史",
    "questionCount": 3,
    "corruptionLevel": 1,
    "highestAccuracy": 85,
    "totalAttempts": 12,
    "lastAttemptedAt": "2024-01-14T10:30:00Z"
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
- `corruptionLevel`: 腐蚀等级 (1-5，基于艾宾浩斯遗忘曲线计算)
- `highestAccuracy`: 最高准确率 (0-100)
- `totalAttempts`: 总尝试次数
- `lastAttemptedAt`: 最后尝试时间 (ISO 8601格式，可为null)

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
[
  {
    "questionId": "uuid",
    "statement": "What is the correct form of the verb?",
    "imageUrl": null,
    "isPure": true,
    "explanation": "The correct answer is 'have been' because...",
    "options": [
      {
        "optionId": "uuid",
        "text": "have been",
        "isCorrect": true
      },
      {
        "optionId": "uuid",
        "text": "has been",
        "isCorrect": false
      }
    ]
  }
]
```

#### 字段说明
- `questionId`: 题目唯一标识符
- `statement`: 题目陈述
- `imageUrl`: 题目图片URL (可为null)
- `isPure`: 是否为纯净题目
- `explanation`: 题目解释
- `options`: 选项数组
  - `optionId`: 选项唯一标识符
  - `text`: 选项文本
  - `isCorrect`: 是否为正确答案

#### 错误码
- `BOOK_NOT_FOUND`: 书籍不存在
- `QUESTIONS_FETCH_ERROR`: 获取题目失败

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

### 2. 获取学习进度
**注意**: 此接口暂未实现，学习进度信息可通过书籍列表接口 `GET /books` 获取

~~**GET** `/progress/:bookId`~~

#### 替代方案
使用 `GET /books` 接口获取书籍列表，其中包含每本书的学习进度信息：

```json
{
  "books": [
    {
      "bookId": "uuid",
      "title": "书籍标题",
      "author": "作者",
      "description": "描述",
      "coverImageUrl": "封面URL",
      "questionCount": 50,
      "progress": {
        "highestAccuracy": 0.85,
        "totalAttempts": 15,
        "lastAttemptedAt": "2024-01-14T10:30:00Z",
        "corruptionLevel": 2
      }
    }
  ]
}
```

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