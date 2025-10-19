#!/usr/bin/env node

/**
 * 题目生成脚本
 * 
 * 支持两种运行模式：
 * 1. 模式一 (theme)：基于现有主题生成题目
 * 2. 模式二 (full)：生成新主题并创建题目
 * 
 * 使用方法:
 * node generate-questions.js --mode theme --count 10 --all-books
 * node generate-questions.js --mode full --book-id "book-123"
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 环境变量配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_USERNAME = process.env.API_USERNAME || 'testuser5@example.com';
const API_PASSWORD = process.env.API_PASSWORD || 'password123';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的环境变量: SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * 解析命令行参数
 */
function parseArguments(args) {
  const config = {
    mode: 'theme',      // 运行模式: 'theme' (基于现有主题) 或 'full' (生成新主题)
    count: 5,           // 默认每本书生成5个题目 (仅在theme模式下使用)
    bookId: null,       // 特定书籍ID
    allBooks: false,    // 是否处理所有书籍
    help: false,        // 显示帮助
    dryRun: false,      // 干运行模式
    verbose: false,     // 详细输出
    maxRetries: 3,      // 最大重试次数
    delay: 1000,        // 请求间隔(毫秒)
    logFile: null       // 日志文件路径
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--mode':
      case '-m':
        if (nextArg && ['theme', 'full'].includes(nextArg)) {
          config.mode = nextArg;
          i++;
        }
        break;
        
      case '--count':
      case '-c':
        if (nextArg && !isNaN(nextArg)) {
          config.count = parseInt(nextArg);
          i++;
        }
        break;
      
      case '--book-id':
      case '-b':
        if (nextArg) {
          config.bookId = nextArg;
          i++;
        }
        break;
      
      case '--all-books':
      case '-a':
        config.allBooks = true;
        break;
      
      case '--dry-run':
      case '-d':
        config.dryRun = true;
        break;
      
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      
      case '--help':
      case '-h':
        config.help = true;
        break;
      
      case '--max-retries':
        if (nextArg && !isNaN(nextArg)) {
          config.maxRetries = parseInt(nextArg);
          i++;
        }
        break;
      
      case '--delay':
        if (nextArg && !isNaN(nextArg)) {
          config.delay = parseInt(nextArg);
          i++;
        }
        break;
      
      case '--log-file':
        if (nextArg) {
          config.logFile = nextArg;
          i++;
        }
        break;
    }
  }

  return config;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
📚 题目生成脚本 - 使用说明

用法:
  node generate-questions.js [选项]

运行模式:
  -m, --mode <模式>         运行模式 (默认: theme)
                           theme: 基于现有主题生成题目
                           full:  生成新主题并创建题目

选项:
  -c, --count <数量>        每本书生成的题目数量 (默认: 5, 仅在theme模式下使用)
  -b, --book-id <ID>        指定书籍ID (与--all-books互斥)
  -a, --all-books           处理所有已发布的书籍
  -d, --dry-run             干运行模式，不实际生成题目
  -v, --verbose             详细输出模式
  -h, --help                显示此帮助信息
  --max-retries <次数>      最大重试次数 (默认: 3)
  --delay <毫秒>            请求间隔时间 (默认: 1000)
  --log-file <路径>         日志文件路径

示例:
  # 模式一：基于现有主题生成题目
  node generate-questions.js --mode theme --count 10 --all-books
  node generate-questions.js --mode theme --count 5 --book-id "book-123"

  # 模式二：生成新主题和题目
  node generate-questions.js --mode full --all-books
  node generate-questions.js --mode full --book-id "book-123"

  # 干运行模式，查看将要处理的书籍
  node generate-questions.js --mode theme --all-books --dry-run --verbose

  # 生成题目并保存日志
  node generate-questions.js --mode full --all-books --log-file "./generation.log"

环境变量:
  SUPABASE_URL              Supabase项目URL
  SUPABASE_SERVICE_ROLE_KEY Supabase服务密钥
  API_BASE_URL              API服务地址 (默认: http://localhost:3001)
  API_USERNAME              API用户名 (默认: testuser5@example.com)
  API_PASSWORD              API密码 (默认: password123)

模式说明:
  theme模式: 使用现有主题生成题目，需要书籍已有主题数据
  full模式:  AI生成新主题并创建题目，适用于扩展书籍内容
`);
}

/**
 * 日志记录器
 */
class Logger {
  constructor(logFile = null, verbose = false) {
    this.logFile = logFile;
    this.verbose = verbose;
    this.logStream = null;
    
    if (this.logFile) {
      this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;
    
    console.log(message);
    
    if (this.logStream) {
      this.logStream.write(logMessage + '\n');
    }
  }

  info(message) {
    this.log(message, 'INFO');
  }

  error(message) {
    this.log(message, 'ERROR');
  }

  warn(message) {
    this.log(message, 'WARN');
  }

  success(message) {
    this.log(message, 'SUCCESS');
  }
}

/**
 * API客户端
 */
class APIClient {
  constructor(logger) {
    this.baseUrl = API_BASE_URL;
    this.username = API_USERNAME;
    this.password = API_PASSWORD;
    this.token = null;
    this.logger = logger;
  }

  async authenticate() {
    try {
      const response = await axios.post(`${this.baseUrl}/auth/login`, {
        email: this.username,
        password: this.password
      });

      if (response.data && response.data.token) {
        this.token = response.data.token;
        return true;
      } else {
        throw new Error('登录响应中没有token');
      }
    } catch (error) {
      this.logger.error(`API认证失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 基于现有主题生成题目 (模式一)
   */
  async generateQuestionsFromThemes(bookId, count, retries = 0) {
    if (!this.token) {
      throw new Error('未认证，请先调用authenticate()');
    }

    try {
      this.logger.info(`正在为书籍 ${bookId} 生成 ${count} 个主题的题目...`);
      
      const response = await axios.post(
        `${this.baseUrl}/books/${bookId}/generate-questions-from-themes`,
        { themeCount: count },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.result) {
        return response.data.result;
      } else {
        throw new Error('API返回了无效的响应格式');
      }
    } catch (error) {
      if (retries < 3) {
        this.logger.warn(`请求失败，正在重试 (${retries + 1}/3): ${error.message}`);
        await this.delay(1000 * (retries + 1));
        return this.generateQuestionsFromThemes(bookId, count, retries + 1);
      } else {
        throw error;
      }
    }
  }

  /**
   * 生成新主题和题目 (模式二)
   */
  async generateQuestionsWithNewThemes(bookId, retries = 0) {
    if (!this.token) {
      throw new Error('未认证，请先调用authenticate()');
    }

    try {
      this.logger.info(`正在为书籍 ${bookId} 生成新主题和题目...`);
      
      const response = await axios.post(
        `${this.baseUrl}/books/${bookId}/generate-questions`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.result) {
        return response.data.result;
      } else {
        throw new Error('API返回了无效的响应格式');
      }
    } catch (error) {
      if (retries < 3) {
        this.logger.warn(`请求失败，正在重试 (${retries + 1}/3): ${error.message}`);
        await this.delay(1000 * (retries + 1));
        return this.generateQuestionsWithNewThemes(bookId, retries + 1);
      } else {
        throw error;
      }
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 书籍管理器
 */
class BookManager {
  constructor(logger) {
    this.supabase = supabaseAdmin;
    this.logger = logger;
  }

  async getPublishedBooks() {
    try {
      const { data, error } = await this.supabase
        .from('books')
        .select('bookId, title, author, questionCount')
        .eq('isPublished', true)
        .order('title');

      if (error) {
        throw error;
      }

      return data.map(book => ({
        id: book.bookId,
        title: book.title,
        author: book.author,
        questionCount: book.questionCount || 0
      }));
    } catch (error) {
      this.logger.error(`获取已发布书籍失败: ${error.message}`);
      throw error;
    }
  }

  async getBook(bookId) {
    try {
      const { data, error } = await this.supabase
        .from('books')
        .select('bookId, title, author, questionCount')
        .eq('bookId', bookId)
        .eq('isPublished', true)
        .single();

      if (error) {
        throw error;
      }

      return {
        id: data.bookId,
        title: data.title,
        author: data.author,
        questionCount: data.questionCount || 0
      };
    } catch (error) {
      this.logger.error(`获取书籍信息失败: ${error.message}`);
      throw error;
    }
  }

  async getBookThemeCount(bookId) {
    try {
      const { count, error } = await this.supabase
        .from('themes')
        .select('*', { count: 'exact', head: true })
        .eq('bookId', bookId);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      this.logger.error(`获取书籍主题数量失败: ${error.message}`);
      return 0;
    }
  }
}

/**
 * 为单本书生成题目 (模式一：基于现有主题)
 */
async function generateQuestionsForBookThemeMode(client, book, config) {
  try {
    if (config.dryRun) {
      logger.info(`[干运行] 将为书籍 "${book.title}" 生成 ${config.count} 个主题的题目`);
      return { success: true, generated: 0, book: book.title };
    }

    const result = await client.generateQuestionsFromThemes(book.id, config.count);
    
    if (result && result.questionsGenerated !== undefined) {
      logger.info(`✅ 成功为书籍 "${book.title}" 生成了 ${result.questionsGenerated} 个题目`);
      if (result.totalQuestions !== undefined) {
        logger.info(`📊 书籍 "${book.title}" 现在总共有 ${result.totalQuestions} 个题目`);
      }
      return { 
        success: true, 
        generated: result.questionsGenerated, 
        book: book.title,
        total: result.totalQuestions 
      };
    } else {
      logger.warn(`⚠️  书籍 "${book.title}" 生成题目失败或没有可用主题`);
      return { success: false, generated: 0, book: book.title, reason: '没有可用主题或生成失败' };
    }
  } catch (error) {
    logger.error(`❌ 为书籍 "${book.title}" 生成题目时出错: ${error.message}`);
    return { success: false, generated: 0, book: book.title, error: error.message };
  }
}

/**
 * 为单本书生成题目 (模式二：生成新主题)
 */
async function generateQuestionsForBookFullMode(client, book, config) {
  try {
    if (config.dryRun) {
      logger.info(`[干运行] 将为书籍 "${book.title}" 生成新主题和题目`);
      return { success: true, generated: 0, book: book.title };
    }

    const result = await client.generateQuestionsWithNewThemes(book.id);
    
    if (result && result.questionsGenerated !== undefined) {
      logger.info(`✅ 成功为书籍 "${book.title}" 生成了 ${result.questionsGenerated} 个题目`);
      if (result.newThemesCount !== undefined) {
        logger.info(`🎯 为书籍 "${book.title}" 生成了 ${result.newThemesCount} 个新主题`);
      }
      if (result.totalQuestions !== undefined) {
        logger.info(`📊 书籍 "${book.title}" 现在总共有 ${result.totalQuestions} 个题目`);
      }
      return { 
        success: true, 
        generated: result.questionsGenerated, 
        book: book.title,
        newThemes: result.newThemesCount,
        total: result.totalQuestions 
      };
    } else {
      logger.warn(`⚠️  书籍 "${book.title}" 生成新主题和题目失败`);
      return { success: false, generated: 0, book: book.title, reason: '生成失败' };
    }
  } catch (error) {
    logger.error(`❌ 为书籍 "${book.title}" 生成新主题和题目时出错: ${error.message}`);
    return { success: false, generated: 0, book: book.title, error: error.message };
  }
}

// 全局变量
let logger;

/**
 * 主执行函数
 */
async function main() {
  const startTime = Date.now();
  const config = parseArguments(process.argv.slice(2));

  // 显示帮助信息
  if (config.help) {
    showHelp();
    return;
  }

  // 参数验证
  if (!config.allBooks && !config.bookId) {
    console.error('❌ 错误: 必须指定 --all-books 或 --book-id 参数');
    console.error('使用 --help 查看详细说明');
    process.exit(1);
  }

  if (config.allBooks && config.bookId) {
    console.error('❌ 错误: --all-books 和 --book-id 参数不能同时使用');
    process.exit(1);
  }

  if (config.mode === 'theme' && (config.count < 1 || config.count > 20)) {
    console.error('❌ 错误: 题目数量必须在 1-20 之间');
    process.exit(1);
  }

  // 初始化日志记录器
  logger = new Logger(config.logFile, config.verbose);

  logger.info(`🚀 题目生成脚本启动 - 模式: ${config.mode === 'theme' ? '基于现有主题' : '生成新主题'}`);
  
  if (config.mode === 'theme') {
    logger.info(`📝 每本书将生成 ${config.count} 个主题的题目`);
  }
  
  if (config.dryRun) {
    logger.info('🔍 运行在干运行模式，不会实际生成题目');
  }

  try {
    // 初始化API客户端和书籍管理器
    const client = new APIClient(logger);
    const bookManager = new BookManager(logger);

    // API认证
    if (!config.dryRun) {
      const authenticated = await client.authenticate();
      if (!authenticated) {
        throw new Error('API认证失败');
      }
      logger.info('✅ API认证成功');
    }

    let books = [];
    
    if (config.bookId) {
      // 处理单本书籍
      logger.info(`📖 获取指定书籍信息: ${config.bookId}`);
      const book = await bookManager.getBook(config.bookId);
      books = [book];
    } else if (config.allBooks) {
      // 处理所有书籍
      logger.info('📚 获取所有已发布书籍...');
      books = await bookManager.getPublishedBooks();
      logger.info(`找到 ${books.length} 本已发布的书籍`);
    }

    if (books.length === 0) {
      logger.warn('⚠️  没有找到符合条件的书籍');
      return;
    }

    // 根据模式选择处理函数
    const processFunction = config.mode === 'theme' 
      ? generateQuestionsForBookThemeMode 
      : generateQuestionsForBookFullMode;

    // 处理书籍
    const results = [];
    for (const book of books) {
      logger.info(`\n📖 处理书籍: "${book.title}" (ID: ${book.id})`);
      
      const result = await processFunction(client, book, config);
      results.push(result);
      
      // 添加延迟避免API限制
      if (books.length > 1 && book !== books[books.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }
    }

    // 输出执行摘要
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    logger.info('\n' + '='.repeat(50));
    logger.info('📊 执行摘要');
    logger.info('='.repeat(50));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalGenerated = successful.reduce((sum, r) => sum + r.generated, 0);
    
    logger.info(`✅ 成功处理: ${successful.length} 本书籍`);
    logger.info(`❌ 失败: ${failed.length} 本书籍`);
    logger.info(`📝 总共生成: ${totalGenerated} 个题目`);
    
    if (config.mode === 'full') {
      const totalNewThemes = successful.reduce((sum, r) => sum + (r.newThemes || 0), 0);
      logger.info(`🎯 新增主题: ${totalNewThemes} 个`);
    }
    
    logger.info(`⏱️  执行时间: ${duration} 秒`);

    if (failed.length > 0) {
      logger.info('\n❌ 失败的书籍:');
      failed.forEach(result => {
        logger.info(`  - ${result.book}: ${result.reason || result.error || '未知错误'}`);
      });
    }

    if (successful.length > 0) {
      logger.info('\n✅ 成功的书籍:');
      successful.forEach(result => {
        let message = `  - ${result.book}: 生成 ${result.generated} 个题目`;
        if (result.newThemes) {
          message += `, 新增 ${result.newThemes} 个主题`;
        }
        if (result.total) {
          message += ` (总计: ${result.total})`;
        }
        logger.info(message);
      });
    }

  } catch (error) {
    logger.error(`💥 脚本执行失败: ${error.message}`);
    if (config.verbose) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

// 启动脚本
if (require.main === module) {
  main();
}

module.exports = {
  APIClient,
  BookManager,
  Logger
};