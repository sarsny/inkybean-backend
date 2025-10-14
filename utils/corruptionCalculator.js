/**
 * 计算书籍的腐蚀度（基于艾宾浩斯遗忘曲线）
 * @param {Date|string|null} lastAttemptedAt - 最后一次学习时间
 * @returns {number} 腐蚀度 (0.0 - 1.0)
 */
function calculateCorruptionLevel(lastAttemptedAt) {
  // 如果从未学习过，腐蚀度为100%
  if (!lastAttemptedAt) {
    return 1.0;
  }

  const now = new Date();
  const lastAttempt = new Date(lastAttemptedAt);
  
  // 计算时间差（小时）
  const timeDiffMs = now.getTime() - lastAttempt.getTime();
  const hoursPassed = timeDiffMs / (1000 * 60 * 60);

  // 应用遗忘曲线公式
  // 刚完成时腐蚀度为10%，每小时增加1%，最高100%
  const corruptionLevel = Math.min(1.0, 0.1 + (hoursPassed * 0.01));
  
  // 保留两位小数
  return Math.round(corruptionLevel * 100) / 100;
}

/**
 * 更高级的腐蚀度计算（可选实现）
 * 基于更复杂的遗忘曲线模型
 * @param {Date|string|null} lastAttemptedAt - 最后一次学习时间
 * @param {number} highestAccuracy - 最高正确率
 * @returns {number} 腐蚀度 (0.0 - 1.0)
 */
function calculateAdvancedCorruptionLevel(lastAttemptedAt, highestAccuracy = 0) {
  if (!lastAttemptedAt) {
    return 1.0;
  }

  const now = new Date();
  const lastAttempt = new Date(lastAttemptedAt);
  const hoursPassed = (now.getTime() - lastAttempt.getTime()) / (1000 * 60 * 60);

  // 基础遗忘率，受最高正确率影响
  // 正确率越高，遗忘越慢
  const baseForgetRate = 0.01 * (1 - highestAccuracy * 0.3);
  
  // 初始记忆保持率（刚学完时的记忆保持度）
  const initialRetention = 0.9;
  
  // 应用指数衰减模型
  const retentionRate = initialRetention * Math.exp(-baseForgetRate * hoursPassed);
  const corruptionLevel = Math.min(1.0, 1 - retentionRate);
  
  return Math.round(corruptionLevel * 100) / 100;
}

module.exports = {
  calculateCorruptionLevel,
  calculateAdvancedCorruptionLevel
};