#!/usr/bin/env node

/**
 * 批量更新书籍封面图片脚本
 * 使用 Coze 接口获取书籍信息并更新数据库中的 coverImageUrl 字段
 */

require('dotenv').config();
const { supabaseAdmin } = require('./config/database');
const { getCozeService } = require('./utils/cozeService');

class BookCoverUpdater {
  constructor() {
    this.cozeService = getCozeService();
    this.updatedCount = 0;
    this.failedCount = 0;
    this.skippedCount = 0;
  }

  /**
   * 获取需要更新封面的书籍
   * @param {boolean} forceUpdate - 是否强制更新所有书籍（包括已有封面的）
   * @returns {Promise<Array>} 书籍列表
   */
  async getBooksToUpdate(forceUpdate = false) {
    try {
      let query = supabaseAdmin
        .from('books')
        .select('bookId, title, author, coverImageUrl, createdAt')
        .order('createdAt', { ascending: false });

      if (!forceUpdate) {
        // 只更新没有封面或封面为空的书籍
        query = query.or('coverImageUrl.is.null,coverImageUrl.eq.');
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`获取书籍列表失败: ${error.message}`);
      }

      console.log(`找到 ${data.length} 本需要更新封面的书籍`);
      return data;

    } catch (error) {
      console.error('获取书籍列表失败:', error);
      throw error;
    }
  }

  /**
   * 使用 Coze 接口获取书籍信息
   * @param {string} title - 书名
   * @returns {Promise<Object>} 书籍信息
   */
  async getBookInfoFromCoze(title) {
    try {
      console.log(`正在获取《${title}》的信息...`);

      // 调用 Coze 工作流
      const workflowResponse = await this.cozeService.runWorkflow({
        title: title
      });

      console.log(`Coze 响应 (${title}):`, JSON.stringify(workflowResponse, null, 2));

      // 解析工作流返回的结果
      if (!workflowResponse || workflowResponse.code !== 0) {
        throw new Error(`Coze 工作流执行失败: ${workflowResponse?.msg || '未知错误'}`);
      }

      // 尝试解析 data 字段
      let output;
      try {
        if (typeof workflowResponse.data === 'string') {
          output = JSON.parse(workflowResponse.data);
        } else {
          output = workflowResponse.data;
        }
      } catch (parseError) {
        console.error('解析 Coze 响应数据失败:', parseError);
        throw new Error('Coze 工作流返回数据格式错误');
      }

      // 检查 output 是否存在且有效
      if (!output || output === null) {
        console.log(`⚠️  《${title}》没有找到封面图片，跳过更新`);
        return null;
      }

      // 提取封面图片 URL
      const coverImageUrl = output.book_image || output.cover_image || '';
      const description = output.summary || output.description || '';
      
      // 处理作者信息
      let author = '';
      if (output.authors && Array.isArray(output.authors)) {
        author = output.authors.join(', ');
      } else if (output.author) {
        author = output.author;
      }

      // 如果没有封面图片，返回 null
      if (!coverImageUrl) {
        console.log(`⚠️  《${title}》没有找到封面图片，跳过更新`);
        return null;
      }

      return {
        coverImageUrl,
        description,
        author: author || null
      };

    } catch (error) {
      console.error(`获取《${title}》信息失败:`, error.message);
      throw error;
    }
  }

  /**
   * 更新单本书籍的封面信息
   * @param {Object} book - 书籍对象
   * @returns {Promise<boolean>} 是否更新成功
   */
  async updateBookCover(book) {
    try {
      const { bookId, title, author, coverImageUrl } = book;

      // 获取 Coze 返回的书籍信息
      const cozeInfo = await this.getBookInfoFromCoze(title);

      // 如果没有获取到有效信息，跳过更新
      if (!cozeInfo) {
        this.skippedCount++;
        return false;
      }

      // 如果 Coze 没有返回封面图片，跳过更新
      if (!cozeInfo.coverImageUrl) {
        console.log(`⚠️  《${title}》没有找到封面图片，跳过更新`);
        this.skippedCount++;
        return false;
      }

      // 准备更新数据
      const updateData = {
        coverImageUrl: cozeInfo.coverImageUrl,
        updatedAt: new Date().toISOString()
      };

      // 如果 Coze 返回了更完整的描述，也一并更新
      if (cozeInfo.description) {
        updateData.description = cozeInfo.description;
      }

      // 如果原书籍没有作者信息，且 Coze 返回了作者信息，也一并更新
      if (!author && cozeInfo.author) {
        updateData.author = cozeInfo.author;
      }

      // 更新数据库
      const { error } = await supabaseAdmin
        .from('books')
        .update(updateData)
        .eq('bookId', bookId);

      if (error) {
        throw new Error(`数据库更新失败: ${error.message}`);
      }

      console.log(`✅ 《${title}》封面更新成功: ${cozeInfo.coverImageUrl}`);
      this.updatedCount++;
      return true;

    } catch (error) {
      console.error(`❌ 《${book.title}》更新失败:`, error.message);
      this.failedCount++;
      return false;
    }
  }

  /**
   * 批量更新书籍封面
   * @param {boolean} forceUpdate - 是否强制更新所有书籍
   * @param {number} batchSize - 批处理大小
   * @param {number} delay - 每次请求间隔（毫秒）
   */
  async updateAllBookCovers(forceUpdate = false, batchSize = 5, delay = 2000) {
    try {
      console.log('🚀 开始批量更新书籍封面...');
      console.log(`配置: 强制更新=${forceUpdate}, 批处理大小=${batchSize}, 请求间隔=${delay}ms`);

      // 获取需要更新的书籍列表
      const books = await this.getBooksToUpdate(forceUpdate);

      if (books.length === 0) {
        console.log('✨ 没有需要更新的书籍');
        return;
      }

      console.log(`📚 开始处理 ${books.length} 本书籍...`);

      // 分批处理
      for (let i = 0; i < books.length; i += batchSize) {
        const batch = books.slice(i, i + batchSize);
        console.log(`\n📦 处理第 ${Math.floor(i / batchSize) + 1} 批 (${i + 1}-${Math.min(i + batchSize, books.length)}):`);

        // 并发处理当前批次
        const promises = batch.map(book => this.updateBookCover(book));
        await Promise.allSettled(promises);

        // 如果不是最后一批，等待一段时间再处理下一批
        if (i + batchSize < books.length) {
          console.log(`⏳ 等待 ${delay}ms 后处理下一批...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // 输出统计结果
      console.log('\n📊 更新完成统计:');
      console.log(`✅ 成功更新: ${this.updatedCount} 本`);
      console.log(`⚠️  跳过更新: ${this.skippedCount} 本`);
      console.log(`❌ 更新失败: ${this.failedCount} 本`);
      console.log(`📚 总计处理: ${books.length} 本`);

    } catch (error) {
      console.error('❌ 批量更新过程中发生错误:', error);
      throw error;
    }
  }
}

// 主函数
async function main() {
  const updater = new BookCoverUpdater();

  // 解析命令行参数
  const args = process.argv.slice(2);
  const forceUpdate = args.includes('--force') || args.includes('-f');
  const batchSize = parseInt(args.find(arg => arg.startsWith('--batch='))?.split('=')[1]) || 3;
  const delay = parseInt(args.find(arg => arg.startsWith('--delay='))?.split('=')[1]) || 3000;

  try {
    await updater.updateAllBookCovers(forceUpdate, batchSize, delay);
    console.log('\n🎉 批量更新完成！');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 批量更新失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  console.log('📖 书籍封面批量更新工具');
  console.log('用法: node update-book-covers.js [选项]');
  console.log('选项:');
  console.log('  --force, -f          强制更新所有书籍（包括已有封面的）');
  console.log('  --batch=N            设置批处理大小（默认: 3）');
  console.log('  --delay=N            设置请求间隔毫秒数（默认: 3000）');
  console.log('');

  main();
}

module.exports = BookCoverUpdater;