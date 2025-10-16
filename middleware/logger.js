const logger = (req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // 记录请求信息
  console.log('\n=== 📥 请求开始 ===');
  console.log(`🕐 时间: ${timestamp}`);
  console.log(`🔗 方法: ${req.method}`);
  console.log(`📍 路径: ${req.originalUrl}`);
  console.log(`🌐 IP: ${req.ip || req.connection.remoteAddress}`);
  console.log(`📋 Headers: ${JSON.stringify(req.headers, null, 2)}`);
  
  // 记录请求体（排除敏感信息）
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    // 隐藏敏感信息
    if (sanitizedBody.password) sanitizedBody.password = '***';
    if (sanitizedBody.token) sanitizedBody.token = '***';
    console.log(`📦 请求体: ${JSON.stringify(sanitizedBody, null, 2)}`);
  }
  
  // 记录查询参数
  if (req.query && Object.keys(req.query).length > 0) {
    console.log(`🔍 查询参数: ${JSON.stringify(req.query, null, 2)}`);
  }
  
  // 记录路径参数
  if (req.params && Object.keys(req.params).length > 0) {
    console.log(`🎯 路径参数: ${JSON.stringify(req.params, null, 2)}`);
  }

  // 拦截响应
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(data) {
    logResponse(data, res.statusCode, startTime);
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    logResponse(data, res.statusCode, startTime);
    return originalJson.call(this, data);
  };
  
  function logResponse(data, statusCode, startTime) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n=== 📤 响应结束 ===');
    console.log(`⏱️  耗时: ${duration}ms`);
    console.log(`📊 状态码: ${statusCode}`);
    
    // 记录响应数据（限制长度避免日志过长）
    let responseData = data;
    if (typeof data === 'string') {
      try {
        responseData = JSON.parse(data);
      } catch (e) {
        responseData = data;
      }
    }
    
    // 如果响应数据太长，截断显示
    const responseStr = JSON.stringify(responseData, null, 2);
    if (responseStr.length > 1000) {
      console.log(`📋 响应数据: ${responseStr.substring(0, 1000)}... (已截断)`);
    } else {
      console.log(`📋 响应数据: ${responseStr}`);
    }
    
    // 根据状态码显示不同的状态
    if (statusCode >= 200 && statusCode < 300) {
      console.log('✅ 请求成功');
    } else if (statusCode >= 400 && statusCode < 500) {
      console.log('⚠️  客户端错误');
    } else if (statusCode >= 500) {
      console.log('❌ 服务器错误');
    }
    
    console.log('='.repeat(50));
  }
  
  next();
};

module.exports = logger;