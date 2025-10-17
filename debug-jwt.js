const jwt = require('jsonwebtoken');

// 测试JWT签名验证问题
const testJWT = () => {
  console.log('=== JWT 调试工具 ===\n');
  
  // 从环境变量读取JWT_SECRET
  require('dotenv').config();
  const jwtSecret = process.env.JWT_SECRET;
  
  console.log('当前 JWT_SECRET:', jwtSecret);
  console.log('JWT_SECRET 长度:', jwtSecret ? jwtSecret.length : 'undefined');
  console.log('');
  
  // 测试token生成
  const testPayload = {
    userId: 'test-user-id',
    email: 'test@example.com'
  };
  
  try {
    const token = jwt.sign(testPayload, jwtSecret, { expiresIn: '1h' });
    console.log('生成的测试 token:', token);
    console.log('');
    
    // 测试token验证
    try {
      const decoded = jwt.verify(token, jwtSecret);
      console.log('✅ Token 验证成功!');
      console.log('解码后的数据:', decoded);
    } catch (verifyError) {
      console.log('❌ Token 验证失败:', verifyError.message);
    }
    
  } catch (signError) {
    console.log('❌ Token 生成失败:', signError.message);
  }
  
  console.log('\n=== 测试完成 ===');
};

// 如果直接运行此文件
if (require.main === module) {
  testJWT();
}

module.exports = { testJWT };