const axios = require('axios');

/**
 * Coze API 服务类
 * 用于封装 Coze 平台的各种 API 操作
 */
class CozeService {
  constructor() {
    this.apiKey = process.env.COZE_API_KEY;
    this.baseURL = process.env.COZE_BASE_URL || 'https://api.coze.com';
    this.botId = process.env.COZE_BOT_ID;
    this.workflowId = process.env.COZE_WORKFLOW_ID;
    
    // 用户会话映射
    this.userConversations = new Map();
    
    // 初始化 axios 实例
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30秒超时
    });

    // 验证必要的配置
    if (!this.apiKey) {
      console.warn('COZE_API_KEY 未设置，Coze 服务可能无法正常工作');
    }
    if (!this.botId) {
      console.warn('COZE_BOT_ID 未设置，Coze 服务可能无法正常工作');
    }
  }

  /**
   * 创建会话
   * @param {string} userId - 用户ID
   * @returns {Promise<string>} 会话ID
   */
  async createConversation(userId) {
    try {
      const response = await this.client.post('/v3/chat', {
        bot_id: this.botId,
        user_id: userId,
        stream: false,
        auto_save_history: true,
      });

      const conversationId = response.data.conversation_id;
      
      // 存储用户会话映射
      this.userConversations.set(userId, conversationId);
      
      console.log(`为用户 ${userId} 创建会话: ${conversationId}`);
      return conversationId;
    } catch (error) {
      console.error('创建会话失败:', error.response?.data || error.message);
      throw new Error(`创建会话失败: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * 发起对话
   * @param {string} userId - 用户ID
   * @param {string} message - 消息内容
   * @param {string} [conversationId] - 会话ID（可选）
   * @param {Object} [customVariables] - 自定义变量（可选）
   * @returns {Promise<Object>} 对话结果
   */
  async chat(userId, message, conversationId, customVariables = {}) {
    try {
      // 如果没有提供会话ID，尝试获取或创建
      if (!conversationId) {
        conversationId = this.userConversations.get(userId);
        if (!conversationId) {
          conversationId = await this.createConversation(userId);
        }
      }

      const requestData = {
        bot_id: this.botId,
        user_id: userId,
        conversation_id: conversationId,
        query: message,
        stream: false,
        auto_save_history: true,
        additional_messages: [],
        custom_variables: customVariables,
      };

      const response = await this.client.post('/v3/chat', requestData);
      
      console.log(`用户 ${userId} 对话成功，会话: ${conversationId}`);
      return {
        conversation_id: conversationId,
        chat_id: response.data.id,
        status: response.data.status,
        created_at: response.data.created_at,
        last_error: response.data.last_error,
      };
    } catch (error) {
      console.error('对话失败:', error.response?.data || error.message);
      throw new Error(`对话失败: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * 完整对话（等待完成）
   * @param {string} userId - 用户ID
   * @param {string} message - 消息内容
   * @param {string} [conversationId] - 会话ID（可选）
   * @param {Object} [customVariables] - 自定义变量（可选）
   * @returns {Promise<string>} 完整的回复内容
   */
  async completeChat(userId, message, conversationId, customVariables = {}) {
    try {
      // 发起对话
      const chatResult = await this.chat(userId, message, conversationId, customVariables);
      
      // 轮询等待完成
      const finalStatus = await this.pollChatStatus(chatResult.conversation_id, chatResult.chat_id);
      
      if (finalStatus.status === 'completed') {
        // 获取消息列表
        const messages = await this.getMessageList(chatResult.conversation_id, chatResult.chat_id);
        
        // 提取助手的回复
        const assistantMessages = messages.filter(msg => msg.role === 'assistant' && msg.type === 'answer');
        
        if (assistantMessages.length > 0) {
          return assistantMessages[assistantMessages.length - 1].content;
        } else {
          throw new Error('未找到助手回复');
        }
      } else {
        throw new Error(`对话未完成，状态: ${finalStatus.status}, 错误: ${finalStatus.last_error?.msg || '未知错误'}`);
      }
    } catch (error) {
      console.error('完整对话失败:', error.message);
      throw error;
    }
  }

  /**
   * 轮询对话状态直到完成
   * @param {string} conversationId - 会话ID
   * @param {string} chatId - 对话ID
   * @param {number} [maxAttempts=30] - 最大轮询次数
   * @param {number} [interval=2000] - 轮询间隔（毫秒）
   * @returns {Promise<Object>} 最终状态
   */
  async pollChatStatus(conversationId, chatId, maxAttempts = 30, interval = 2000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.client.get(`/v3/chat/retrieve?conversation_id=${conversationId}&chat_id=${chatId}`);
        const status = response.data;
        
        console.log(`轮询状态 (${attempt + 1}/${maxAttempts}): ${status.status}`);
        
        if (status.status === 'completed' || status.status === 'failed' || status.status === 'requires_action') {
          return status;
        }
        
        // 等待指定间隔后继续轮询
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        console.error(`轮询状态失败 (${attempt + 1}/${maxAttempts}):`, error.response?.data || error.message);
        
        if (attempt === maxAttempts - 1) {
          throw new Error(`轮询状态失败: ${error.response?.data?.msg || error.message}`);
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    throw new Error('轮询超时，对话可能仍在进行中');
  }

  /**
   * 获取消息列表
   * @param {string} conversationId - 会话ID
   * @param {string} chatId - 对话ID
   * @returns {Promise<Array>} 消息列表
   */
  async getMessageList(conversationId, chatId) {
    try {
      const response = await this.client.get(`/v3/chat/message/list?conversation_id=${conversationId}&chat_id=${chatId}`);
      
      console.log(`获取消息列表成功，会话: ${conversationId}, 对话: ${chatId}`);
      return response.data.data || [];
    } catch (error) {
      console.error('获取消息列表失败:', error.response?.data || error.message);
      throw new Error(`获取消息列表失败: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * 清空用户会话
   * @param {string} userId - 用户ID
   */
  clearConversation(userId) {
    this.userConversations.delete(userId);
    console.log(`清空用户 ${userId} 的会话`);
  }

  /**
   * 获取用户的会话ID
   * @param {string} userId - 用户ID
   * @returns {string|null} 会话ID
   */
  getConversationId(userId) {
    return this.userConversations.get(userId) || null;
  }

  /**
   * 运行工作流
   * @param {Object} parameters - 工作流参数
   * @returns {Promise<Object>} 工作流执行结果
   */
  async runWorkflow(parameters = {}) {
    try {
      if (!this.workflowId) {
        throw new Error('COZE_WORKFLOW_ID 未配置');
      }

      // 使用正确的 Coze API 端点执行工作流
      const response = await this.client.post('/v1/workflow/run', {
        workflow_id: this.workflowId,
        parameters: parameters,
        app_id: process.env.COZE_APP_ID || undefined
      });

      console.log('工作流执行成功:', response.data);
      return response.data;

    } catch (error) {
      console.error('工作流执行失败:', error.response?.data || error.message);
      throw new Error(`工作流执行失败: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * 获取工作流执行状态
   * @param {string} executeId - 执行ID
   * @returns {Promise<Object>} 执行状态
   */
  async getWorkflowStatus(executeId) {
    try {
      const response = await this.client.get(`/v1/workflow/runs/retrieve?execute_id=${executeId}`);
      
      console.log(`工作流状态: ${response.data.status}`);
      return response.data;
    } catch (error) {
      console.error('获取工作流状态失败:', error.response?.data || error.message);
      throw new Error(`获取工作流状态失败: ${error.response?.data?.msg || error.message}`);
    }
  }
}

// 单例实例
let cozeServiceInstance = null;

/**
 * 获取 CozeService 单例实例
 * @returns {CozeService} CozeService 实例
 */
function getCozeService() {
  if (!cozeServiceInstance) {
    cozeServiceInstance = new CozeService();
  }
  return cozeServiceInstance;
}

module.exports = {
  CozeService,
  getCozeService,
};