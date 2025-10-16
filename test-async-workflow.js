require('dotenv').config();
const axios = require('axios');

async function testAsyncWorkflow() {
  const client = axios.create({
    baseURL: process.env.COZE_BASE_URL,
    headers: {
      'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  const workflowId = process.env.COZE_WORKFLOW_ID;
  
  console.log('测试异步工作流执行:');
  try {
    // 启动异步工作流
    const response = await client.post('/v1/workflow/run', {
      workflow_id: workflowId,
      parameters: {
        '书名': '原则'
      },
      is_async: true
    });
    
    console.log('异步工作流启动响应:', JSON.stringify(response.data, null, 2));
    
    if (response.data.execute_id) {
      const executeId = response.data.execute_id;
      console.log('Execute ID:', executeId);
      
      // 轮询执行状态
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
        
        try {
          const historyResponse = await client.get(`/v1/workflow/runs/histories?workflow_id=${workflowId}&execute_id=${executeId}`);
          console.log(`第${attempts}次查询状态:`, JSON.stringify(historyResponse.data, null, 2));
          
          if (historyResponse.data.execute_status === 'SUCCESS') {
            console.log('工作流执行成功!');
            break;
          } else if (historyResponse.data.execute_status === 'FAIL') {
            console.log('工作流执行失败:', historyResponse.data.error_message);
            break;
          }
        } catch (statusError) {
          console.log(`第${attempts}次查询状态失败:`, statusError.response?.data || statusError.message);
        }
      }
    }
    
  } catch (error) {
    console.log('失败:', error.response?.data || error.message);
  }
}

testAsyncWorkflow();