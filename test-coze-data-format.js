require('dotenv').config();
const { CozeService } = require('./utils/cozeService');

async function testCozeResponse() {
  const cozeService = new CozeService();
  
  try {
    const response = await cozeService.runWorkflow({
      title: '支付战争'
    });
    
    console.log('原始响应:', JSON.stringify(response, null, 2));
    
    if (response && response.data) {
      console.log('\n解析前的data:', response.data);
      
      try {
        const parsedData = JSON.parse(response.data);
        console.log('\n解析后的数据:', JSON.stringify(parsedData, null, 2));
        
        const bookInfo = {
          title: parsedData.book_name || '',
          author: Array.isArray(parsedData.authors) ? parsedData.authors.join(', ') : (parsedData.authors || ''),
          description: parsedData.summary || '',
          coverImageUrl: parsedData.book_image || ''
        };
        
        console.log('\n转换后的bookInfo:', JSON.stringify(bookInfo, null, 2));
        console.log('\nbookInfo.title是否为空:', !bookInfo.title || bookInfo.title.trim() === '');
      } catch (parseError) {
        console.error('解析失败:', parseError);
      }
    }
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testCozeResponse();