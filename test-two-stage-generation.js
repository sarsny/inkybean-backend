const axios = require('axios');
const jwt = require('jsonwebtoken');

// 配置
const BASE_URL = 'http://localhost:3000';
const JWT_SECRET = 'cobean_jwt_secret_key_2024_secure_random_string'; // 與.env中的JWT_SECRET保持一致
const TEST_BOOK_ID = '44b16a72-429a-47ab-9fab-7aab94b341c6'; // 測試用的書籍ID

// 生成測試用的JWT token
function generateTestToken() {
  const payload = {
    userId: 'test-user-id',
    email: 'test@example.com'
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// 測試兩階段AI生成流程
async function testTwoStageGeneration() {
  try {
    console.log('🚀 開始測試兩階段AI題目生成流程...\n');
    
    // 生成JWT token
    const token = generateTestToken();
    console.log('✅ JWT token 生成成功');
    
    // 調用新的兩階段生成API
    console.log('📡 調用 POST /books/:bookId/generate-questions...');
    const startTime = Date.now();
    
    const response = await axios.post(
      `${BASE_URL}/books/${TEST_BOOK_ID}/generate-questions`,
      {}, // 空的請求體
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2分鐘超時，因為兩階段調用需要更長時間
      }
    );
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ API調用成功！耗時: ${duration}秒`);
    console.log('📊 響應狀態:', response.status);
    console.log('📋 響應數據:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // 驗證響應結構
    const { result } = response.data;
    if (result) {
      console.log('\n🔍 結果分析:');
      console.log(`📚 書籍: ${result.bookTitle}`);
      console.log(`🎯 使用的主題數量: ${result.themesUsed ? result.themesUsed.length : 0}`);
      console.log(`🎲 角度分配數量: ${result.anglesAssigned ? result.anglesAssigned.length : 0}`);
      console.log(`📝 生成的題目數量: ${result.totalGenerated}`);
      console.log(`📊 新的總題目數: ${result.newQuestionCount}`);
      
      // 顯示生成的主題
      if (result.themesUsed && result.themesUsed.length > 0) {
        console.log('\n🎯 生成的新主題:');
        result.themesUsed.forEach((theme, index) => {
          console.log(`  ${index + 1}. ${theme}`);
        });
      }
      
      // 顯示角度分配
      if (result.anglesAssigned && result.anglesAssigned.length > 0) {
        console.log('\n🎲 隨機角度分配:');
        result.anglesAssigned.forEach((assignment, index) => {
          console.log(`  ${index + 1}. 主題: "${assignment.theme}"`);
          console.log(`     角度: [${assignment.angles_to_use.join(', ')}]`);
        });
      }
      
      // 顯示生成的題目
      if (result.questions && result.questions.length > 0) {
        console.log('\n📝 生成的題目:');
        result.questions.forEach((question, index) => {
          console.log(`  ${index + 1}. ${question.statement}`);
          console.log(`     答案: ${question.isPure ? '正確' : '錯誤'}`);
          console.log(`     解釋: ${question.explanation}`);
          console.log('');
        });
      }
    }
    
    console.log('\n🎉 兩階段AI生成流程測試完成！');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    
    if (error.response) {
      console.error('📊 錯誤狀態:', error.response.status);
      console.error('📋 錯誤數據:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('📡 請求錯誤:', error.request);
    } else {
      console.error('⚠️ 其他錯誤:', error.message);
    }
    
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ 請求超時 - API調用時間過長');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 連接被拒絕 - 請確認服務器是否運行在 http://localhost:3000');
    }
  }
}

// 執行測試
testTwoStageGeneration();