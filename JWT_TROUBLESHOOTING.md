# JWT Token 签名验证问题排查指南

## 问题描述

服务器日志显示JWT token签名验证失败错误：
```
Auth middleware error: JsonWebTokenError: invalid signature
```

## 问题原因分析

JWT token签名验证失败通常由以下原因引起：

### 1. JWT_SECRET 不匹配
- **问题**: 生成token时使用的JWT_SECRET与验证时使用的JWT_SECRET不一致
- **常见场景**: 
  - 开发环境和生产环境使用不同的JWT_SECRET
  - 服务重启后环境变量未正确加载
  - 多个服务实例使用不同的JWT_SECRET

### 2. 环境配置问题
- **问题**: 环境变量未正确加载或配置文件路径错误
- **常见场景**:
  - .env文件路径不正确
  - NODE_ENV环境变量设置错误
  - 环境变量被其他配置覆盖

### 3. Token 损坏或过期
- **问题**: 客户端传递的token格式错误或已过期
- **常见场景**:
  - 网络传输过程中token被截断
  - 客户端存储的token已过期
  - token格式不正确（缺少Bearer前缀等）

## 解决方案

### 步骤1: 检查JWT_SECRET配置

1. **检查环境变量文件**:
   ```bash
   grep "JWT_SECRET" .env .env.production
   ```

2. **确保开发和生产环境使用相同的JWT_SECRET**:
   - 开发环境: `.env`
   - 生产环境: `.env.production`

### 步骤2: 验证JWT功能

使用调试工具测试JWT签名和验证：
```bash
node debug-jwt.js
```

### 步骤3: 重启服务

确保服务加载最新的环境配置：
```bash
# 方法1: 分步重启
./stop.sh
./start.sh production

# 方法2: 一键重启
./restart.sh production
```

### 步骤4: 测试API接口

1. **获取新的token**:
   ```bash
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "test@cobean.com", "password": "password123"}'
   ```

2. **使用token访问受保护接口**:
   ```bash
   curl -X GET http://localhost:3001/books \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

## 本次问题解决记录

### 发现的问题
- 开发环境 `.env` 文件中 JWT_SECRET: `cobean_jwt_secret_key_2024_secure_random_string`
- 生产环境 `.env.production` 文件中 JWT_SECRET: `inkybean_jwt_secret_key_2024_secure_random_string`
- **两个环境的JWT_SECRET不一致，导致token验证失败**

### 解决方案
1. ✅ 统一JWT_SECRET配置，将生产环境改为与开发环境一致
2. ✅ 创建JWT调试工具验证功能正常
3. ✅ 建议重启服务以加载新配置

### 验证结果
- JWT生成和验证功能正常
- 本地API测试通过
- 需要在服务器上重启服务以应用新配置

## 预防措施

1. **统一配置管理**:
   - 使用相同的JWT_SECRET在所有环境中
   - 定期检查环境配置文件的一致性

2. **监控和日志**:
   - 监控JWT验证失败的频率
   - 记录详细的错误日志便于排查

3. **测试流程**:
   - 部署前测试JWT功能
   - 定期验证API接口的认证功能

4. **文档维护**:
   - 保持环境配置文档的更新
   - 记录配置变更的历史

## 相关文件

- `middleware/auth.js` - JWT认证中间件
- `routes/auth.js` - 认证路由，生成JWT token
- `debug-jwt.js` - JWT调试工具
- `.env` - 开发环境配置
- `.env.production` - 生产环境配置

## 联系支持

如果问题仍然存在，请提供以下信息：
1. 完整的错误日志
2. 环境配置信息（隐藏敏感数据）
3. 复现步骤
4. 使用的token示例（隐藏敏感部分）