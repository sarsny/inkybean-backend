-- 创建用户资料表 (profiles)
-- 执行时间: 2025-01-25
-- 用途: 存储用户扩展信息，包括用户名、昵称等

-- 创建 profiles 表
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username varchar(50) UNIQUE NOT NULL,
  display_name varchar(100),
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- 确保每个用户只有一个资料记录
  CONSTRAINT unique_user_profile UNIQUE (user_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION handle_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_profiles_updated_at();

-- 启用 RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
-- 用户只能查看自己的资料
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

-- 用户只能插入自己的资料
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的资料
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 用户只能删除自己的资料
CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE USING (auth.uid() = user_id);

-- 添加注释
COMMENT ON TABLE profiles IS '用户资料表，存储用户扩展信息';
COMMENT ON COLUMN profiles.user_id IS '关联的用户ID，引用 auth.users 表';
COMMENT ON COLUMN profiles.username IS '用户名，全局唯一，用于登录';
COMMENT ON COLUMN profiles.display_name IS '显示名称，用于界面展示';
COMMENT ON COLUMN profiles.avatar_url IS '头像URL';
COMMENT ON COLUMN profiles.bio IS '用户简介';