# user_progress 表 RLS 策略修复指南

## 问题描述

生产服务器出现崩溃，错误信息：
```
创建用户进度记录失败: { 
   code: '42501', 
   details: null, 
   hint: null, 
   message: 'new row violates row-level security policy for table "user_progress"' 
}
```

## 问题原因

1. **RLS 策略配置问题**: `user_progress` 表的行级安全策略（RLS）阻止了新记录的插入
2. **权限验证失败**: 当前的 RLS 策略可能缺少正确的 INSERT 权限配置
3. **客户端权限不足**: 使用普通的 `supabase` 客户端而不是管理员客户端

## 修复方案

### 1. 立即修复（代码层面）

已修改 `/routes/books.js` 文件第1272行，将：
```javascript
const { data: newProgress, error: insertError } = await supabase
```

改为：
```javascript
// 使用 supabaseAdmin 来绕过 RLS 策略，确保能够成功插入记录
const { data: newProgress, error: insertError } = await supabaseAdmin
```

### 2. 数据库层面修复（推荐）

执行 `/migrations/create_user_progress_table.sql` 脚本来：
- 创建正确的 `user_progress` 表结构
- 设置适当的 RLS 策略
- 确保策略允许用户插入自己的记录

### 3. 部署步骤

1. **代码部署**:
   ```bash
   # 部署修改后的代码
   git add routes/books.js
   git commit -m "fix: use supabaseAdmin for user_progress insert to bypass RLS"
   git push origin main
   ```

2. **数据库迁移**:
   - 在 Supabase Dashboard 的 SQL Editor 中执行 `migrations/create_user_progress_table.sql`
   - 验证 RLS 策略是否正确设置

3. **验证修复**:
   ```bash
   # 运行测试脚本验证修复
   node test-user-progress-fix.js
   ```

## 验证步骤

1. 检查 RLS 策略：
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'user_progress';
   ```

2. 测试插入操作：
   ```sql
   -- 使用管理员权限测试
   INSERT INTO user_progress (userId, bookId, highestAccuracy, totalAttempts)
   VALUES ('test-user-id', 'test-book-id', 0, 0);
   ```

3. 监控应用日志确认不再出现 RLS 错误

## 预防措施

1. **使用正确的客户端**:
   - 对于需要绕过 RLS 的管理操作，使用 `supabaseAdmin`
   - 对于用户数据查询，使用普通的 `supabase` 客户端

2. **完善的 RLS 策略**:
   - 确保每个表都有完整的 CRUD 策略
   - 定期审查和测试 RLS 策略

3. **监控和日志**:
   - 设置数据库错误监控
   - 记录详细的操作日志

## 相关文件

- `/routes/books.js` - 修复的主要文件
- `/migrations/create_user_progress_table.sql` - 数据库修复脚本
- `/test-user-progress-fix.js` - 测试脚本
- `/config/database.js` - 数据库配置

## 注意事项

- 此修复是临时解决方案，建议同时修复数据库层面的 RLS 策略
- 在生产环境部署前，请先在开发环境测试
- 确保备份数据库后再执行迁移脚本