#!/bin/bash

# InkyBean Backend Service 停止脚本
# 使用方法: ./stop.sh [force]

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 是否强制停止
FORCE=${1:-false}

echo -e "${BLUE}🛑 InkyBean Backend Service 停止脚本${NC}"
echo -e "${BLUE}================================${NC}"

# 检查是否有运行的服务
RUNNING=false

# 从 PID 文件停止
if [ -f "server.pid" ]; then
    PID=$(cat server.pid)
    if kill -0 $PID 2>/dev/null; then
        echo -e "${YELLOW}📋 发现运行中的服务 (PID: $PID)${NC}"
        RUNNING=true
        
        if [ "$FORCE" = "force" ]; then
            echo -e "${RED}💥 强制停止服务...${NC}"
            kill -9 $PID
        else
            echo -e "${YELLOW}🔄 优雅停止服务...${NC}"
            kill $PID
            
            # 等待进程结束
            for i in {1..10}; do
                if ! kill -0 $PID 2>/dev/null; then
                    break
                fi
                echo -e "${YELLOW}⏳ 等待服务停止... ($i/10)${NC}"
                sleep 1
            done
            
            # 如果还没停止，强制停止
            if kill -0 $PID 2>/dev/null; then
                echo -e "${RED}💥 优雅停止超时，强制停止服务...${NC}"
                kill -9 $PID
            fi
        fi
        
        # 验证进程是否已停止
        if ! kill -0 $PID 2>/dev/null; then
            echo -e "${GREEN}✅ 服务已停止 (PID: $PID)${NC}"
        else
            echo -e "${RED}❌ 服务停止失败 (PID: $PID)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  PID 文件存在但进程不存在，清理 PID 文件${NC}"
    fi
    rm -f server.pid
fi

# 检查端口占用并停止
PORT=$(grep "^PORT=" .env 2>/dev/null | cut -d '=' -f2 | tr -d ' ')
PORT=${PORT:-3001}

PIDS=$(lsof -ti:$PORT 2>/dev/null)
if [ ! -z "$PIDS" ]; then
    echo -e "${YELLOW}🔍 发现端口 $PORT 上的进程: $PIDS${NC}"
    RUNNING=true
    
    for PID in $PIDS; do
        PROCESS_INFO=$(ps -p $PID -o comm= 2>/dev/null)
        echo -e "${YELLOW}📋 停止进程: $PID ($PROCESS_INFO)${NC}"
        
        if [ "$FORCE" = "force" ]; then
            kill -9 $PID 2>/dev/null
        else
            kill $PID 2>/dev/null
            sleep 1
            if kill -0 $PID 2>/dev/null; then
                kill -9 $PID 2>/dev/null
            fi
        fi
    done
    
    # 验证端口是否已释放
    sleep 1
    if ! lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✅ 端口 $PORT 已释放${NC}"
    else
        echo -e "${RED}❌ 端口 $PORT 仍被占用${NC}"
    fi
fi

# 停止 PM2 进程（如果使用 PM2）
if command -v pm2 &> /dev/null; then
    PM2_PROCESSES=$(pm2 list | grep -E "(inkybean|cobean)" | wc -l)
    if [ $PM2_PROCESSES -gt 0 ]; then
        echo -e "${YELLOW}🔄 停止 PM2 进程...${NC}"
        pm2 stop all 2>/dev/null
        pm2 delete all 2>/dev/null
        RUNNING=true
        echo -e "${GREEN}✅ PM2 进程已停止${NC}"
    fi
fi

# 查找并停止相关的 Node.js 进程
NODE_PIDS=$(pgrep -f "node.*index.js\|npm.*start\|nodemon" 2>/dev/null)
if [ ! -z "$NODE_PIDS" ]; then
    echo -e "${YELLOW}🔍 发现相关 Node.js 进程: $NODE_PIDS${NC}"
    RUNNING=true
    
    for PID in $NODE_PIDS; do
        PROCESS_CMD=$(ps -p $PID -o args= 2>/dev/null)
        if [[ $PROCESS_CMD == *"InkyBean"* ]] || [[ $PROCESS_CMD == *"cobean"* ]] || [[ $PROCESS_CMD == *"index.js"* ]]; then
            echo -e "${YELLOW}📋 停止相关进程: $PID${NC}"
            echo -e "${YELLOW}   命令: $PROCESS_CMD${NC}"
            
            if [ "$FORCE" = "force" ]; then
                kill -9 $PID 2>/dev/null
            else
                kill $PID 2>/dev/null
            fi
        fi
    done
fi

if [ "$RUNNING" = false ]; then
    echo -e "${YELLOW}ℹ️  没有发现运行中的服务${NC}"
else
    echo -e "${GREEN}✅ 服务停止操作完成${NC}"
fi

echo -e "${BLUE}================================${NC}"
echo -e "${YELLOW}💡 使用以下命令管理服务:${NC}"
echo -e "${YELLOW}   启动服务: ./start.sh${NC}"
echo -e "${YELLOW}   查看状态: ./status.sh${NC}"
echo -e "${YELLOW}   重启服务: ./restart.sh${NC}"
echo -e "${YELLOW}   强制停止: ./stop.sh force${NC}"