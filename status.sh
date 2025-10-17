#!/bin/bash

# InkyBean Backend Service 状态检查脚本
# 使用方法: ./status.sh [详细信息: -v|--verbose]

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查是否需要详细信息
VERBOSE=false
if [[ "$1" == "-v" || "$1" == "--verbose" ]]; then
    VERBOSE=true
fi

echo -e "${BLUE}📊 InkyBean Backend Service 状态检查${NC}"
echo -e "${BLUE}================================${NC}"

# 获取配置信息
PORT=$(grep "^PORT=" .env 2>/dev/null | cut -d '=' -f2 | tr -d ' ')
PORT=${PORT:-3001}
NODE_ENV=$(grep "^NODE_ENV=" .env 2>/dev/null | cut -d '=' -f2 | tr -d ' ')
NODE_ENV=${NODE_ENV:-development}

echo -e "${CYAN}🔧 配置信息:${NC}"
echo -e "   端口: ${YELLOW}$PORT${NC}"
echo -e "   环境: ${YELLOW}$NODE_ENV${NC}"
echo -e "   目录: ${YELLOW}$SCRIPT_DIR${NC}"
echo ""

# 检查服务状态
SERVICE_RUNNING=false
PID_FROM_FILE=""
ACTUAL_PIDS=""

# 1. 检查 PID 文件
if [ -f "server.pid" ]; then
    PID_FROM_FILE=$(cat server.pid)
    if kill -0 $PID_FROM_FILE 2>/dev/null; then
        echo -e "${GREEN}✅ 服务运行中 (PID 文件)${NC}"
        echo -e "   PID: ${YELLOW}$PID_FROM_FILE${NC}"
        SERVICE_RUNNING=true
        
        if [ "$VERBOSE" = true ]; then
            PROCESS_INFO=$(ps -p $PID_FROM_FILE -o pid,ppid,cmd,etime,pcpu,pmem --no-headers 2>/dev/null)
            if [ ! -z "$PROCESS_INFO" ]; then
                echo -e "   进程信息: ${CYAN}$PROCESS_INFO${NC}"
            fi
        fi
    else
        echo -e "${RED}❌ PID 文件存在但进程不存在${NC}"
        echo -e "   无效 PID: ${YELLOW}$PID_FROM_FILE${NC}"
        echo -e "${YELLOW}   建议清理 PID 文件: rm server.pid${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  未找到 PID 文件${NC}"
fi

# 2. 检查端口占用
PIDS=$(lsof -ti:$PORT 2>/dev/null)
if [ ! -z "$PIDS" ]; then
    echo -e "${GREEN}✅ 端口 $PORT 正在使用${NC}"
    ACTUAL_PIDS=$PIDS
    SERVICE_RUNNING=true
    
    for PID in $PIDS; do
        PROCESS_INFO=$(ps -p $PID -o comm= 2>/dev/null)
        USER_INFO=$(ps -p $PID -o user= 2>/dev/null)
        echo -e "   PID: ${YELLOW}$PID${NC} | 进程: ${CYAN}$PROCESS_INFO${NC} | 用户: ${CYAN}$USER_INFO${NC}"
        
        if [ "$VERBOSE" = true ]; then
            FULL_CMD=$(ps -p $PID -o args= 2>/dev/null)
            echo -e "   完整命令: ${CYAN}$FULL_CMD${NC}"
        fi
    done
else
    echo -e "${RED}❌ 端口 $PORT 未被占用${NC}"
fi

echo ""

# 3. 检查健康状态
echo -e "${CYAN}🏥 健康检查:${NC}"
HEALTH_URL="http://localhost:$PORT/health"

if command -v curl &> /dev/null; then
    HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$HEALTH_URL" 2>/dev/null)
    HTTP_CODE="${HEALTH_RESPONSE: -3}"
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ 健康检查通过${NC}"
        echo -e "   URL: ${YELLOW}$HEALTH_URL${NC}"
        echo -e "   状态码: ${GREEN}$HTTP_CODE${NC}"
        
        if [ "$VERBOSE" = true ] && [ -f "/tmp/health_response.json" ]; then
            HEALTH_DATA=$(cat /tmp/health_response.json 2>/dev/null)
            if [ ! -z "$HEALTH_DATA" ]; then
                echo -e "   响应: ${CYAN}$HEALTH_DATA${NC}"
            fi
        fi
        rm -f /tmp/health_response.json
    else
        echo -e "${RED}❌ 健康检查失败${NC}"
        echo -e "   URL: ${YELLOW}$HEALTH_URL${NC}"
        echo -e "   状态码: ${RED}$HTTP_CODE${NC}"
        rm -f /tmp/health_response.json
    fi
else
    echo -e "${YELLOW}⚠️  curl 未安装，跳过健康检查${NC}"
fi

echo ""

# 4. 检查日志文件
echo -e "${CYAN}📋 日志文件状态:${NC}"
if [ -d "logs" ]; then
    for log_file in logs/*.log; do
        if [ -f "$log_file" ]; then
            file_size=$(du -h "$log_file" | cut -f1)
            last_modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$log_file" 2>/dev/null || stat -c "%y" "$log_file" 2>/dev/null | cut -d'.' -f1)
            echo -e "   ${YELLOW}$(basename "$log_file")${NC}: ${CYAN}$file_size${NC} (最后修改: ${CYAN}$last_modified${NC})"
        fi
    done
else
    echo -e "${YELLOW}⚠️  日志目录不存在${NC}"
fi

echo ""

# 5. 系统资源使用情况
if [ "$VERBOSE" = true ]; then
    echo -e "${CYAN}💻 系统资源:${NC}"
    
    # CPU 使用率
    if command -v top &> /dev/null; then
        CPU_USAGE=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' 2>/dev/null)
        if [ ! -z "$CPU_USAGE" ]; then
            echo -e "   CPU 使用率: ${YELLOW}$CPU_USAGE%${NC}"
        fi
    fi
    
    # 内存使用情况
    if command -v free &> /dev/null; then
        MEMORY_INFO=$(free -h | grep "Mem:" | awk '{print "已用: "$3" / 总计: "$2" ("$3/$2*100"%)"}')
        echo -e "   内存: ${YELLOW}$MEMORY_INFO${NC}"
    elif command -v vm_stat &> /dev/null; then
        # macOS 系统
        MEMORY_PRESSURE=$(memory_pressure 2>/dev/null | grep "System-wide memory free percentage" | awk '{print $5}' | sed 's/%//')
        if [ ! -z "$MEMORY_PRESSURE" ]; then
            echo -e "   内存可用: ${YELLOW}$MEMORY_PRESSURE%${NC}"
        fi
    fi
    
    # 磁盘使用情况
    DISK_USAGE=$(df -h . | tail -1 | awk '{print $5}')
    echo -e "   磁盘使用率: ${YELLOW}$DISK_USAGE${NC}"
    
    echo ""
fi

# 6. PM2 状态（如果使用）
if command -v pm2 &> /dev/null; then
    PM2_LIST=$(pm2 list 2>/dev/null | grep -E "(inkybean|cobean)")
    if [ ! -z "$PM2_LIST" ]; then
        echo -e "${CYAN}🔄 PM2 进程:${NC}"
        echo -e "${CYAN}$PM2_LIST${NC}"
        echo ""
    fi
fi

# 7. 网络连接状态
if [ "$VERBOSE" = true ]; then
    echo -e "${CYAN}🌐 网络连接:${NC}"
    CONNECTIONS=$(netstat -an 2>/dev/null | grep ":$PORT " | wc -l | tr -d ' ')
    echo -e "   端口 $PORT 连接数: ${YELLOW}$CONNECTIONS${NC}"
    
    if [ $CONNECTIONS -gt 0 ]; then
        echo -e "   活跃连接:"
        netstat -an 2>/dev/null | grep ":$PORT " | head -5 | while read line; do
            echo -e "     ${CYAN}$line${NC}"
        done
    fi
    echo ""
fi

# 总结状态
echo -e "${BLUE}================================${NC}"
if [ "$SERVICE_RUNNING" = true ]; then
    echo -e "${GREEN}🎉 服务状态: 运行中${NC}"
    echo -e "${GREEN}📍 访问地址: http://localhost:$PORT${NC}"
else
    echo -e "${RED}💔 服务状态: 未运行${NC}"
    echo -e "${YELLOW}💡 启动服务: ./start.sh${NC}"
fi

echo -e "${BLUE}================================${NC}"
echo -e "${YELLOW}💡 可用命令:${NC}"
echo -e "${YELLOW}   启动服务: ./start.sh [dev|prod]${NC}"
echo -e "${YELLOW}   停止服务: ./stop.sh [force]${NC}"
echo -e "${YELLOW}   重启服务: ./restart.sh${NC}"
echo -e "${YELLOW}   查看日志: ./logs.sh${NC}"
echo -e "${YELLOW}   详细状态: ./status.sh -v${NC}"