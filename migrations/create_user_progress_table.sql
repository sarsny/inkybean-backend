-- 创建 user_progress 表及其 RLS 策略
-- 请在Supabase Dashboard的SQL Editor中执行此SQL

-- 创建 user_progress 表
CREATE TABLE IF NOT EXISTS user_progress (
  progressId uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  userId uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bookId uuid NOT NULL REFERENCES books(bookId) ON DELETE CASCADE,
  lastAttemptedAt timestamptz,
  highestAccuracy float8 NOT NULL DEFAULT 0,
  totalAttempts integer NOT NULL DEFAULT 0,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  
  -- 确保每个用户对每本书只有一个进度记录
  CONSTRAINT unique_user_book_progress UNIQUE (userId, bookId)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(userId);
CREATE INDEX IF NOT EXISTS idx_user_progress_book_id ON user_progress(bookId);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_book ON user_progress(userId, bookId);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION handle_user_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updatedAt = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_progress_updated_at();

-- 启用 RLS (Row Level Security)
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON user_progress;

-- 创建 RLS 策略
-- 用户只能查看自己的进度记录
CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT USING (auth.uid() = userId);

-- 用户只能插入自己的进度记录
CREATE POLICY "Users can insert own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = userId);

-- 用户只能更新自己的进度记录
CREATE POLICY "Users can update own progress" ON user_progress
  FOR UPDATE USING (auth.uid() = userId);

-- 用户只能删除自己的进度记录
CREATE POLICY "Users can delete own progress" ON user_progress
  FOR DELETE USING (auth.uid() = userId);

-- 添加注释
COMMENT ON TABLE user_progress IS '用户学习进度表，存储用户对每本书的学习进度';
COMMENT ON COLUMN user_progress.progressId IS '进度记录唯一标识';
COMMENT ON COLUMN user_progress.userId IS '用户ID，关联 auth.users 表';
COMMENT ON COLUMN user_progress.bookId IS '书籍ID，关联 books 表';
COMMENT ON COLUMN user_progress.lastAttemptedAt IS '最后学习时间';
COMMENT ON COLUMN user_progress.highestAccuracy IS '最高正确率 (0-1)';
COMMENT ON COLUMN user_progress.totalAttempts IS '总尝试次数';
COMMENT ON COLUMN user_progress.createdAt IS '创建时间';
COMMENT ON COLUMN user_progress.updatedAt IS '更新时间';

-- 验证表创建和策略设置
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'user_progress';

-- 检查RLS是否启用
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'user_progress';