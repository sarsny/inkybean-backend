const { supabaseAdmin } = require('./config/database');
const { getCozeService } = require('./utils/cozeService');
const fs = require('fs');

/**
 * 批量更新缺少封面的书籍信息脚本
 * 使用Coze工作流获取完整的书籍元数据，包括封面图片、作者、描述等
 */

// 延迟函数，避免API调用过于频繁
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 更新单本书籍的信息
 * @param {Object} book - 书籍对象
 * @returns {Promise<Object>} 更新结果
 */
async function updateBookMetadata(book) {
  const cozeService = getCozeService();
  
  try {
    console.log(`正在更新书籍: ${book.title} (ID: ${book.bookId})`);
    
    // 调用 Coze 工作流获取完整书籍信息
    const workflowResponse = await cozeService.runWorkflow({
      title: book.title
    });

    console.log(`Coze 工作流响应 (${book.title}):`, JSON.stringify(workflowResponse, null, 2));

    // 解析工作流返回的结果
    if (!workflowResponse || workflowResponse.code !== 0) {
      throw new Error(`Coze 工作流执行失败: ${workflowResponse?.msg || '未知错误'}`);
    }

    // 尝试解析 data 字段
    let output;
    try {
      if (typeof workflowResponse.data === 'string') {
        const parsedData = JSON.parse(workflowResponse.data);
        output = parsedData.output || parsedData;
      } else {
        output = workflowResponse.data;
        if (output && output.output) {
          output = output.output;
        }
      }
    } catch (parseError) {
      console.error(`解析 Coze 响应数据失败 (${book.title}):`, parseError);
      throw new Error('Coze 工作流返回数据格式错误');
    }

    // 检查是否获取到有效的输出
    if (!output) {
      console.log(`跳过更新 ${book.title}: 未获取到有效的书籍信息`);
      return { success: false, reason: '未获取到有效的书籍信息' };
    }

    console.log(`解析后的输出 (${book.title}):`, JSON.stringify(output, null, 2));

    // 检查是否有封面图片 - 适配新的响应格式
    const coverImageUrl = output.cover_image || output.coverImage || output.image_url || output.imageUrl || output.cover_url;
    if (!coverImageUrl) {
      console.log(`跳过更新 ${book.title}: 未获取到封面图片`);
      return { success: false, reason: '未获取到封面图片' };
    }

    // 处理作者信息
    let authorName = '';
    if (output.authors && Array.isArray(output.authors)) {
      authorName = output.authors.join(', ');
    } else if (output.author) {
      authorName = output.author;
    } else {
      // 如果没有直接的作者信息，保持原有作者或设置为未知作者
      authorName = book.author || '未知作者';
    }

    // 根据实际响应结构提取书名
    let bookName = output.book_name || output.title || book.title;

    // 构建更新的书籍信息
    const updatedBookInfo = {
      title: bookName,
      author: authorName,
      description: output.summary || output.description || book.description || '',
      coverImageUrl: coverImageUrl
    };

    // 更新数据库中的书籍信息
      // 更新数据库中的书籍信息
      const { data: updatedBook, error: updateError } = await supabaseAdmin
        .from('books')
        .update({
          title: updatedBookInfo.title,
          author: updatedBookInfo.author,
          description: updatedBookInfo.description,
          coverImageUrl: updatedBookInfo.coverImageUrl,
          updatedAt: new Date().toISOString()
        })
        .eq('bookId', book.bookId)
        .select()
        .single();

      if (updateError) {
        console.error(`更新书籍失败 (${book.title}):`, updateError);
        return {
          success: false,
          bookId: book.bookId,
          title: book.title,
          error: `数据库更新失败: ${updateError.message}`
        };
      }

    console.log(`✅ 成功更新书籍: ${book.title}`);
    return {
      success: true,
      bookId: book.bookId,
      title: book.title,
      originalInfo: {
        author: book.author,
        description: book.description,
        coverImageUrl: book.coverImageUrl
      },
      updatedInfo: updatedBookInfo,
      updatedBook: updatedBook
    };

  } catch (error) {
    console.error(`更新书籍失败 (${book.title}):`, error);
    return {
      success: false,
      bookId: book.bookId,
      title: book.title,
      error: error.message,
      reason: error.message
    };
  }
}

/**
 * 主函数：批量更新所有缺少封面的书籍
 */
async function main() {
  console.log('开始批量更新缺少封面的书籍信息...');
  
  try {
    // 查询所有缺少封面的书籍
    const { data: booksWithoutCover, error: queryError } = await supabaseAdmin
      .from('books')
      .select('*')
      .or('coverImageUrl.is.null,coverImageUrl.eq.,coverImageUrl.like.%placeholder%')
      .order('createdAt', { ascending: true });

    if (queryError) {
      console.error('查询缺少封面的书籍失败:', queryError);
      return;
    }

    console.log(`找到 ${booksWithoutCover.length} 本缺少封面的书籍`);

    if (booksWithoutCover.length === 0) {
      console.log('没有需要更新的书籍');
      return;
    }

    // 统计信息
    const results = {
      total: booksWithoutCover.length,
      success: 0,
      failed: 0,
      details: []
    };

    // 逐个更新书籍信息
    for (let i = 0; i < booksWithoutCover.length; i++) {
      const book = booksWithoutCover[i];
      
      console.log(`\n进度: ${i + 1}/${booksWithoutCover.length}`);
      
      const result = await updateBookMetadata(book);
      results.details.push(result);
      
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
      }

      // 每次请求后延迟2秒，避免API限制
      if (i < booksWithoutCover.length - 1) {
        console.log('等待2秒...');
        await delay(2000);
      }
    }

    // 输出最终统计结果
    console.log('\n=== 批量更新完成 ===');
    console.log(`总计: ${results.total} 本书籍`);
    console.log(`成功: ${results.success} 本`);
    console.log(`失败: ${results.failed} 本`);

    // 保存详细结果到文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultFile = `update-book-metadata-results-${timestamp}.json`;
    
    fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
    console.log(`详细结果已保存到: ${resultFile}`);

    // 输出失败的书籍列表
    const failedBooks = results.details.filter(r => !r.success);
    if (failedBooks.length > 0) {
      console.log('\n失败的书籍:');
      failedBooks.forEach(book => {
        console.log(`- ${book.title} (ID: ${book.bookId}): ${book.error}`);
      });
    }

  } catch (error) {
    console.error('批量更新过程中发生错误:', error);
  }
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  updateBookMetadata,
  main
};