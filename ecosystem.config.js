module.exports = {
  apps: [{
    name: 'inkybean-backend',
    script: './index.js',
    cwd: process.cwd(),
    
    // 实例配置
    instances: 1,  // 只启动一个实例，防止端口冲突
    exec_mode: 'fork',  // 使用 fork 模式而不是 cluster 模式
    
    // 环境配置
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    
    // 自动重启配置
    autorestart: true,
    watch: false,  // 生产环境不监听文件变化
    max_memory_restart: '1G',
    restart_delay: 4000,  // 重启延迟4秒
    max_restarts: 10,     // 最大重启次数
    min_uptime: '10s',    // 最小运行时间
    
    // 日志配置
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // 进程管理
    kill_timeout: 5000,   // 强制杀死进程的超时时间
    listen_timeout: 3000, // 监听超时时间
    
    // 健康检查
    health_check_grace_period: 3000,
    
    // 防止端口冲突的配置
    increment_var: 'PORT',  // 如果端口被占用，不自动递增
    force: false,           // 不强制启动
    
    // 其他配置
    node_args: '--max-old-space-size=1024',
    source_map_support: true,
    
    // 部署配置
     deploy: {
       production: {
         user: 'sarsny',
         host: 'localhost',
         ref: 'origin/main',
         repo: 'git@github.com:username/inkybean-backend.git',
         path: './deploy',
         'pre-deploy-local': '',
         'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
         'pre-setup': ''
       }
     }
   }],
   
   // 全局配置
   deploy: {
     production: {
       user: 'sarsny',
       host: 'localhost',
       ref: 'origin/main',
       repo: 'git@github.com:username/inkybean-backend.git',
       path: './deploy',
       'post-deploy': 'npm install && pm2 startOrRestart ecosystem.config.js --env production'
     }
   }
};