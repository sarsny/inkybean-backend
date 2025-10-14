const express = require('express');
const { supabase, supabaseAdmin } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { calculateCorruptionLevel } = require('../utils/corruptionCalculator');

const router = express.Router();

// GET /books - 获取用户的所有书籍列表及对应的学习状态
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1. 获取所有已发布的书籍 - 使用管理员客户端绕过RLS
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

    // 2. 获取用户对所有书籍的进度
    const { data: userProgress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('userId', userId);

    if (progressError) {
      console.error('Error fetching user progress:', progressError);
    }

    // 3. 创建进度映射表
    const progressMap = {};
    if (userProgress && userProgress.length > 0) {
      userProgress.forEach(progress => {
        progressMap[progress.bookId] = progress;
      });
    }

    // 4. 组合数据并计算腐蚀度
    const booksWithProgress = books.map(book => {
      const progress = progressMap[book.bookId];
      const corruptionLevel = calculateCorruptionLevel(
        progress ? progress.lastAttemptedAt : null
      );

      return {
        bookId: book.bookId,
        title: book.title,
        author: book.author,
        description: book.description,
        coverImageUrl: book.coverImageUrl,
        questionCount: book.questionCount,
        corruptionLevel,
        highestAccuracy: progress ? progress.highestAccuracy : 0,
        totalAttempts: progress ? progress.totalAttempts : 0,
        lastAttemptedAt: progress ? progress.lastAttemptedAt : null
      };
    });

    res.json(booksWithProgress);

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

    // 1. 验证书籍是否存在且已发布
    const { data: book, error: bookError } = await supabase
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

    // 2. 获取该书的所有题目
    const { data: questions, error: questionsError } = await supabase
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

    // 4. 格式化返回数据
    const formattedQuestions = shuffledQuestions.map(question => ({
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
      totalCount: formattedQuestions.length
    });

  } catch (error) {
    console.error('Error in GET /books/:bookId/questions:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;