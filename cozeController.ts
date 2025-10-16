import { Request, Response } from 'express';
import { getCozeService } from '../services/cozeService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * 创建会话
 */
export const createConversation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: '用户未认证' });
      return;
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
};

/**
 * 发起对话
 */
export const chat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: '用户未认证' });
      return;
    }

    const { message, conversation_id } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: '消息内容不能为空' });
      return;
    }

    const cozeService = getCozeService();
    const chatData = await cozeService.chat(userId, message, conversation_id);

    res.status(200).json({
      success: true,
      data: chatData,
    });
  } catch (error) {
    console.error('发起对话失败:', error);
    res.status(500).json({
      error: '发起对话失败',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
};

/**
 * 完整对话流程（发起对话并等待回复）
 */
export const completeChat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: '用户未认证' });
      return;
    }

    const { message, conversation_id } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: '消息内容不能为空' });
      return;
    }

    const cozeService = getCozeService();
    const reply = await cozeService.completeChat(userId, message, conversation_id);

    res.status(200).json({
      success: true,
      data: {
        reply,
        conversation_id: cozeService.getConversationId(userId),
      },
    });
  } catch (error) {
    console.error('完整对话流程失败:', error);
    res.status(500).json({
      error: '对话失败',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
};

/**
 * 获取对话状态
 */
export const getChatStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: '用户未认证' });
      return;
    }

    const { conversation_id, chat_id } = req.query;

    if (!conversation_id || !chat_id) {
      res.status(400).json({ error: '缺少必要参数：conversation_id 和 chat_id' });
      return;
    }

    const cozeService = getCozeService();
    const status = await cozeService.pollChatStatus(
      conversation_id as string,
      chat_id as string
    );

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
};

/**
 * 获取对话消息列表
 */
export const getMessageList = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: '用户未认证' });
      return;
    }

    const { conversation_id, chat_id } = req.query;

    if (!conversation_id || !chat_id) {
      res.status(400).json({ error: '缺少必要参数：conversation_id 和 chat_id' });
      return;
    }

    const cozeService = getCozeService();
    const messages = await cozeService.getMessageList(
      conversation_id as string,
      chat_id as string
    );

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('获取消息列表失败:', error);
    res.status(500).json({
      error: '获取消息列表失败',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
};

/**
 * 清除用户会话
 */
export const clearConversation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: '用户未认证' });
      return;
    }

    const cozeService = getCozeService();
    cozeService.clearConversation(userId);

    res.status(200).json({
      success: true,
      message: '会话已清除',
    });
  } catch (error) {
    console.error('清除会话失败:', error);
    res.status(500).json({
      error: '清除会话失败',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
};

/**
 * 获取用户当前会话ID
 */
export const getConversationId = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: '用户未认证' });
      return;
    }

    const cozeService = getCozeService();
    const conversationId = cozeService.getConversationId(userId);

    res.status(200).json({
      success: true,
      data: {
        conversation_id: conversationId || null,
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
};