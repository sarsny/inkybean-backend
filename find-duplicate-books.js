require('dotenv').config();
const { supabaseAdmin } = require('./config/database');

async function findDuplicateBooks() {
  console.log('🔍 查询数据库中所有重复书名的记录...\n');
  
  try {
    // 查询所有书籍
    const { data: allBooks, error: allBooksError } = await supabaseAdmin
      .from('books')
      .select('*')
      .order('title', { ascending: true });
      
    if (allBooksError) {
      console.error('❌ 查询所有书籍失败:', allBooksError);
      return;
    }
    
    // 在JavaScript中找出重复的书名
    const titleCounts = {};
    const duplicateGroups = {};
    
    allBooks.forEach(book => {
      const title = book.title;
      if (!titleCounts[title]) {
        titleCounts[title] = 0;
        duplicateGroups[title] = [];
      }
      titleCounts[title]++;
      duplicateGroups[title].push(book);
    });
    
    // 过滤出重复的书名
    const duplicateTitles = Object.keys(titleCounts).filter(title => titleCounts[title] > 1);
    
    if (duplicateTitles.length === 0) {
      console.log('📚 未找到重复的书名');
      return;
    }
    
    console.log(`📊 找到 ${duplicateTitles.length} 个重复的书名:\n`);
    
    const results = [];
    
    duplicateTitles.forEach((title, i) => {
      const books = duplicateGroups[title];
      console.log(`${i + 1}. 书名: ${title} (重复 ${books.length} 次)`);
      
      const duplicateInfo = {
        title: title,
        count: books.length,
        books: []
      };
      
      books.forEach((book, index) => {
        console.log(`   ${String.fromCharCode(97 + index)}. ID: ${book.bookId}`);
        console.log(`      作者: ${book.author}`);
        console.log(`      描述: ${book.description ? book.description.substring(0, 100) + '...' : '无'}`);
        console.log(`      封面: ${book.coverImageUrl || '无'}`);
        console.log(`      创建时间: ${book.createdAt}`);
        console.log(`      更新时间: ${book.updatedAt}`);
        
        duplicateInfo.books.push({
          bookId: book.bookId,
          author: book.author,
          description: book.description,
          coverImageUrl: book.coverImageUrl,
          createdAt: book.createdAt,
          updatedAt: book.updatedAt
        });
      });
      
      results.push(duplicateInfo);
      console.log('');
    });
    
    const totalDuplicateRecords = duplicateTitles.reduce((sum, title) => sum + titleCounts[title], 0);
    console.log(`\n📈 总结: 共发现 ${duplicateTitles.length} 个重复书名，涉及 ${totalDuplicateRecords} 条记录`);
    
    // 保存结果到文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultFile = `duplicate-books-analysis-${timestamp}.json`;
    
    const fs = require('fs');
    fs.writeFileSync(resultFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalBooks: allBooks.length,
        duplicateTitles: duplicateTitles.length,
        duplicateRecords: totalDuplicateRecords
      },
      duplicates: results
    }, null, 2));
    
    console.log(`\n📄 详细分析结果已保存到: ${resultFile}`);
    
    // 提供清理建议
    console.log('\n💡 清理建议:');
    results.forEach((duplicate, index) => {
      console.log(`${index + 1}. "${duplicate.title}" - 建议保留最新的记录，删除其他 ${duplicate.count - 1} 条重复记录`);
    });
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  }
}

findDuplicateBooks().catch(console.error);