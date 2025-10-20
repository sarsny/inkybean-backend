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

### 2. 用户登录（邮箱）
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

### 2.1 用户登录（用户名）
**POST** `/auth/login/username`

#### 请求参数
```json
{
  "username": "testuser",
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
    "email": "user@example.com",
    "username": "testuser",
    "displayName": "Test User",
    "avatarUrl": null,
    "lastSignInAt": "2024-01-01T00:00:00Z"
  }
}
```

#### 错误码
- `INVALID_CREDENTIALS`: 用户名或密码错误
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

### 2. 添加新书籍
**POST** `/books`

#### 功能说明
添加新书籍，通过 Coze 工作流获取书籍详细信息。

#### 请求头
```
Authorization: Bearer <token>
Content-Type: application/json
```

#### 请求参数
```json
{
  "title": "书名"
}
```

#### 响应示例

**成功添加新书籍 (201)**:
```json
{
  "message": "书籍添加成功",
  "book": {
    "bookId": "uuid",
    "title": "定位",
    "author": "[美] 艾·里斯, 杰克·特劳特",
    "description": "20多年前，美国《广告时代》杂志约请年轻的营销专家里斯和特劳特撰写一系列有关营销和广告新思维的文章...",
    "coverImageUrl": "https://img9.doubanio.com/view/subject/l/public/s1081174.jpg",
    "questionCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**书籍已存在 (200)**:
```json
{
  "message": "书籍已存在",
  "book": {
    "bookId": "existing-uuid",
    "title": "定位",
    "author": "[美] 艾·里斯, 杰克·特劳特",
    "description": "...",
    "coverImageUrl": "...",
    "questionCount": 15,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 错误响应

**400 - 参数错误**:
```json
{
  "error": "书名不能为空",
  "code": "INVALID_TITLE"
}
```

**500 - Coze API 错误**:
```json
{
  "error": "无法找到书籍信息，请稍后再试",
  "code": "COZE_API_ERROR",
  "details": "具体错误信息"
}
```

**500 - 数据库错误**:
```json
{
  "error": "书籍信息保存失败",
  "code": "DATABASE_INSERT_ERROR"
}
```

#### 特性说明
- 同步处理：接口会等待 Coze 工作流返回书籍信息后再响应
- 重复检查：自动检查书籍是否已存在，避免重复添加
- 后台任务：书籍成功添加后会自动触发题目生成（异步执行）
- 容错处理：Coze API 调用失败时会立即返回错误信息
- 完整信息：通过 Coze 工作流获取书籍的详细信息，包括封面、描述、作者介绍等

### 3. 获取书籍题目
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

### 3. 选择书籍进行巩固
**POST** `/books/:bookId/select`

#### 功能说明
用户选择要巩固的书籍，创建用户与书籍的绑定关系。如果用户已经选择过该书籍，则返回现有记录。

#### 请求头
```
Authorization: Bearer <token>
Content-Type: application/json
```

#### 路径参数
- `bookId`: 书籍ID (uuid)

#### 响应示例

**首次选择书籍 (201)**:
```json
{
  "message": "书籍选择成功，开始巩固之旅！",
  "userProgress": {
    "progressId": "b744e6d1-49a0-4557-b336-6e84a04000a1",
    "bookId": "caa8bde3-48be-4f3f-b6f0-3f4b7f8862c4",
    "title": "平凡的世界",
    "author": "路遥",
    "questionCount": 10,
    "highestAccuracy": 0,
    "totalAttempts": 0,
    "lastAttemptedAt": null,
    "alreadySelected": false,
    "selectedAt": "2025-10-16T08:48:09.30223+00:00"
  }
}
```

**重复选择书籍 (200)**:
```json
{
  "message": "您已经选择过这本书籍",
  "userProgress": {
    "progressId": "b744e6d1-49a0-4557-b336-6e84a04000a1",
    "bookId": "caa8bde3-48be-4f3f-b6f0-3f4b7f8862c4",
    "title": "平凡的世界",
    "author": "路遥",
    "questionCount": 10,
    "alreadySelected": true,
    "selectedAt": "2025-10-16T08:48:09.30223+00:00"
  }
}
```

#### 字段说明
- `progressId`: 用户进度记录唯一标识符
- `bookId`: 书籍唯一标识符
- `title`: 书籍标题
- `author`: 作者
- `questionCount`: 书籍题目总数
- `highestAccuracy`: 最高准确率 (0-100)
- `totalAttempts`: 总尝试次数
- `lastAttemptedAt`: 最后尝试时间
- `alreadySelected`: 是否已经选择过该书籍
- `selectedAt`: 选择时间

#### 错误码
- `BOOK_NOT_FOUND`: 书籍不存在或未发布
- `NO_QUESTIONS_AVAILABLE`: 书籍暂无题目
- `DATABASE_ERROR`: 数据库查询错误
- `DATABASE_INSERT_ERROR`: 记录创建失败
- `UNAUTHORIZED`: 未授权访问

### 4. 删除书籍绑定关系
**DELETE** `/books/:bookId/unselect`

#### 功能说明
用户删除书籍，解除用户与书籍的绑定关系。删除后用户的学习进度将被清除。

#### 请求头
```
Authorization: Bearer <token>
```

#### 路径参数
- `bookId`: 书籍ID (uuid)

#### 响应示例

**删除成功 (200)**:
```json
{
  "message": "书籍删除成功，已解除绑定关系",
  "deletedBook": {
    "bookId": "caa8bde3-48be-4f3f-b6f0-3f4b7f8862c4",
    "title": "平凡的世界",
    "author": "路遥",
    "deletedAt": "2025-10-20T11:30:00.000Z"
  }
}
```

#### 字段说明
- `bookId`: 书籍唯一标识符
- `title`: 书籍标题
- `author`: 作者
- `deletedAt`: 删除时间

#### 错误码
- `BOOK_NOT_FOUND`: 书籍不存在
- `PROGRESS_NOT_FOUND`: 用户尚未选择过这本书籍
- `DATABASE_ERROR`: 数据库查询错误
- `DATABASE_DELETE_ERROR`: 删除记录失败
- `UNAUTHORIZED`: 未授权访问
- `questionCount`: 书籍题目总数
- `highestAccuracy`: 历史最高正确率 (0-1之间的小数)
- `totalAttempts`: 总尝试次数
- `lastAttemptedAt`: 最后尝试时间 (ISO 8601格式，可为null)
- `alreadySelected`: 是否已经选择过该书籍
- `selectedAt`: 选择时间 (ISO 8601格式)

#### 错误响应

**404 - 书籍不存在**:
```json
{
  "error": "书籍不存在或未发布",
  "code": "BOOK_NOT_FOUND"
}
```

**400 - 书籍无题目**:
```json
{
  "error": "该书籍暂无题目，无法开始巩固",
  "code": "NO_QUESTIONS_AVAILABLE"
}
```

**500 - 数据库错误**:
```json
{
  "error": "检查用户学习状态时出错",
  "code": "DATABASE_ERROR"
}
```

**500 - 创建记录失败**:
```json
{
  "error": "选择书籍失败",
  "code": "DATABASE_INSERT_ERROR"
}
```

#### 特性说明
- 验证书籍存在性：确保书籍存在且已发布
- 题目检查：确保书籍有可用题目才允许选择
- 重复选择处理：如果用户已选择过该书籍，返回现有记录而不创建新记录
- 自动创建进度记录：首次选择时在 `user_progress` 表中创建记录
- 完整信息返回：返回书籍和用户进度的完整信息

### 4. 生成书籍题目
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

## Coze AI 对话接口

### 1. 创建会话
**POST** `/coze/conversation`

#### 功能说明
为当前用户创建一个新的 Coze AI 对话会话。

#### 请求头
```
Authorization: Bearer <token>
```

#### 响应示例
```json
{
  "success": true,
  "data": {
    "conversation_id": "7372358454780100000",
    "user_id": "uuid"
  }
}
```

#### 字段说明
- `conversation_id`: Coze 平台生成的会话ID
- `user_id`: 当前用户ID

#### 错误码
- `UNAUTHORIZED`: 用户未认证
- `COZE_API_ERROR`: Coze API 调用失败

### 2. 发起对话
**POST** `/coze/chat`

#### 功能说明
向 Coze AI 发送消息并获取对话ID，用于后续状态查询。

#### 请求头
```
Authorization: Bearer <token>
```

#### 请求参数
```json
{
  "message": "你好，请介绍一下你自己",
  "conversation_id": "7372358454780100000",
  "custom_variables": {
    "username": "张三",
    "user_preferences": "学习英语"
  }
}
```

#### 字段说明
- `message`: 用户消息内容（必填）
- `conversation_id`: 会话ID（可选，不提供时会自动创建）
- `custom_variables`: 自定义变量（可选）

#### 响应示例
```json
{
  "success": true,
  "data": {
    "conversation_id": "7372358454780100000",
    "chat_id": "7372358454780100001",
    "status": "in_progress",
    "created_at": 1640995200,
    "last_error": null
  }
}
```

#### 字段说明
- `chat_id`: 对话ID，用于查询状态和获取消息
- `status`: 对话状态（in_progress/completed/failed/requires_action）
- `created_at`: 创建时间戳
- `last_error`: 错误信息（如有）

#### 错误码
- `UNAUTHORIZED`: 用户未认证
- `MISSING_MESSAGE`: 消息内容不能为空
- `COZE_API_ERROR`: Coze API 调用失败

### 3. 完整对话（等待完成）
**POST** `/coze/chat/complete`

#### 功能说明
发送消息并等待 AI 完成回复，直接返回完整的回复内容。

#### 请求头
```
Authorization: Bearer <token>
```

#### 请求参数
```json
{
  "message": "请解释一下量子物理的基本概念",
  "conversation_id": "7372358454780100000",
  "custom_variables": {
    "difficulty_level": "beginner"
  }
}
```

#### 响应示例
```json
{
  "success": true,
  "data": {
    "response": "量子物理是研究微观粒子行为的物理学分支。它的基本概念包括：\n\n1. 量子化：能量、角动量等物理量只能取特定的离散值...\n\n2. 波粒二象性：微观粒子既表现出波动性，又表现出粒子性...\n\n3. 不确定性原理：无法同时精确测量粒子的位置和动量..."
  }
}
```

#### 字段说明
- `response`: AI 的完整回复内容

#### 错误码
- `UNAUTHORIZED`: 用户未认证
- `MISSING_MESSAGE`: 消息内容不能为空
- `COZE_API_ERROR`: Coze API 调用失败
- `CHAT_TIMEOUT`: 对话超时
- `CHAT_FAILED`: 对话失败

### 4. 获取对话状态
**GET** `/coze/chat/:conversationId/:chatId/status`

#### 功能说明
查询指定对话的当前状态。

#### 请求头
```
Authorization: Bearer <token>
```

#### 路径参数
- `conversationId`: 会话ID
- `chatId`: 对话ID

#### 响应示例
```json
{
  "success": true,
  "data": {
    "id": "7372358454780100001",
    "conversation_id": "7372358454780100000",
    "bot_id": "7372358454780100002",
    "status": "completed",
    "created_at": 1640995200,
    "completed_at": 1640995230,
    "failed_at": null,
    "last_error": null,
    "usage": {
      "token_count": 150,
      "output_count": 80,
      "input_count": 70
    }
  }
}
```

#### 字段说明
- `status`: 对话状态
  - `in_progress`: 进行中
  - `completed`: 已完成
  - `failed`: 失败
  - `requires_action`: 需要用户操作
- `completed_at`: 完成时间戳
- `failed_at`: 失败时间戳
- `usage`: Token 使用统计

#### 错误码
- `UNAUTHORIZED`: 用户未认证
- `MISSING_PARAMS`: 会话ID或对话ID不能为空
- `COZE_API_ERROR`: Coze API 调用失败

### 5. 获取消息列表
**GET** `/coze/messages/:conversationId/:chatId`

#### 功能说明
获取指定对话的所有消息记录。

#### 请求头
```
Authorization: Bearer <token>
```

#### 路径参数
- `conversationId`: 会话ID
- `chatId`: 对话ID

#### 响应示例
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "7372358454780100003",
        "conversation_id": "7372358454780100000",
        "bot_id": "7372358454780100002",
        "chat_id": "7372358454780100001",
        "meta_data": {},
        "role": "user",
        "type": "question",
        "content": "请解释一下量子物理的基本概念",
        "content_type": "text",
        "created_at": 1640995200,
        "updated_at": 1640995200
      },
      {
        "id": "7372358454780100004",
        "conversation_id": "7372358454780100000",
        "bot_id": "7372358454780100002",
        "chat_id": "7372358454780100001",
        "meta_data": {},
        "role": "assistant",
        "type": "answer",
        "content": "量子物理是研究微观粒子行为的物理学分支...",
        "content_type": "text",
        "created_at": 1640995230,
        "updated_at": 1640995230
      }
    ]
  }
}
```

#### 字段说明
- `messages`: 消息数组
  - `role`: 消息角色（user/assistant）
  - `type`: 消息类型（question/answer/function_call等）
  - `content`: 消息内容
  - `content_type`: 内容类型（text/image/file等）

#### 错误码
- `UNAUTHORIZED`: 用户未认证
- `MISSING_PARAMS`: 会话ID或对话ID不能为空
- `COZE_API_ERROR`: Coze API 调用失败

### 6. 清空会话
**DELETE** `/coze/conversation`

#### 功能说明
清空当前用户的 Coze 会话记录。

#### 请求头
```
Authorization: Bearer <token>
```

#### 响应示例
```json
{
  "success": true,
  "message": "会话已清空"
}
```

#### 错误码
- `UNAUTHORIZED`: 用户未认证

### 7. 获取会话ID
**GET** `/coze/conversation`

#### 功能说明
获取当前用户的 Coze 会话ID。

#### 请求头
```
Authorization: Bearer <token>
```

#### 响应示例
```json
{
  "success": true,
  "data": {
    "conversation_id": "7372358454780100000",
    "user_id": "uuid"
  }
}
```

#### 错误码
- `UNAUTHORIZED`: 用户未认证
- `CONVERSATION_NOT_FOUND`: 会话不存在，请先创建会话

### Coze 环境配置

需要在 `.env` 文件中配置以下环境变量：

```env
# Coze API 配置
COZE_API_KEY=your_coze_api_key
COZE_BASE_URL=https://api.coze.com
COZE_BOT_ID=your_bot_id
COZE_WORKFLOW_ID=your_workflow_id
```

### 使用示例

#### JavaScript 示例
```javascript
// 创建会话并发起对话
const createConversationAndChat = async (message) => {
  const token = localStorage.getItem('token');
  
  // 1. 创建会话
  const conversationResponse = await fetch('/coze/conversation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const { data: { conversation_id } } = await conversationResponse.json();
  
  // 2. 发起对话并等待完成
  const chatResponse = await fetch('/coze/chat/complete', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      conversation_id,
      custom_variables: {
        username: '用户名',
        difficulty_level: 'beginner'
      }
    })
  });
  
  const { data: { response } } = await chatResponse.json();
  return response;
};
```

#### Swift 示例
```swift
// 完整对话示例
func completeChat(message: String, token: String) async throws -> String {
    let url = URL(string: "http://localhost:3000/coze/chat/complete")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body = [
        "message": message,
        "custom_variables": [
            "username": "用户名",
            "difficulty_level": "beginner"
        ]
    ] as [String : Any]
    
    request.httpBody = try JSONSerialization.data(withJSONObject: body)
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
        let result = try JSONDecoder().decode(CozeResponse.self, from: data)
        return result.data.response
    } else {
        let error = try JSONDecoder().decode(ErrorResponse.self, from: data)
        throw APIError.serverError(error.error)
    }
}
```

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
- Token 有效期为 30 天

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