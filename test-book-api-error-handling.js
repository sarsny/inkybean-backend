const axios = require('axios');

// 测试添加书籍接口的错误处理
async function testBookApiErrorHandling() {
  const baseUrl = 'http://localhost:3000/api/books';
  
  // 这里需要一个有效的JWT token，你可以从登录接口获取
  // 或者使用现有的token进行测试
  const token = 'your_jwt_token_here'; // 请替换为实际的token
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log('🧪 开始测试书籍API错误处理...\n');

  // 测试1: 空书名
  console.log('📝 测试1: 空书名');
  try {
    const response = await axios.post(baseUrl, { title: '' }, { headers });
    console.log('❌ 应该返回错误，但成功了:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('✅ 正确返回错误:', error.response.status, error.response.data);
    } else {
      console.log('❌ 网络错误:', error.message);
    }
  }

  // 测试2: 无效书名（只有空格）
  console.log('\n📝 测试2: 无效书名（只有空格）');
  try {
    const response = await axios.post(baseUrl, { title: '   ' }, { headers });
    console.log('❌ 应该返回错误，但成功了:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('✅ 正确返回错误:', error.response.status, error.response.data);
    } else {
      console.log('❌ 网络错误:', error.message);
    }
  }

  // 测试3: 不存在的书籍（模拟Coze返回空结果）
  console.log('\n📝 测试3: 不存在的书籍');
  try {
    const response = await axios.post(baseUrl, { 
      title: '这是一本完全不存在的书籍名称12345' 
    }, { headers });
    console.log('📖 书籍添加结果:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('✅ 正确返回错误:', error.response.status, error.response.data);
    } else {
      console.log('❌ 网络错误:', error.message);
    }
  }

  // 测试4: 正常书籍（应该成功）
  console.log('\n📝 测试4: 正常书籍');
  try {
    const response = await axios.post(baseUrl, { 
      title: '红楼梦' 
    }, { headers });
    console.log('✅ 书籍添加成功:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('📊 返回状态:', error.response.status, error.response.data);
    } else {
      console.log('❌ 网络错误:', error.message);
    }
  }

  // 测试5: 重复添加同一本书
  console.log('\n📝 测试5: 重复添加同一本书');
  try {
    const response = await axios.post(baseUrl, { 
      title: '红楼梦' 
    }, { headers });
    console.log('📖 重复添加结果:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('📊 返回状态:', error.response.status, error.response.data);
    } else {
      console.log('❌ 网络错误:', error.message);
    }
  }

  console.log('\n🏁 测试完成！');
}

// 运行测试
testBookApiErrorHandling().catch(console.error);