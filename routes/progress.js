const express = require('express');
const { supabase, supabaseAdmin } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, progressSchemas } = require('../middleware/validation');
const { calculateCorruptionLevel } = require('../utils/corruptionCalculator');

const router = express.Router();

// POST /books/:bookId/submit - 用户完成一次闯关后，提交本次结果
router.post('/:bookId/submit', 
  authenticateToken, 
  validateRequest(progressSchemas.submit), 
  async (req, res) => {
    try {
      const { bookId } = req.params;
      const { correctCount, totalCount } = req.body;
      const userId = req.user.userId;

      // 1. 验证书籍是否存在且已发布
      const { data: book, error: bookError } = await supabaseAdmin
        .from('books')
        .select('bookId, title, "isPublished"')
        .eq('bookId', bookId)
        .eq('"isPublished"', true)
        .single();

      if (bookError || !book) {
        return res.status(404).json({
          error: 'Book not found or not published',
          code: 'BOOK_NOT_FOUND'
        });
      }

      // 2. 计算本次正确率
      const currentAccuracy = correctCount / totalCount;

      // 3. 查询用户对这本书的现有进度记录
      const { data: existingProgress, error: progressError } = await supabaseAdmin
        .from('user_progress')
        .select('*')
        .eq('userId', userId)
        .eq('bookId', bookId)
        .single();

      const now = new Date().toISOString();
      let progressData;

      if (progressError && progressError.code === 'PGRST116') {
        // 记录不存在，创建新记录
        const { data: newProgress, error: createError } = await supabaseAdmin
          .from('user_progress')
          .insert({
            userId,
            bookId,
            lastAttemptedAt: now,
            highestAccuracy: currentAccuracy,
            totalAttempts: 1
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating progress:', createError);
          return res.status(500).json({
            error: 'Failed to create progress record',
            code: 'PROGRESS_CREATE_ERROR'
          });
        }

        progressData = newProgress;
      } else if (existingProgress) {
        // 记录存在，更新记录
        const updateData = {
          lastAttemptedAt: now,
          totalAttempts: existingProgress.totalAttempts + 1
        };

        // 如果本次正确率更高，更新最高正确率
        if (currentAccuracy > existingProgress.highestAccuracy) {
          updateData.highestAccuracy = currentAccuracy;
        }

        const { data: updatedProgress, error: updateError } = await supabaseAdmin
          .from('user_progress')
          .update(updateData)
          .eq('progressId', existingProgress.progressId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating progress:', updateError);
          return res.status(500).json({
            error: 'Failed to update progress record',
            code: 'PROGRESS_UPDATE_ERROR'
          });
        }

        progressData = updatedProgress;
      } else {
        // 其他错误
        console.error('Error fetching progress:', progressError);
        return res.status(500).json({
          error: 'Failed to fetch progress record',
          code: 'PROGRESS_FETCH_ERROR'
        });
      }

      // 4. 计算更新后的腐蚀度（刚完成学习，腐蚀度会很低）
      const newCorruptionLevel = calculateCorruptionLevel(progressData.lastAttemptedAt);

      // 5. 返回更新后的进度信息
      res.json({
        message: 'Progress submitted successfully',
        result: {
          bookId: book.bookId,
          bookTitle: book.title,
          currentAccuracy,
          correctCount,
          totalCount,
          progress: {
            highestAccuracy: progressData.highestAccuracy,
            totalAttempts: progressData.totalAttempts,
            lastAttemptedAt: progressData.lastAttemptedAt,
            corruptionLevel: newCorruptionLevel
          },
          isNewRecord: currentAccuracy > (existingProgress?.highestAccuracy || 0)
        }
      });

    } catch (error) {
      console.error('Error in POST /books/:bookId/submit:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

module.exports = router;