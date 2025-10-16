#!/usr/bin/env node

/**
 * Coze 工作流测试脚本
 * 用于诊断工作流返回 null 的问题
 */

require('dotenv').config();
const { getCozeService } = require('./utils/cozeService');

async function testCozeWorkflow() {
  try {
    console.log('🔧 开始测试 Coze 工作流...');
    console.log('配置信息:');
    console.log('- COZE_API_KEY:', process.env.COZE_API_KEY ? '已配置' : '未配置');
    console.log('- COZE_BASE_URL:', process.env.COZE_BASE_URL);
    console.log('- COZE_WORKFLOW_ID:', process.env.COZE_WORKFLOW_ID);
    console.log('- COZE_APP_ID:', process.env.COZE_APP_ID || '未配置');
    console.log('');

    const cozeService = getCozeService();
    
    // 测试不同的书名
    const testBooks = [
      '三体'
    ];

    for (const bookTitle of testBooks) {
      console.log(`📚 测试书籍: ${bookTitle}`);
      console.log('发送参数:', { title: bookTitle });
      
      try {
        const response = await cozeService.runWorkflow({
          title: bookTitle
        });
        
        console.log('✅ 工作流响应:');
        console.log(JSON.stringify(response, null, 2));
        
        // 尝试解析 data 字段
        if (response.data) {
          try {
            const parsedData = typeof response.data === 'string' 
              ? JSON.parse(response.data) 
              : response.data;
            console.log('📋 解析后的数据:');
            console.log(JSON.stringify(parsedData, null, 2));
          } catch (parseError) {
            console.log('❌ 数据解析失败:', parseError.message);
          }
        }
        
        console.log('---');
        
        // 等待一段时间避免频率限制
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`❌ 测试 ${bookTitle} 失败:`, error.message);
        console.log('---');
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testCozeWorkflow();
}

module.exports = testCozeWorkflow;