require('dotenv').config();
const { supabaseAdmin } = require('./config/database');
const { CozeService } = require('./utils/cozeService');

const cozeService = new CozeService();

async function updateColombiaBooks() {
  console.log('🔍 开始更新作者名称包含"哥伦比亚"的书籍信息...\n');
  
  try {
    // 查询所有包含"哥伦比亚"的书籍
    const { data: books, error: queryError } = await supabaseAdmin
      .from('books')
      .select('*')
      .ilike('author', '%哥伦比亚%');
      
    if (queryError) {
      console.error('❌ 查询失败:', queryError);
      return;
    }
    
    if (books.length === 0) {
      console.log('📚 未找到需要更新的书籍');
      return;
    }
    
    console.log(`📊 找到 ${books.length} 本需要更新的书籍\n`);
    
    let successCount = 0;
    let failureCount = 0;
    const results = [];
    
    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      console.log(`\n📖 正在处理第 ${i + 1}/${books.length} 本书: ${book.title}`);
      console.log(`   当前作者: ${book.author}`);
      
      try {
        // 使用Coze工作流获取最新的书籍信息
        const workflowResponse = await cozeService.runWorkflow({
          title: book.title
        });
        
        if (!workflowResponse || !workflowResponse.data) {
          console.log('⚠️  Coze工作流返回空结果，跳过此书籍');
          failureCount++;
          results.push({
            bookId: book.bookId,
            title: book.title,
            status: 'failed',
            reason: 'Coze工作流返回空结果'
          });
          continue;
        }
        
        // 解析Coze工作流返回的数据
        let bookInfo;
        try {
          // 尝试解析JSON字符串
          const parsedData = JSON.parse(workflowResponse.data);
          
          // 检查是否有output字段
          const outputData = parsedData.output || parsedData;
          
          bookInfo = {
            title: outputData.book_name || '',
            author: Array.isArray(outputData.authors) ? outputData.authors.join(', ') : (outputData.author || outputData.authors || ''),
            description: outputData.summary || '',
            coverImageUrl: outputData.book_image || ''
          };
        } catch (parseError) {
          console.log('⚠️  解析Coze工作流返回数据失败，跳过此书籍');
          console.log('   原始数据:', workflowResponse.data);
          failureCount++;
          results.push({
            bookId: book.bookId,
            title: book.title,
            status: 'failed',
            reason: '解析Coze工作流返回数据失败'
          });
          continue;
        }
        
        // 检查返回的数据是否有效
        if (!bookInfo.title || bookInfo.title.trim() === '') {
          console.log('⚠️  返回的书籍信息无效，跳过此书籍');
          failureCount++;
          results.push({
            bookId: book.bookId,
            title: book.title,
            status: 'failed',
            reason: '返回的书籍信息无效'
          });
          continue;
        }
        
        // 准备更新数据
        const updateData = {
          updatedAt: new Date().toISOString()
        };
        
        // 只更新有变化的字段
        let hasChanges = false;
        
        if (bookInfo.title && bookInfo.title !== book.title) {
          updateData.title = bookInfo.title;
          hasChanges = true;
          console.log(`   📝 书名更新: ${book.title} → ${bookInfo.title}`);
        }
        
        if (bookInfo.author && bookInfo.author !== book.author) {
          updateData.author = bookInfo.author;
          hasChanges = true;
          console.log(`   👤 作者更新: ${book.author} → ${bookInfo.author}`);
        }
        
        if (bookInfo.description && bookInfo.description !== book.description) {
          updateData.description = bookInfo.description;
          hasChanges = true;
          console.log(`   📄 描述已更新`);
        }
        
        if (bookInfo.coverImageUrl && bookInfo.coverImageUrl !== book.coverImageUrl) {
          updateData.coverImageUrl = bookInfo.coverImageUrl;
          hasChanges = true;
          console.log(`   🖼️  封面已更新`);
        }
        
        if (hasChanges) {
          // 更新数据库
          const { error: updateError } = await supabaseAdmin
            .from('books')
            .update(updateData)
            .eq('bookId', book.bookId);
            
          if (updateError) {
            console.error(`❌ 更新失败:`, updateError);
            failureCount++;
            results.push({
              bookId: book.bookId,
              title: book.title,
              status: 'failed',
              reason: `数据库更新失败: ${updateError.message}`
            });
          } else {
            console.log('✅ 更新成功');
            successCount++;
            results.push({
              bookId: book.bookId,
              title: book.title,
              status: 'success',
              changes: updateData
            });
          }
        } else {
          console.log('ℹ️  无需更新，信息已是最新');
          successCount++;
          results.push({
            bookId: book.bookId,
            title: book.title,
            status: 'no_changes',
            reason: '信息已是最新'
          });
        }
        
        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ 处理失败:`, error.message);
        failureCount++;
        results.push({
          bookId: book.bookId,
          title: book.title,
          status: 'failed',
          reason: error.message
        });
      }
    }
    
    // 输出总结
    console.log('\n' + '='.repeat(50));
    console.log('📊 更新完成统计:');
    console.log(`✅ 成功: ${successCount} 本`);
    console.log(`❌ 失败: ${failureCount} 本`);
    console.log(`📚 总计: ${books.length} 本`);
    
    // 保存结果到文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultFile = `update-colombia-books-results-${timestamp}.json`;
    
    const fs = require('fs');
    fs.writeFileSync(resultFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: books.length,
        success: successCount,
        failure: failureCount
      },
      results: results
    }, null, 2));
    
    console.log(`\n📄 详细结果已保存到: ${resultFile}`);
    
  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
  }
}

// 运行脚本
updateColombiaBooks().catch(console.error);