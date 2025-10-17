#!/bin/bash

# InkyBean Backend Service 启动脚本
# 使用方法: ./start.sh [dev|prod]

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 默认环境为开发环境
ENV=${1:-dev}

echo -e "${BLUE}🚀 InkyBean Backend Service 启动脚本${NC}"
echo -e "${BLUE}================================${NC}"

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js${NC}"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 未安装，请先安装 npm${NC}"
    exit 1
fi

# 检查 package.json 是否存在
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json 文件不存在${NC}"
    exit 1
fi

# 检查 .env 文件是否存在
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env 文件不存在，正在从 .env.example 复制...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ 已创建 .env 文件，请根据需要修改配置${NC}"
    else
        echo -e "${RED}❌ .env.example 文件也不存在，请手动创建 .env 文件${NC}"
        exit 1
    fi
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 正在安装依赖...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 依赖安装失败${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
fi

# 创建日志目录
if [ ! -d "logs" ]; then
    mkdir -p logs
    echo -e "${GREEN}✅ 已创建日志目录${NC}"
fi

# 检查端口是否被占用
PORT=$(grep "^PORT=" .env | cut -d '=' -f2 | tr -d ' ')
PORT=${PORT:-3001}

if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  端口 $PORT 已被占用${NC}"
    echo -e "${YELLOW}正在尝试停止现有进程...${NC}"
    
    # 尝试优雅停止
    if [ -f "server.pid" ]; then
        PID=$(cat server.pid)
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            sleep 2
            if kill -0 $PID 2>/dev/null; then
                kill -9 $PID
            fi
            rm -f server.pid
        fi
    fi
    
    # 强制停止占用端口的进程
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

echo -e "${BLUE}🔧 启动环境: ${ENV}${NC}"

# 根据环境启动服务
case $ENV in
    "dev"|"development")
        echo -e "${GREEN}🚀 启动开发环境...${NC}"
        export NODE_ENV=development
        npm run dev &
        ;;
    "prod"|"production")
        echo -e "${GREEN}🚀 启动生产环境...${NC}"
        export NODE_ENV=production
        npm start &
        ;;
    *)
        echo -e "${RED}❌ 未知环境: $ENV${NC}"
        echo -e "${YELLOW}支持的环境: dev, development, prod, production${NC}"
        exit 1
        ;;
esac

# 保存进程ID
SERVER_PID=$!
echo $SERVER_PID > server.pid

# 等待服务启动
echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 3

# 检查服务是否启动成功
if kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${GREEN}✅ 服务启动成功！${NC}"
    echo -e "${GREEN}📍 服务地址: http://localhost:$PORT${NC}"
    echo -e "${GREEN}🏥 健康检查: http://localhost:$PORT/health${NC}"
    echo -e "${GREEN}📋 进程ID: $SERVER_PID${NC}"
    echo -e "${BLUE}================================${NC}"
    echo -e "${YELLOW}💡 使用以下命令管理服务:${NC}"
    echo -e "${YELLOW}   查看状态: ./status.sh${NC}"
    echo -e "${YELLOW}   查看日志: ./logs.sh${NC}"
    echo -e "${YELLOW}   停止服务: ./stop.sh${NC}"
    echo -e "${YELLOW}   重启服务: ./restart.sh${NC}"
else
    echo -e "${RED}❌ 服务启动失败${NC}"
    rm -f server.pid
    exit 1
fi