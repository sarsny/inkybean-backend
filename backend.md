# Cobean iOS App Backend Documentation

**版本**: 1.5.0  
**最后更新**: 2025-01-15

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

### 4. themes 表
存储书籍主题信息（用于AI题目生成）

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | uuid | PRIMARY KEY | gen_random_uuid() | 主题唯一标识 |
| bookId | uuid | FOREIGN KEY | - | 关联书籍ID |
| themeText | text | NOT NULL | - | 主题文本内容 |
| createdAt | timestamptz | NOT NULL | now() | 创建时间 |

### 5. questions 表
存储题目信息

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| questionId | uuid | PRIMARY KEY | gen_random_uuid() | 题目唯一标识符 |
| bookId | uuid | FOREIGN KEY | - | 关联的书籍ID，引用books表 |
| statement | text | NOT NULL | - | 题目陈述 |
| imageUrl | text | NULLABLE | - | 题目配图URL |
| isPure | boolean | NOT NULL | - | 是否为纯文本题目 |
| explanation | text | NOT NULL | - | 题目解释说明 |
| themeId | uuid | FOREIGN KEY | - | 关联的主题ID，引用themes表 |
| createdAt | timestamptz | NOT NULL | now() | 创建时间 |
| updatedAt | timestamptz | NOT NULL | now() | 更新时间 |

### 6. dialogues 表
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

**查询参数:**
- `limit`: 题目数量限制 (可选，默认10)
- `shuffle`: 是否随机排序 (可选，默认true)

**响应示例:**
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

**错误码:**
- `BOOK_NOT_FOUND`: 书籍不存在或未发布
- `QUESTIONS_FETCH_ERROR`: 获取题目失败
- `UNAUTHORIZED`: 未授权访问

#### POST /books/:bookId/generate-questions
基于书籍信息和现有题目，调用AI服务生成新的高质量题目

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**请求参数:**
- `bookId`: 书籍UUID (路径参数)

**AI生成工作流程:**
1. **数据收集阶段**: 获取书籍基本信息（标题、作者）和现有主题列表
2. **主题生成阶段**: 使用DeepSeek AI基于书籍内容生成新的核心主题，并保存到themes表
3. **角度分配阶段**: 后端随机为每个主题分配创意角度（如"实践应用"、"批判性思考"等）
4. **题目生成阶段**: 基于主题和指定角度生成具体的判断题，关联对应的themeId
5. **数据存储阶段**: 将生成的题目批量插入数据库并更新书籍统计

**响应示例:**
```json
{
  "message": "Questions generated successfully",
  "result": {
    "bookId": "44b16a72-429a-47ab-9fab-7aab94b341c6",
    "bookTitle": "《人类简史》",
    "questions": [
      {
        "questionId": "new-uuid-1",
        "bookId": "44b16a72-429a-47ab-9fab-7aab94b341c6",
        "statement": "认知革命使智人能够创造虚构的概念，如宗教、货币和法律。",
        "imageUrl": null,
        "isPure": true,
        "explanation": "正确。认知革命约发生在7万年前，使智人具备了创造和相信虚构概念的能力，这是智人能够大规模合作的关键。",
        "createdAt": "2025-01-15T08:00:52.632703+00:00",
        "updatedAt": "2025-01-15T08:00:52.632703+00:00"
      }
    ],
    "totalGenerated": 5,
    "newQuestionCount": 8
  }
}
```

**错误码:**
- `BOOK_NOT_FOUND`: 书籍不存在或未发布
- `QUESTIONS_FETCH_ERROR`: 获取现有题目失败
- `AI_SERVICE_ERROR`: AI服务调用失败
- `INVALID_AI_RESPONSE`: AI返回数据格式无效
- `QUESTIONS_INSERT_ERROR`: 题目插入数据库失败
- `UNAUTHORIZED`: 未授权访问

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

## AI题目生成系统

### 两阶段生成架构

Cobean采用创新的两阶段AI生成架构，确保题目的高质量和多样性：

#### 阶段1：主题提取与生成
- **输入**: 书籍标题、作者、现有主题列表
- **处理**: DeepSeek AI分析书籍核心内容，生成新的主题
- **输出**: 3-5个核心主题文本
- **去重**: 自动过滤与现有主题重复的内容

#### 阶段2：角度化题目生成
- **角度分配**: 后端随机为每个主题分配创意角度：
  - 实践应用 (practical_application)
  - 批判性思考 (critical_thinking)  
  - 概念理解 (conceptual_understanding)
  - 历史对比 (historical_comparison)
  - 现实关联 (real_world_connection)
- **题目生成**: 基于主题+角度组合生成具体判断题
- **质量保证**: 每道题包含准确的解释和推理过程

### AI服务配置

```javascript
// DeepSeek API 配置
const DEEPSEEK_CONFIG = {
  apiUrl: process.env.DEEPSEEK_API_URL,
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: "deepseek-chat",
  timeout: 60000, // 60秒超时
  maxTokens: 2000
};
```

- **API提供商**：DeepSeek
- **模型**：deepseek-chat
- **超时设置**：60秒
- **错误处理**：自动重试机制

### 提示词工程

系统使用精心设计的提示词模板，确保AI生成符合要求的内容：

- **主题生成提示词**: 引导AI提取书籍核心概念
- **题目生成提示词**: 基于主题和角度生成判断题
- **格式约束**: 严格的JSON输出格式要求
- **质量标准**: 明确的题目质量和难度要求

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
- PM2 (生产环境进程管理)
- Nginx (反向代理)
- Git (代码拉取)
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

#### 方式一：使用自动化部署脚本

1. **使用部署脚本**
```bash
# 赋予执行权限
chmod +x deploy.sh

# 执行部署（首次部署）
./deploy.sh --clean-install

# 常规部署
./deploy.sh

# 查看帮助
./deploy.sh --help
```

2. **部署脚本功能**
- 自动从GitHub拉取最新代码
- 检查系统依赖（git, node, npm, pm2）
- 创建自动备份
- 安装/更新依赖
- 配置生产环境变量
- 使用PM2启动服务
- 执行健康检查
- 自动清理旧备份
- 支持回滚功能

#### 方式二：手动部署

1. **安装系统依赖**
```bash
# 安装Node.js和npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PM2
sudo npm install -g pm2

# 安装Nginx
sudo apt-get install -y nginx
```

2. **配置生产环境**
```bash
# 克隆代码
git clone https://github.com/your-username/cobean-ios-backend.git /var/www/cobean-backend
cd /var/www/cobean-backend

# 安装依赖
npm ci --production

# 配置环境变量
cp .env.production .env
# 编辑 .env 文件，填入正确的配置
```

3. **配置PM2**
```bash
# 使用PM2配置文件启动
pm2 start ecosystem.config.js --env production

# 设置PM2开机自启
pm2 startup
pm2 save
```

4. **配置Nginx**
```bash
# 复制Nginx配置
sudo cp nginx.conf /etc/nginx/sites-available/cobean-backend

# 创建软链接
sudo ln -s /etc/nginx/sites-available/cobean-backend /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

5. **配置SSL证书（推荐）**
```bash
# 安装Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d api.cobean.app

# 设置自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

### 部署文件说明

#### deploy.sh
自动化部署脚本，包含以下功能：
- 代码拉取和备份
- 依赖管理
- 环境配置
- 服务启动
- 健康检查
- 回滚支持

#### .env.production
生产环境配置模板，包含：
- 数据库连接配置
- JWT密钥配置
- DeepSeek AI配置
- 安全和监控配置

#### ecosystem.config.js
PM2进程管理配置，包含：
- 集群模式配置
- 日志管理
- 自动重启策略
- 性能监控
- 部署配置

#### nginx.conf
Nginx反向代理配置，包含：
- 负载均衡配置
- SSL/TLS配置
- 安全头设置
- 请求限制
- 静态文件服务

### 监控和维护

1. **PM2监控**
```bash
# 查看进程状态
pm2 status

# 查看日志
pm2 logs cobean-backend

# 重启服务
pm2 restart cobean-backend

# 监控面板
pm2 monit
```

2. **Nginx监控**
```bash
# 查看Nginx状态
sudo systemctl status nginx

# 查看访问日志
sudo tail -f /var/log/nginx/cobean-backend.access.log

# 查看错误日志
sudo tail -f /var/log/nginx/cobean-backend.error.log
```

3. **系统监控**
```bash
# 查看系统资源
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

### 故障排除

1. **服务无法启动**
```bash
# 检查端口占用
sudo netstat -tlnp | grep :3000

# 检查PM2日志
pm2 logs cobean-backend --lines 50

# 检查环境变量
pm2 env 0
```

2. **数据库连接问题**
```bash
# 测试Supabase连接
curl -H "apikey: YOUR_ANON_KEY" https://your-project.supabase.co/rest/v1/

# 检查环境变量配置
grep SUPABASE .env
```

3. **Nginx配置问题**
```bash
# 测试Nginx配置
sudo nginx -t

# 重新加载配置
sudo nginx -s reload

# 检查端口监听
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

### Docker 部署（可选）

1. **Dockerfile**
```dockerfile
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 更改文件所有权
RUN chown -R nodejs:nodejs /app
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动应用
CMD ["npm", "start"]
```

2. **docker-compose.yml**
```yaml
version: '3.8'

services:
  cobean-backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
    networks:
      - cobean-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - cobean-backend
    restart: unless-stopped
    networks:
      - cobean-network

networks:
  cobean-network:
    driver: bridge
```

3. **Docker部署命令**
```bash
# 构建和启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 更新部署
docker-compose pull && docker-compose up -d
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

### Version 1.5.0 (2025-01-15)
- ✅ 新增完整的生产部署解决方案
- **新增功能**:
  1. **自动化部署脚本**: 创建 `deploy.sh` 脚本，支持一键部署
  2. **生产环境配置**: 提供 `.env.production` 模板，包含完整的生产环境配置
  3. **PM2进程管理**: 配置 `ecosystem.config.js`，支持集群模式和自动重启
  4. **Nginx反向代理**: 提供完整的 `nginx.conf` 配置，包含SSL、负载均衡和安全设置
- **部署脚本功能**:
  1. 自动从GitHub拉取最新代码
  2. 系统依赖检查（git, node, npm, pm2）
  3. 自动备份和回滚机制
  4. 环境变量配置
  5. 健康检查和日志记录
- **生产环境优化**:
  1. PM2集群模式，充分利用多核CPU
  2. Nginx负载均衡和请求限制
  3. SSL/TLS安全配置
  4. 日志管理和监控
  5. 自动重启和故障恢复
- **Docker支持**:
  1. 优化的Dockerfile配置
  2. docker-compose.yml编排文件
  3. 健康检查和安全配置
- **文档更新**:
  1. 详细的部署指南
  2. 监控和维护说明
  3. 故障排除指南
  4. 安全最佳实践
- **影响**: 提供了完整的生产部署解决方案，大幅简化了部署流程和运维管理

### Version 1.4.0 (2025-01-15)
**DeepSeek參數優化**
- ✅ **PromptA優化**：主題提取階段採用高創造力配置
  - Temperature: 1.0（範圍0.9-1.2）最大化創造力，尋找新角度
  - Max Tokens: 2048，提供充足的token空間
- ✅ **PromptB優化**：問題生成階段採用平衡配置
  - Temperature: 0.7（範圍0.6-0.8）平衡創意與穩定，遵循指令
  - Max Tokens: 4096，支持批量生成更多內容

**技術改進**
- 🔧 **參數化API調用**：`callDeepSeekAPI`函數支持動態參數配置
- 🔧 **階段性優化**：不同生成階段使用最適合的AI參數
- 🔧 **性能提升**：更大的token限制提升內容生成質量

**配置說明**
- 📊 **創造力最大化**：主題提取使用高temperature激發創新思維
- 📊 **穩定性保證**：問題生成使用適中temperature確保指令遵循
- 📊 **容量擴展**：增加max_tokens支持更豐富的內容生成

**測試驗證**
- ✅ 參數優化後的生成測試通過
- ✅ 兩階段配置協調性驗證完成
- ✅ 生成質量和穩定性測試通過

### 2025-01-14 - 添加请求响应日志功能
- **新增功能**: 实现详细的请求和响应日志记录
- **实现内容**:
  1. 创建 `middleware/logger.js` 日志中间件
  2. 记录请求信息：时间戳、HTTP方法、路径、IP地址、请求头、请求体（敏感信息已脱敏）
  3. 记录响应信息：响应时间、状态码、响应数据（过长时截断）
  4. 提供状态分类：成功(2xx)、客户端错误(4xx)、服务器错误(5xx)
  5. 集成到主应用 `index.js` 中，位于body解析中间件之后
- **测试验证**: 通过 `/health` 和 `/auth/wechat` 接口验证日志功能正常工作
- **影响**: 提升系统可观测性，便于问题排查和性能监控

### 2025-01-14 - 修复书籍题目接口RLS权限问题
- **问题**: `GET /books/:bookId/questions` 接口返回404错误，提示"Book not found or not published"
- **原因**: 代码使用普通 `supabase` 客户端查询书籍信息，受到 Row Level Security (RLS) 策略限制
- **解决方案**:
  1. 修改 `routes/books.js` 中的书籍验证查询，使用 `supabaseAdmin` 替代 `supabase`
  2. 修改题目数据查询，同样使用 `supabaseAdmin` 绕过RLS限制
- **测试验证**: `GET /books/44b16a72-429a-47ab-9fab-7aab94b341c6/questions` 现在正确返回200状态码和题目数据
- **影响**: 书籍题目接口现在能正确获取已发布书籍的题目列表

### 2025-01-14 - 更新API文档格式
- **更新内容**: 
  1. 修正 `API_DOCUMENTATION.md` 中 `/books/:bookId/questions` 接口的响应格式
  2. 更新响应示例，使用真实的数据库数据
  3. 修正字段说明，移除不存在的 `options` 字段
  4. 更新错误码描述，明确"书籍不存在或未发布"的含义
  5. 同步更新 `backend.md` 文档中的相应接口描述
- **影响**: API文档现在准确反映实际的接口行为和返回格式

### 2025-01-14 - 新增AI题目生成接口
- **新增**: `POST /books/:bookId/generate-questions` 接口，支持基于书籍内容智能生成高质量题目
- **功能特性**:
  1. 集成 DeepSeek API，基于书籍标题、作者和现有题目生成新题目
  2. 智能去重机制，确保生成的题目与现有题目不重复
  3. 高质量题目生成，包含核心概念测试和详细解释
  4. 自动插入数据库并更新书籍题目计数
  5. 完整的错误处理和日志记录
- **技术实现**:
  - 使用 Axios 调用 DeepSeek Chat Completions API
  - 实现 `buildPrompt` 函数构建上下文提示词
  - 实现 `callDeepSeekAPI` 函数处理 AI 服务调用
  - 批量插入题目到 `questions` 表
  - 自动更新 `books` 表的 `questionCount` 字段
- **环境配置**: 新增 `DEEPSEEK_API_KEY` 和 `DEEPSEEK_API_URL` 环境变量
- **测试覆盖**: 添加基础单元测试验证接口认证和参数验证
- **文档更新**: 同步更新 API_DOCUMENTATION.md 和 backend.md
- **影响**: 为内容管理员提供了高效的题目生成工具，大幅提升题目创建效率

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

### Version 1.3.0 (2025-01-15)
- ✅ 新增主题数据持久化功能
- **新增功能**:
  1. **主题数据持久化**: AI生成的新主题现在会自动保存到themes表中
  2. **题目主题关联**: questions表新增themeId字段，建立题目与主题的关联关系
  3. **数据库架构优化**: 完善了themes和questions表之间的外键关系
- **技术改进**:
  1. **数据完整性**: 通过外键约束确保数据一致性
  2. **查询性能**: 为questions表的themeId字段添加索引
  3. **关联逻辑**: 优化题目生成时的主题分配算法
- **数据库变更**:
  1. 为questions表添加themeId字段（uuid, foreign key）
  2. 创建idx_questions_theme_id索引提升查询性能
  3. 建立themes表与questions表的外键关联
- **API响应增强**:
  1. POST /books/:bookId/generate-questions 现在返回themesInserted信息
  2. 题目数据包含themeId字段，支持主题追溯
- **测试验证**:
  1. 验证主题保存功能正常工作
  2. 确认题目与主题的正确关联
  3. 测试数据库约束和索引性能
- **影响**: 建立了完整的主题-题目关联体系，为后续的主题分析和个性化推荐奠定基础

### Version 1.2.0 (2025-01-15)
- ✅ 实现两阶段AI题目生成架构
- **重大更新**: 升级AI题目生成系统，采用创新的两阶段生成架构
- **新功能**:
  1. **阶段1 - 主题生成**: 基于书籍内容和现有主题，使用DeepSeek AI生成新的核心主题
  2. **阶段2 - 角度化题目生成**: 为每个主题随机分配创意角度，生成多样化的判断题
  3. **智能去重**: 自动避免与现有主题和题目的重复
  4. **质量保证**: 每道题目包含详细的解释和推理过程
- **技术改进**:
  1. 修复themes表结构不匹配问题，更新`extractExistingThemes`函数
  2. 增加API调用超时时间至60秒，提升稳定性
  3. 完善错误处理机制，包含详细的错误分类和日志
  4. 更新SQL迁移文件，反映实际的themes表结构
- **创意角度系统**: 
  - 实践应用 (practical_application)
  - 批判性思考 (critical_thinking)
  - 概念理解 (conceptual_understanding)
  - 历史对比 (historical_comparison)
  - 现实关联 (real_world_connection)
- **测试验证**: 通过完整的端到端测试，成功生成10道高质量题目
- **文档更新**: 完善backend.md，添加AI生成系统详细说明和工作流程
- **影响**: 大幅提升题目生成的质量、多样性和系统稳定性

### Version 1.1.0 (2025-01-15)
- ✅ 新增AI题目生成接口 `POST /books/:bookId/generate-questions`
- **功能**: 使用DeepSeek AI为指定书籍生成新的判断题
- **特性**:
  1. 集成DeepSeek AI API，基于书籍内容和现有题目生成新题目
  2. 自动避免重复题目，确保题目多样性
  3. 生成的题目包含陈述、正确性判断和详细解释
  4. 支持批量生成（默认5道题目）
  5. 自动更新书籍的题目计数
- **技术实现**:
  1. 添加DeepSeek API配置和调用函数
  2. 实现智能提示词工程，确保AI生成高质量题目
  3. 添加JSON响应解析和错误处理
  4. 实现数据库事务确保数据一致性
- **安全性**: 需要JWT认证，验证用户身份
- **错误处理**: 完善的错误码体系，包括AI服务错误、数据格式错误等
- **影响**: 为应用提供了动态题目生成能力，大幅提升内容丰富度

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

**最后更新**: 2025-01-15  
**文档版本**: 1.5.0  
**维护者**: Cobean 开发团队