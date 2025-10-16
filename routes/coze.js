const express = require('express');
const { getCozeService } = require('../utils/cozeService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * 创建会话
 */
router.post('/conversation', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '用户未认证' });
    }

    const cozeService = getCozeService();
    const conversationId = await cozeService.createConversation(userId);

    res.status(200).json({
      success: true,
      data: {
        conversation_id: conversationId,
        user_id: userId,
      },
    });
  } catch (error) {
    console.error('创建会话失败:', error);
    res.status(500).json({
      error: '创建会话失败',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
});

/**
 * 发起对话
 */
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '用户未认证' });
    }

    const { message, conversation_id, custom_variables } = req.body;

    if (!message) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    const cozeService = getCozeService();
    const result = await cozeService.chat(userId, message, conversation_id, custom_variables);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('对话失败:', error);
    res.status(500).json({
      error: '对话失败',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
});

/**
 * 完整对话（等待完成）
 */
router.post('/chat/complete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '用户未认证' });
    }

    const { message, conversation_id, custom_variables } = req.body;

    if (!message) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    const cozeService = getCozeService();
    const result = await cozeService.completeChat(userId, message, conversation_id, custom_variables);

    res.status(200).json({
      success: true,
      data: {
        response: result,
      },
    });
  } catch (error) {
    console.error('完整对话失败:', error);
    res.status(500).json({
      error: '完整对话失败',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
});

/**
 * 获取对话状态
 */
router.get('/chat/:conversationId/:chatId/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '用户未认证' });
    }

    const { conversationId, chatId } = req.params;

    if (!conversationId || !chatId) {
      return res.status(400).json({ error: '会话ID和对话ID不能为空' });
    }

    const cozeService = getCozeService();
    const status = await cozeService.pollChatStatus(conversationId, chatId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('获取对话状态失败:', error);
    res.status(500).json({
      error: '获取对话状态失败',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
});

/**
 * 获取消息列表
 */
router.get('/messages/:conversationId/:chatId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '用户未认证' });
    }

    const { conversationId, chatId } = req.params;

    if (!conversationId || !chatId) {
      return res.status(400).json({ error: '会话ID和对话ID不能为空' });
    }

    const cozeService = getCozeService();
    const messages = await cozeService.getMessageList(conversationId, chatId);

    res.status(200).json({
      success: true,
      data: {
        messages: messages,
      },
    });
  } catch (error) {
    console.error('获取消息列表失败:', error);
    res.status(500).json({
      error: '获取消息列表失败',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
});

/**
 * 清空会话
 */
router.delete('/conversation', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '用户未认证' });
    }

    const cozeService = getCozeService();
    cozeService.clearConversation(userId);

    res.status(200).json({
      success: true,
      message: '会话已清空',
    });
  } catch (error) {
    console.error('清空会话失败:', error);
    res.status(500).json({
      error: '清空会话失败',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
});

/**
 * 获取会话ID
 */
router.get('/conversation', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '用户未认证' });
    }

    const cozeService = getCozeService();
    const conversationId = cozeService.getConversationId(userId);

    if (!conversationId) {
      return res.status(404).json({
        error: '会话不存在',
        message: '请先创建会话',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        conversation_id: conversationId,
        user_id: userId,
      },
    });
  } catch (error) {
    console.error('获取会话ID失败:', error);
    res.status(500).json({
      error: '获取会话ID失败',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
});

module.exports = router;