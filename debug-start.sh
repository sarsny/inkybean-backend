#!/bin/bash

# 调试版本的启动脚本
echo "=== 调试启动脚本 ==="
echo "当前目录: $(pwd)"
echo "脚本目录: $(dirname "$0")"

# 切换到脚本目录
cd "$(dirname "$0")"
echo "切换后目录: $(pwd)"

# 检查logs目录
echo "检查logs目录..."
if [ ! -d "logs" ]; then
    echo "创建logs目录..."
    mkdir -p logs
    echo "logs目录已创建"
else
    echo "logs目录已存在"
fi

# 列出logs目录内容
echo "logs目录内容:"
ls -la logs/

# 检查.env文件
echo "检查.env文件..."
if [ -f ".env" ]; then
    echo ".env文件存在"
    PORT=$(grep "^PORT=" .env | cut -d '=' -f2 | tr -d ' ')
    echo "端口: ${PORT:-3001}"
else
    echo ".env文件不存在"
fi

# 检查package.json
echo "检查package.json..."
if [ -f "package.json" ]; then
    echo "package.json存在"
else
    echo "package.json不存在"
fi

# 检查index.js
echo "检查index.js..."
if [ -f "index.js" ]; then
    echo "index.js存在"
else
    echo "index.js不存在"
fi

# 尝试启动服务（测试模式）
echo "尝试启动服务..."
echo "执行命令: node index.js"
node index.js > logs/debug.log 2>&1 &
SERVER_PID=$!
echo "服务PID: $SERVER_PID"

# 等待一下
sleep 2

# 检查进程是否还在运行
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "服务启动成功，PID: $SERVER_PID"
    echo $SERVER_PID > server.pid
    
    # 显示日志内容
    echo "=== 日志内容 ==="
    if [ -f "logs/debug.log" ]; then
        cat logs/debug.log
    else
        echo "日志文件不存在"
    fi
else
    echo "服务启动失败"
    if [ -f "logs/debug.log" ]; then
        echo "错误日志:"
        cat logs/debug.log
    fi
fi