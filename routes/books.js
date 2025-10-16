const express = require('express');
const axios = require('axios');
const { supabase, supabaseAdmin } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { calculateCorruptionLevel } = require('../utils/corruptionCalculator');
const { getCozeService } = require('../utils/cozeService');

const router = express.Router();

// POST /books - 添加新书籍 (测试版本，暂时移除认证)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    
    // 验证输入参数
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        error: '书名不能为空',
        code: 'INVALID_TITLE'
      });
    }

    const bookTitle = title.trim();

    // 第一步：检查书籍是否已存在
    const { data: existingBook, error: checkError } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('title', bookTitle)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 表示没有找到记录
      console.error('检查书籍重复时出错:', checkError);
      return res.status(500).json({
        error: '检查书籍信息时出错',
        code: 'DATABASE_ERROR'
      });
    }

    // 如果书籍已存在，直接返回现有信息
    if (existingBook) {
      return res.json({
        message: '书籍已存在',
        book: {
          bookId: existingBook.bookId,
          title: existingBook.title,
          author: existingBook.author,
          description: existingBook.description,
          coverImageUrl: existingBook.coverImageUrl,
          questionCount: existingBook.questionCount,
          createdAt: existingBook.createdAt,
          updatedAt: existingBook.updatedAt
        }
      });
    }

    // 第二步：调用 Coze 工作流获取书籍信息
    const cozeService = getCozeService();
    let bookInfo;
    
    try {
      // 调用 Coze 工作流，使用 cozeService 的 runWorkflow 方法
      const workflowResponse = await cozeService.runWorkflow({
        title: bookTitle
      });

      console.log('Coze 工作流完整响应:', JSON.stringify(workflowResponse, null, 2));

      // 解析工作流返回的结果
      if (!workflowResponse || workflowResponse.code !== 0) {
        throw new Error(`Coze 工作流执行失败: ${workflowResponse?.msg || '未知错误'}`);
      }

      // 尝试解析 data 字段（可能是 JSON 字符串）
      let output;
      try {
        if (typeof workflowResponse.data === 'string') {
          const parsedData = JSON.parse(workflowResponse.data);
          // 如果解析后的数据有output字段，则使用output
          output = parsedData.output || parsedData;
        } else {
          output = workflowResponse.data;
          // 如果data是对象且有output字段，则使用output
          if (output && output.output) {
            output = output.output;
          }
        }
      } catch (parseError) {
        console.error('解析 Coze 响应数据失败:', parseError);
        throw new Error('Coze 工作流返回数据格式错误');
      }

      console.log('解析后的输出:', JSON.stringify(output, null, 2));
      
      // 验证返回的书籍信息 - 根据实际响应结构调整
      if (!output) {
        throw new Error('Coze 返回的书籍信息不完整');
      }

      // 处理作者信息 - 根据实际Coze响应格式更新字段映射
      let authorName = '';
      if (output.authors && Array.isArray(output.authors)) {
        authorName = output.authors.join(', ');
      } else if (output.author) {
        authorName = output.author;
      } else {
        // 如果没有直接的作者信息，设置为未知作者
        authorName = '未知作者';
      }

      // 根据实际响应结构提取书名
      let bookName = output.book_name || output.title || bookTitle;

      bookInfo = {
        title: bookName,
        author: authorName,
        description: output.summary || output.description || '',
        coverImageUrl: output.book_image || output.cover_image || ''
      };

    } catch (cozeError) {
      console.error('Coze 工作流调用失败:', cozeError);
      return res.status(500).json({
        error: '无法找到书籍信息，请稍后再试',
        code: 'COZE_API_ERROR',
        details: cozeError.message
      });
    }

    // 第三步：将书籍信息写入数据库
    const { data: newBook, error: insertError } = await supabaseAdmin
      .from('books')
      .insert({
        title: bookInfo.title,
        author: bookInfo.author,
        description: bookInfo.description,
        coverImageUrl: bookInfo.coverImageUrl,
        questionCount: 0,
        isPublished: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('书籍入库失败:', insertError);
      return res.status(500).json({
        error: '书籍信息保存失败',
        code: 'DATABASE_INSERT_ERROR'
      });
    }

    // 第四步：立即返回响应
    const responseData = {
      message: '书籍添加成功',
      book: {
        bookId: newBook.bookId,
        title: newBook.title,
        author: newBook.author,
        description: newBook.description,
        coverImageUrl: newBook.coverImageUrl,
        questionCount: newBook.questionCount,
        createdAt: newBook.createdAt,
        updatedAt: newBook.updatedAt
      }
    };

    // 第五步：触发后台题目生成任务（异步执行，不阻塞响应）
    setImmediate(async () => {
      try {
        console.log(`开始为书籍 ${newBook.bookId} 生成题目...`);
        
        // 直接调用题目生成函数，避免HTTP请求
        await generateQuestionsForBook(newBook.bookId, newBook.title, newBook.author);
        
        console.log(`书籍 ${newBook.bookId} 题目生成完成`);
      } catch (generateError) {
        console.error(`书籍 ${newBook.bookId} 题目生成失败:`, generateError.message);
        // 这里可以添加重试逻辑或者记录到错误日志
      }
    });

    res.status(201).json(responseData);

  } catch (error) {
    console.error('添加书籍时发生错误:', error);
    res.status(500).json({
      error: '服务器内部错误',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /books - 获取所有书籍 (测试版本，暂时移除认证)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // 获取所有已发布的书籍 - 使用管理员客户端绕过RLS
    const { data: books, error: booksError } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('"isPublished"', true)
      .order('"createdAt"', { ascending: true });

    if (booksError) {
      console.error('Error fetching books:', booksError);
      return res.status(500).json({
        error: 'Failed to fetch books',
        code: 'BOOKS_FETCH_ERROR'
      });
    }

    // 只返回书籍的基本信息，不包含用户进度
    const booksInfo = books.map(book => ({
      bookId: book.bookId,
      title: book.title,
      author: book.author,
      description: book.description,
      coverImageUrl: book.coverImageUrl,
      questionCount: book.questionCount,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt
    }));

    res.json(booksInfo);

  } catch (error) {
    console.error('Error in GET /books:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /books/:bookId/questions - 获取一本书的所有题目
router.get('/:bookId/questions', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;

    // 1. 验证书籍是否存在且已发布 - 使用管理员客户端绕过RLS
    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select('bookId, title, isPublished')
      .eq('bookId', bookId)
      .eq('isPublished', true)
      .single();

    if (bookError || !book) {
      return res.status(404).json({
        error: 'Book not found or not published',
        code: 'BOOK_NOT_FOUND'
      });
    }

    // 2. 获取该书的所有题目 - 使用管理员客户端绕过RLS
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('bookId', bookId)
      .order('createdAt', { ascending: true });

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return res.status(500).json({
        error: 'Failed to fetch questions',
        code: 'QUESTIONS_FETCH_ERROR'
      });
    }

    // 3. 打乱题目顺序（增加趣味性）
    const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);

    // 4. 限制返回数量为10题
    const limitedQuestions = shuffledQuestions.slice(0, 10);

    // 5. 格式化返回数据
    const formattedQuestions = limitedQuestions.map(question => ({
      questionId: question.questionId,
      statement: question.statement,
      imageUrl: question.imageUrl,
      isPure: question.isPure,
      explanation: question.explanation
    }));

    res.json({
      book: {
        bookId: book.bookId,
        title: book.title
      },
      questions: formattedQuestions,
      totalCount: questions.length, // 总题目数量
      returnedCount: formattedQuestions.length // 本次返回的题目数量
    });

  } catch (error) {
    console.error('Error in GET /books/:bookId/questions:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /books/:bookId/generate-questions - 为指定书籍生成新题目（两阶段生成法）
router.post('/:bookId/generate-questions', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;

    // 1. 获取书籍信息
    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('"bookId"', bookId)
      .eq('"isPublished"', true)
      .single();

    if (bookError || !book) {
      return res.status(404).json({
        error: 'Book not found or not published',
        code: 'BOOK_NOT_FOUND'
      });
    }

    // 2. 获取现有题目的主题（用于去重）
    const { data: existingQuestions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('statement, explanation')
      .eq('"bookId"', bookId);

    if (questionsError) {
      console.error('Error fetching existing questions:', questionsError);
      return res.status(500).json({
        error: 'Failed to fetch existing questions',
        code: 'QUESTIONS_FETCH_ERROR'
      });
    }

    // 3. 從themes表提取現有主題
    const existingThemes = await extractExistingThemes(bookId);

    // 4. 阶段1：生成新主题
    console.log('🎯 Phase 1: Generating new themes...');
    let newThemes;
    try {
      newThemes = await generateNewThemes(book.title, book.author, existingThemes);
    } catch (error) {
      console.error('Error generating new themes:', error);
      return res.status(500).json({
        error: 'Failed to generate new themes',
        code: 'AI_SERVICE_ERROR'
      });
    }
    
    if (!newThemes || newThemes.length === 0) {
      return res.status(500).json({
        error: 'Failed to generate new themes',
        code: 'AI_SERVICE_ERROR'
      });
    }

    // 5. 保存新生成的themes到数据库
    console.log('💾 Saving new themes to database...');
    const themesToInsert = newThemes.map(theme => ({
      bookId: bookId,
      themeText: theme
    }));

    const { data: insertedThemes, error: themesInsertError } = await supabaseAdmin
      .from('themes')
      .insert(themesToInsert)
      .select();

    if (themesInsertError) {
      console.error('Error inserting themes:', themesInsertError);
      return res.status(500).json({
        error: 'Failed to insert generated themes',
        code: 'THEMES_INSERT_ERROR'
      });
    }

    // 6. 后端随机角度指派
    console.log('🎲 Assigning random creative angles...');
    const themesWithAngles = assignRandomAngles(newThemes);

    // 7. 阶段2：基于指定角度生成题目
    console.log('📝 Phase 2: Generating questions with specified angles...');
    let generatedQuestions;
    try {
      generatedQuestions = await generateQuestionsWithAngles(book.title, book.author, themesWithAngles);
    } catch (error) {
      console.error('Error generating questions with angles:', error);
      return res.status(500).json({
        error: 'Failed to generate questions',
        code: 'AI_SERVICE_ERROR'
      });
    }
    
    if (!generatedQuestions || generatedQuestions.length === 0) {
      return res.status(500).json({
        error: 'Failed to generate questions',
        code: 'AI_SERVICE_ERROR'
      });
    }

    // 8. 安全检查与去重
    const uniqueQuestions = deduplicateQuestions(generatedQuestions, existingQuestions);

    // 9. 为每个题目分配对应的themeId
    console.log('🔗 Linking questions to themes...');
    const questionsToInsert = uniqueQuestions.map((question, index) => {
      // 根据题目索引找到对应的theme
      const themeIndex = index % insertedThemes.length;
      const correspondingTheme = insertedThemes[themeIndex];
      
      return {
        bookId: bookId,
        statement: question.statement,
        imageUrl: null,
        isPure: question.isPure,
        explanation: question.explanation,
        themeId: correspondingTheme.id
      };
    });

    const { data: insertedQuestions, error: insertError } = await supabaseAdmin
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting questions:', insertError);
      return res.status(500).json({
        error: 'Failed to insert generated questions',
        code: 'QUESTIONS_INSERT_ERROR'
      });
    }

    // 9. 更新书籍的题目数量
    const newQuestionCount = book.questionCount + insertedQuestions.length;
    const { error: updateError } = await supabaseAdmin
      .from('books')
      .update({ questionCount: newQuestionCount })
      .eq('"bookId"', bookId);

    if (updateError) {
      console.error('Error updating book question count:', updateError);
      // 不返回错误，因为题目已经成功插入
    }

    res.json({
      message: 'Questions generated successfully',
      result: {
        bookId: book.bookId,
        bookTitle: book.title,
        questions: insertedQuestions,
        totalGenerated: insertedQuestions.length,
        newQuestionCount: newQuestionCount,
        themesUsed: newThemes,
        themesInserted: insertedThemes,
        anglesAssigned: themesWithAngles
      }
    });

  } catch (error) {
    console.error('Error in POST /books/:bookId/generate-questions:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 构建DeepSeek API提示词
// 题目生成核心函数（从API路由中提取）
async function generateQuestionsForBook(bookId, bookTitle, bookAuthor) {
  try {
    // 1. 获取书籍信息
    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('"bookId"', bookId)
      .eq('"isPublished"', true)
      .single();

    if (bookError || !book) {
      throw new Error('Book not found or not published');
    }

    // 2. 获取现有题目的主题（用于去重）
    const { data: existingQuestions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('statement, explanation')
      .eq('"bookId"', bookId);

    if (questionsError) {
      console.error('Error fetching existing questions:', questionsError);
      throw new Error('Failed to fetch existing questions');
    }

    // 3. 從themes表提取現有主題
    const existingThemes = await extractExistingThemes(bookId);

    // 4. 阶段1：生成新主题
    console.log('🎯 Phase 1: Generating new themes...');
    let newThemes;
    try {
      newThemes = await generateNewThemes(book.title, book.author, existingThemes);
    } catch (error) {
      console.error('Error generating new themes:', error);
      throw new Error('Failed to generate new themes');
    }
    
    if (!newThemes || newThemes.length === 0) {
      throw new Error('Failed to generate new themes');
    }

    // 5. 保存新生成的themes到数据库
    console.log('💾 Saving new themes to database...');
    const themesToInsert = newThemes.map(theme => ({
      bookId: bookId,
      themeText: theme
    }));

    const { data: insertedThemes, error: themesInsertError } = await supabaseAdmin
      .from('themes')
      .insert(themesToInsert)
      .select();

    if (themesInsertError) {
      console.error('Error inserting themes:', themesInsertError);
      throw new Error('Failed to insert generated themes');
    }

    // 6. 后端随机角度指派
    console.log('🎲 Assigning random creative angles...');
    const themesWithAngles = assignRandomAngles(newThemes);

    // 7. 阶段2：基于指定角度生成题目
    console.log('📝 Phase 2: Generating questions with specified angles...');
    let generatedQuestions;
    try {
      generatedQuestions = await generateQuestionsWithAngles(book.title, book.author, themesWithAngles);
    } catch (error) {
      console.error('Error generating questions with angles:', error);
      throw new Error('Failed to generate questions');
    }
    
    if (!generatedQuestions || generatedQuestions.length === 0) {
      throw new Error('Failed to generate questions');
    }

    // 8. 安全检查与去重
    const uniqueQuestions = deduplicateQuestions(generatedQuestions, existingQuestions);

    // 9. 为每个题目分配对应的themeId
    console.log('🔗 Linking questions to themes...');
    const questionsToInsert = uniqueQuestions.map((question, index) => {
      // 根据题目索引找到对应的theme
      const themeIndex = index % insertedThemes.length;
      const correspondingTheme = insertedThemes[themeIndex];
      
      return {
        bookId: bookId,
        statement: question.statement,
        imageUrl: null,
        isPure: question.isPure,
        explanation: question.explanation,
        themeId: correspondingTheme.id
      };
    });

    const { data: insertedQuestions, error: insertError } = await supabaseAdmin
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting questions:', insertError);
      throw new Error('Failed to insert generated questions');
    }

    // 10. 更新书籍的题目数量
    const newQuestionCount = book.questionCount + insertedQuestions.length;
    const { error: updateError } = await supabaseAdmin
      .from('books')
      .update({ questionCount: newQuestionCount })
      .eq('"bookId"', bookId);

    if (updateError) {
      console.error('Error updating book question count:', updateError);
      // 不抛出错误，因为题目已经成功插入
    }

    console.log(`✅ Successfully generated ${insertedQuestions.length} questions for book ${bookId}`);
    
    return {
      bookId: book.bookId,
      bookTitle: book.title,
      questions: insertedQuestions,
      totalGenerated: insertedQuestions.length,
      newQuestionCount: newQuestionCount,
      themesUsed: newThemes,
      themesInserted: insertedThemes,
      anglesAssigned: themesWithAngles
    };

  } catch (error) {
    console.error(`Error generating questions for book ${bookId}:`, error);
    throw error;
  }
}

function buildPrompt(bookTitle, author, existingStatements) {
  let prompt = `# Role 
You are an expert educator and content creator, skilled at distilling a book's core ideas into insightful and non-trivial true/false statements. 

# Task 
Based on the provided book title and author, generate 5 new, unique, and high-quality true/false statements. 

# Context 
- Book Title: ${bookTitle} 
- Author: ${author || 'Unknown'} 
- Existing question statements to avoid repeating: `;

  if (existingStatements.length > 0) {
    existingStatements.forEach((statement, index) => {
      prompt += `\n  - "${statement}"`;
    });
  } else {
    prompt += '\n  - (No existing statements)';
  }

  prompt += `

# Quality Constraints 
1. **Unique**: The new statements must be conceptually different from the existing statements provided. Do not simply rephrase old statements. 
2. **High Quality**: 
   - Statements should test a core concept or a significant detail, not a trivial fact. 
   - **For false statements (\`isPure: false\`)**: The statement should be a common misconception or a subtle error that requires genuine understanding to identify. It should not be obviously or absurdly false. 
   - **For true statements (\`isPure: true\`)**: The statement should be a non-obvious truth that confirms a deeper understanding of the book's message. 
3. **Clarity**: The statement must be clear, unambiguous, and grammatically correct. 

# Output Format 
You MUST respond with a valid JSON array of question objects. Each object must follow this exact structure: 
[ 
  { 
    "statement": "The statement to be judged.", 
    "isPure": true, // or false 
    "explanation": "A clear explanation of why the statement is true or false, based on the book's content." 
  }, 
  ... 
]`;

  return prompt;
}

// 调用DeepSeek API - 支持不同的参数配置
async function callDeepSeekAPI(prompt, options = {}) {
  try {
    console.log('🤖 Calling DeepSeek API...');
    console.log('🔑 API Key:', process.env.DEEPSEEK_API_KEY ? 'Present' : 'Missing');
    console.log('🌐 API URL:', process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions');
    
    // 默认参数配置
    const defaultConfig = {
      temperature: 0.7,
      max_tokens: 2000
    };
    
    // 合并用户提供的配置
    const config = { ...defaultConfig, ...options };
    
    console.log('⚙️ API Config:', {
      temperature: config.temperature,
      max_tokens: config.max_tokens
    });
    
    const response = await axios.post(process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: config.temperature,
      max_tokens: config.max_tokens
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 增加到60秒超時
    });

    console.log('✅ DeepSeek API response received');
    let content = response.data.choices[0].message.content;
    console.log('📝 Raw response content:', content.substring(0, 200) + '...');
    
    // 清理响应内容，移除可能的markdown代码块标记
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    console.log('🧹 Cleaned content:', content.substring(0, 200) + '...');
    
    // 尝试解析JSON响应
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse DeepSeek response as JSON:', content);
      throw new Error('Invalid JSON response from AI service');
    }

  } catch (error) {
    console.error('DeepSeek API call failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - API call took too long');
    } else if (error.code === 'ECONNRESET') {
      console.error('Connection reset - API server closed the connection');
    }
    throw error;
  }
}

// ===== 新增的輔助函數：兩階段AI生成工作流 =====

// 從Supabase themes表獲取現有主題
async function extractExistingThemes(bookId) {
  try {
    const { data: themes, error } = await supabaseAdmin
      .from('themes')
      .select('themeText')
      .eq('bookId', bookId);
    
    if (error) {
      console.error('獲取現有主題失敗:', error);
      return [];
    }
    
    // 返回主題文本數組
    return themes.map(t => t.themeText);
  } catch (error) {
    console.error('提取現有主題時出錯:', error);
    return [];
  }
}

// 階段1：生成新主題的LLM調用
async function generateNewThemes(bookTitle, author, existingThemes) {
  try {
    const prompt = buildPromptA(bookTitle, author, existingThemes);
    
    // PromptA 配置：最大化創造力，尋找新角度
    const promptAConfig = {
      temperature: 1.0,  // 高創造力 (0.9 ~ 1.2)
      max_tokens: 2048   // 充足的token空間
    };
    
    const response = await callDeepSeekAPI(prompt, promptAConfig);
    
    if (response && response.themes && Array.isArray(response.themes)) {
      return response.themes;
    }
    
    console.error('Invalid themes response from AI:', response);
    return [];
  } catch (error) {
    console.error('Error generating new themes:', error);
    return [];
  }
}

// 構建Prompt A：生成新主題
function buildPromptA(bookTitle, author, existingThemes) {
  const existingThemesText = existingThemes.length > 0 
    ? existingThemes.map((theme, index) => `  - "${theme}"`).join('\n')
    : '  - (無現有主題)';

  return `# Role
You are a professional book analyst and literary critic with expertise in extracting deep, philosophical themes from literature.

# Task
Based on the provided book information, extract 5 new, unique, and high-level themes that are different from the existing themes already covered. Focus on core concepts, philosophical insights, and actionable principles that readers can apply to their lives.

# Input
- Book Title: ${bookTitle}
- Author: ${author}
- Existing themes to avoid repeating (in Chinese):
${existingThemesText}

# Output
You MUST respond with a single valid JSON object with the following structure:
{
  "themes": [
    "主題1的中文描述",
    "主題2的中文描述",
    "主題3的中文描述",
    "主題4的中文描述",
    "主題5的中文描述"
  ]
}

CRITICAL: All themes MUST be in Simplified Chinese and should be completely different from the existing themes provided above.`;
}

// 後端隨機角度指派邏輯
function assignRandomAngles(themes) {
  const creativeAngles = ["Common Misconception", "Practical Application", "Concept Extension/Contrast"];
  const themesWithAngles = [];
  
  themes.forEach(theme => {
    // 為每個主題隨機決定生成2道題
    const questionsPerTheme = 2;
    
    // 從創意角度列表中隨機抽取不重複的角度
    const shuffledAngles = [...creativeAngles].sort(() => Math.random() - 0.5);
    const selectedAngles = shuffledAngles.slice(0, questionsPerTheme);
    
    themesWithAngles.push({
      theme: theme,
      angles_to_use: selectedAngles
    });
  });
  
  return themesWithAngles;
}

// 階段2：基於指定角度生成題目
async function generateQuestionsWithAngles(bookTitle, author, themesWithAngles) {
  try {
    const prompt = buildPromptB(bookTitle, author, themesWithAngles);
    
    // PromptB 配置：平衡創意與穩定，遵循指令
    const promptBConfig = {
      temperature: 0.7,  // 平衡創意與穩定 (0.6 ~ 0.8)
      max_tokens: 4096   // 更大的token空間用於批量生成
    };
    
    const response = await callDeepSeekAPI(prompt, promptBConfig);
    
    if (response && response.results && Array.isArray(response.results)) {
      // 扁平化結果，將所有題目合併到一個數組中
      const allQuestions = [];
      response.results.forEach(result => {
        if (result.questions && Array.isArray(result.questions)) {
          allQuestions.push(...result.questions);
        }
      });
      return allQuestions;
    }
    
    console.error('Invalid questions response from AI:', response);
    return [];
  } catch (error) {
    console.error('Error generating questions with angles:', error);
    return [];
  }
}

// 構建Prompt B：執行指定角度的批量生成
function buildPromptB(bookTitle, author, themesWithAngles) {
  const themesJson = JSON.stringify(themesWithAngles, null, 2);
  
  return `# Role
You are a highly creative and precise quiz generation engine, powered by the DeepSeek model. You follow instructions to the letter to produce diverse and high-quality content.

# Task
For EACH theme object provided in the input list, generate one true/false question for EACH of the specified creative angles in the \`angles_to_use\` list.

# Description of Creative Angles
- **"Common Misconception"**: Create a statement that reflects a common misunderstanding of the theme. (\`isPure\` will be \`false\`).
- **"Practical Application"**: Create a statement that describes a real-world application or a specific "how-to" based on the theme. (\`isPure\` will be \`true\`).
- **"Concept Extension/Contrast"**: Create a statement that connects the theme to another concept in the book, or contrasts it with an opposing idea.

# Input
- Book Title: ${bookTitle}
- Author: ${author}
- Themes with specified angles to use: ${themesJson}

# Output Format
- **CRITICAL: All generated content (\`statement\`, \`explanation\`) MUST be in Simplified Chinese.**
- You MUST respond with a single valid JSON object. The object should have a single key "results", which is an array.
- Each element in the array corresponds to a theme and contains the theme itself and a list of the questions you generated for it based on the specified angles.
- Follow this structure precisely. Do not include any text outside of the JSON object.
{
  "results": [
    {
      "theme": "...",
      "questions": [
        {
          "statement": "...",
          "isPure": false,
          "explanation": "..."
        },
        {
          "statement": "...",
          "isPure": true,
          "explanation": "..."
        }
      ]
    }
  ]
}`;
}

// POST /books/:bookId/select - 用户选择要巩固的书籍
router.post('/:bookId/select', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.userId;

    // 1. 验证书籍是否存在且已发布
    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select('bookId, title, author, questionCount, isPublished')
      .eq('bookId', bookId)
      .eq('isPublished', true)
      .single();

    if (bookError || !book) {
      return res.status(404).json({
        error: '书籍不存在或未发布',
        code: 'BOOK_NOT_FOUND'
      });
    }

    // 2. 检查书籍是否有题目
    if (book.questionCount === 0) {
      return res.status(400).json({
        error: '该书籍暂无题目，无法开始巩固',
        code: 'NO_QUESTIONS_AVAILABLE'
      });
    }

    // 3. 检查用户是否已经选择过这本书
    const { data: existingProgress, error: checkError } = await supabase
      .from('user_progress')
      .select('progressId, createdAt')
      .eq('userId', userId)
      .eq('bookId', bookId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 表示没有找到记录
      console.error('检查用户进度时出错:', checkError);
      return res.status(500).json({
        error: '检查用户学习状态时出错',
        code: 'DATABASE_ERROR'
      });
    }

    // 4. 如果用户已经选择过这本书，返回现有记录
    if (existingProgress) {
      return res.json({
        message: '您已经选择过这本书籍',
        userProgress: {
          progressId: existingProgress.progressId,
          bookId: bookId,
          title: book.title,
          author: book.author,
          questionCount: book.questionCount,
          alreadySelected: true,
          selectedAt: existingProgress.createdAt
        }
      });
    }

    // 5. 创建新的用户进度记录
    const { data: newProgress, error: insertError } = await supabase
      .from('user_progress')
      .insert({
        userId: userId,
        bookId: bookId,
        highestAccuracy: 0,
        totalAttempts: 0,
        lastAttemptedAt: null
      })
      .select()
      .single();

    if (insertError) {
      console.error('创建用户进度记录失败:', insertError);
      return res.status(500).json({
        error: '选择书籍失败',
        code: 'DATABASE_INSERT_ERROR'
      });
    }

    // 6. 返回成功响应
    res.status(201).json({
      message: '书籍选择成功，开始巩固之旅！',
      userProgress: {
        progressId: newProgress.progressId,
        bookId: bookId,
        title: book.title,
        author: book.author,
        questionCount: book.questionCount,
        highestAccuracy: newProgress.highestAccuracy,
        totalAttempts: newProgress.totalAttempts,
        lastAttemptedAt: newProgress.lastAttemptedAt,
        alreadySelected: false,
        selectedAt: newProgress.createdAt
      }
    });

  } catch (error) {
    console.error('选择书籍时发生错误:', error);
    res.status(500).json({
      error: '服务器内部错误',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 安全檢查與去重
function deduplicateQuestions(generatedQuestions, existingQuestions) {
  const existingStatements = new Set(existingQuestions.map(q => q.statement.toLowerCase().trim()));
  
  return generatedQuestions.filter(question => {
    const normalizedStatement = question.statement.toLowerCase().trim();
    return !existingStatements.has(normalizedStatement);
  });
}

module.exports = router;