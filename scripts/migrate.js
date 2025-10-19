const { supabaseAdmin } = require('../config/database');

async function runMigration() {
  try {
    console.log('🚀 开始执行数据库迁移...');
    
    // 创建 profiles 表
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('📋 profiles表不存在，需要手动创建');
      console.log('请在Supabase Dashboard的SQL Editor中执行以下SQL:');
      console.log(`
-- 创建用户资料表 (profiles)
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
      `);
      process.exit(1);
    } else if (error) {
      console.error('❌ 检查表时发生错误:', error);
      process.exit(1);
    } else {
      console.log('✅ profiles表已存在!');
      console.log('📊 表中数据:', data);
    }
    
  } catch (err) {
    console.error('❌ 迁移过程中发生错误:', err.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };