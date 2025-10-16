const express = require('express');
const { supabase, supabaseAdmin } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { calculateCorruptionLevel } = require('../utils/corruptionCalculator');

const router = express.Router();

// GET /user/progress - 获取用户正在巩固的每本书的信息（包括进度等）
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1. 获取用户的所有学习进度
    const { data: userProgress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('userId', userId);

    if (progressError) {
      console.error('Error fetching user progress:', progressError);
      return res.status(500).json({
        error: 'Failed to fetch user progress',
        code: 'USER_PROGRESS_FETCH_ERROR'
      });
    }

    // 如果用户没有任何学习进度，返回空数组
    if (!userProgress || userProgress.length === 0) {
      return res.json([]);
    }

    // 2. 获取用户学习过的书籍信息
    const bookIds = userProgress.map(progress => progress.bookId);
    const { data: books, error: booksError } = await supabaseAdmin
      .from('books')
      .select('*')
      .in('bookId', bookIds)
      .eq('"isPublished"', true);

    if (booksError) {
      console.error('Error fetching books:', booksError);
      return res.status(500).json({
        error: 'Failed to fetch books information',
        code: 'BOOKS_FETCH_ERROR'
      });
    }

    // 3. 创建书籍映射表
    const booksMap = {};
    if (books && books.length > 0) {
      books.forEach(book => {
        booksMap[book.bookId] = book;
      });
    }

    // 4. 组合数据并计算腐蚀度
    const userProgressWithBooks = userProgress.map(progress => {
      const book = booksMap[progress.bookId];
      const corruptionLevel = calculateCorruptionLevel(progress.lastAttemptedAt);

      return {
        // 书籍基本信息
        bookId: progress.bookId,
        title: book ? book.title : 'Unknown Book',
        author: book ? book.author : 'Unknown Author',
        description: book ? book.description : '',
        coverImageUrl: book ? book.coverImageUrl : null,
        questionCount: book ? book.questionCount : 0,
        
        // 用户进度信息
        highestAccuracy: progress.highestAccuracy,
        totalAttempts: progress.totalAttempts,
        lastAttemptedAt: progress.lastAttemptedAt,
        corruptionLevel,
        
        // 时间戳
        createdAt: progress.createdAt,
        updatedAt: progress.updatedAt
      };
    });

    // 5. 按最后学习时间排序（最近学习的在前）
    userProgressWithBooks.sort((a, b) => {
      if (!a.lastAttemptedAt) return 1;
      if (!b.lastAttemptedAt) return -1;
      return new Date(b.lastAttemptedAt) - new Date(a.lastAttemptedAt);
    });

    res.json(userProgressWithBooks);

  } catch (error) {
    console.error('Error in GET /user/progress:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;