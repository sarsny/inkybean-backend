module.exports = {
  apps: [
    {
      // 应用基本配置
      name: 'inkybean-backend',
      script: 'index.js',
      cwd: process.cwd(), // 使用当前工作目录
      
      // 运行环境
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // 进程管理
      instances: 'max', // 使用所有CPU核心
      exec_mode: 'cluster', // 集群模式
      
      // 自动重启配置
      autorestart: true,
      watch: false, // 生产环境不建议开启文件监听
      max_memory_restart: '1G', // 内存超过1G时重启
      
      // 日志配置
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // 进程控制
      min_uptime: '10s', // 最小运行时间
      max_restarts: 10, // 最大重启次数
      restart_delay: 4000, // 重启延迟
      
      // 健康检查
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // 性能监控
      pmx: true,
      
      // 高级配置
      node_args: [
        '--max-old-space-size=1024', // 设置最大内存使用
        '--optimize-for-size' // 优化内存使用
      ],
      
      // 环境变量文件
      env_file: '.env.production',
      
      // 进程标题
      instance_var: 'INSTANCE_ID',
      
      // 优雅关闭
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // 错误处理
      ignore_watch: [
        'node_modules',
        'logs',
        '*.log'
      ],
      
      // 集群配置
      increment_var: 'PORT',
      
      // 监控配置
      monitoring: false, // 如果使用PM2 Plus，设置为true
      
      // 自定义启动脚本
      pre_hook: 'echo "Starting InkyBean Backend..."',
      post_hook: 'echo "InkyBean Backend started successfully"'
    }
  ],
  
  // 部署配置
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server-ip'], // 替换为实际服务器IP
      ref: 'origin/main',
      repo: 'https://github.com/your-username/inkybean-ios-backend.git', // 替换为实际仓库地址
      path: '/var/www/inkybean-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get update && apt-get install -y git nodejs npm',
      'ssh_options': 'StrictHostKeyChecking=no'
    },
    
    staging: {
      user: 'deploy',
      host: ['staging-server-ip'], // 替换为实际测试服务器IP
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/inkybean-ios-backend.git',
      path: '/var/www/inkybean-backend-staging',
      'post-deploy': 'npm ci && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
        PORT: 3001
      }
    }
  }
};