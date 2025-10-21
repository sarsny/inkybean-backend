require('dotenv').config();
const { getCozeService } = require('./utils/cozeService');

async function testCozeErrorHandling() {
  console.log('🧪 开始测试Coze工作流错误处理...\n');

  const cozeService = getCozeService();

  // 测试1: 正常书籍
  console.log('📝 测试1: 正常书籍 - 红楼梦');
  try {
    const result = await cozeService.runWorkflow({ title: '红楼梦' });
    console.log('✅ 成功获取书籍信息:');
    console.log('- 响应码:', result.code);
    console.log('- 数据:', JSON.stringify(result.data, null, 2));
    
    // 解析数据
    let output;
    if (typeof result.data === 'string') {
      try {
        const parsedData = JSON.parse(result.data);
        output = parsedData.output || parsedData;
      } catch (e) {
        output = result.data;
      }
    } else {
      output = result.data;
      if (output && output.output) {
        output = output.output;
      }
    }
    
    console.log('- 解析后的输出:', JSON.stringify(output, null, 2));
    
    if (!output) {
      console.log('⚠️  输出为空，这会触发BOOK_INFO_NOT_FOUND错误');
    } else if (!output.book_name && !output.title) {
      console.log('⚠️  缺少书名，这会触发INCOMPLETE_BOOK_INFO错误');
    } else {
      console.log('✅ 书籍信息完整');
    }
  } catch (error) {
    console.log('❌ Coze调用失败:', error.message);
  }

  // 测试2: 不存在的书籍
  console.log('\n📝 测试2: 不存在的书籍');
  try {
    const result = await cozeService.runWorkflow({ 
      title: '这是一本完全不存在的书籍名称12345abcdef' 
    });
    console.log('📊 响应结果:');
    console.log('- 响应码:', result.code);
    console.log('- 数据:', JSON.stringify(result.data, null, 2));
    
    // 解析数据
    let output;
    if (typeof result.data === 'string') {
      try {
        const parsedData = JSON.parse(result.data);
        output = parsedData.output || parsedData;
      } catch (e) {
        output = result.data;
      }
    } else {
      output = result.data;
      if (output && output.output) {
        output = output.output;
      }
    }
    
    console.log('- 解析后的输出:', JSON.stringify(output, null, 2));
    
    if (!output) {
      console.log('✅ 输出为空，会正确触发BOOK_INFO_NOT_FOUND错误');
    }
  } catch (error) {
    console.log('❌ Coze调用失败:', error.message);
    if (error.message.includes('400')) {
      console.log('✅ 会触发INVALID_REQUEST_PARAMS错误');
    }
  }

  // 测试3: 空字符串
  console.log('\n📝 测试3: 空字符串');
  try {
    const result = await cozeService.runWorkflow({ title: '' });
    console.log('📊 响应结果:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ Coze调用失败:', error.message);
    if (error.message.includes('400')) {
      console.log('✅ 会触发INVALID_REQUEST_PARAMS错误');
    }
  }

  console.log('\n🏁 测试完成！');
}

// 运行测试
testCozeErrorHandling().catch(console.error);