#!/bin/bash

# InkyBean Backend Service 重启脚本
# 使用方法: ./restart.sh [环境: dev|prod] [选项: --force]

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

# 解析参数
ENVIRONMENT="dev"
FORCE_STOP=false

for arg in "$@"; do
    case $arg in
        dev|development)
            ENVIRONMENT="dev"
            ;;
        prod|production)
            ENVIRONMENT="prod"
            ;;
        --force|-f)
            FORCE_STOP=true
            ;;
        --help|-h)
            echo -e "${BLUE}InkyBean Backend Service 重启脚本${NC}"
            echo -e "${BLUE}================================${NC}"
            echo ""
            echo -e "${YELLOW}使用方法:${NC}"
            echo -e "  ./restart.sh [环境] [选项]"
            echo ""
            echo -e "${YELLOW}环境参数:${NC}"
            echo -e "  dev, development  - 开发环境 (默认)"
            echo -e "  prod, production  - 生产环境"
            echo ""
            echo -e "${YELLOW}选项:${NC}"
            echo -e "  --force, -f       - 强制停止服务"
            echo -e "  --help, -h        - 显示帮助信息"
            echo ""
            echo -e "${YELLOW}示例:${NC}"
            echo -e "  ./restart.sh              # 重启开发环境"
            echo -e "  ./restart.sh prod         # 重启生产环境"
            echo -e "  ./restart.sh dev --force  # 强制重启开发环境"
            exit 0
            ;;
    esac
done

echo -e "${BLUE}🔄 InkyBean Backend Service 重启${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "${CYAN}环境: ${YELLOW}$ENVIRONMENT${NC}"
if [ "$FORCE_STOP" = true ]; then
    echo -e "${CYAN}模式: ${YELLOW}强制重启${NC}"
else
    echo -e "${CYAN}模式: ${YELLOW}优雅重启${NC}"
fi
echo ""

# 检查必要文件
if [ ! -f "stop.sh" ]; then
    echo -e "${RED}❌ 错误: 找不到 stop.sh 脚本${NC}"
    exit 1
fi

if [ ! -f "start.sh" ]; then
    echo -e "${RED}❌ 错误: 找不到 start.sh 脚本${NC}"
    exit 1
fi

# 确保脚本有执行权限
chmod +x stop.sh start.sh

# 步骤 1: 停止服务
echo -e "${YELLOW}📍 步骤 1/3: 停止当前服务${NC}"
echo -e "${CYAN}执行: ./stop.sh${NC}"

if [ "$FORCE_STOP" = true ]; then
    ./stop.sh force
else
    ./stop.sh
fi

STOP_EXIT_CODE=$?
echo ""

# 检查停止是否成功
if [ $STOP_EXIT_CODE -ne 0 ]; then
    echo -e "${YELLOW}⚠️  停止脚本返回非零退出码: $STOP_EXIT_CODE${NC}"
    echo -e "${YELLOW}⚠️  继续执行重启流程...${NC}"
fi

# 步骤 2: 等待一段时间确保服务完全停止
echo -e "${YELLOW}📍 步骤 2/3: 等待服务完全停止${NC}"
echo -e "${CYAN}等待 3 秒...${NC}"
sleep 3

# 验证服务是否真的停止了
PORT=$(grep "^PORT=" .env 2>/dev/null | cut -d '=' -f2 | tr -d ' ')
PORT=${PORT:-3001}

REMAINING_PIDS=$(lsof -ti:$PORT 2>/dev/null)
if [ ! -z "$REMAINING_PIDS" ]; then
    echo -e "${YELLOW}⚠️  检测到端口 $PORT 仍被占用${NC}"
    echo -e "${YELLOW}   PID: $REMAINING_PIDS${NC}"
    
    if [ "$FORCE_STOP" = true ]; then
        echo -e "${YELLOW}   强制终止残留进程...${NC}"
        for PID in $REMAINING_PIDS; do
            kill -9 $PID 2>/dev/null
            echo -e "${YELLOW}   已终止 PID: $PID${NC}"
        done
        sleep 1
    else
        echo -e "${YELLOW}   建议使用 --force 选项强制重启${NC}"
    fi
fi

echo ""

# 步骤 3: 启动服务
echo -e "${YELLOW}📍 步骤 3/3: 启动服务${NC}"
echo -e "${CYAN}执行: ./start.sh $ENVIRONMENT${NC}"

./start.sh "$ENVIRONMENT"
START_EXIT_CODE=$?

echo ""

# 检查重启结果
if [ $START_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}🎉 重启成功!${NC}"
    echo -e "${GREEN}================================${NC}"
    
    # 显示服务信息
    echo -e "${CYAN}📍 服务信息:${NC}"
    echo -e "   环境: ${YELLOW}$ENVIRONMENT${NC}"
    echo -e "   端口: ${YELLOW}$PORT${NC}"
    echo -e "   访问地址: ${YELLOW}http://localhost:$PORT${NC}"
    echo -e "   健康检查: ${YELLOW}http://localhost:$PORT/health${NC}"
    
    # 显示进程信息
    if [ -f "server.pid" ]; then
        PID=$(cat server.pid)
        echo -e "   进程 ID: ${YELLOW}$PID${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}💡 管理命令:${NC}"
    echo -e "${YELLOW}   查看状态: ./status.sh${NC}"
    echo -e "${YELLOW}   查看日志: ./logs.sh${NC}"
    echo -e "${YELLOW}   停止服务: ./stop.sh${NC}"
    
    # 等待几秒后进行健康检查
    echo ""
    echo -e "${CYAN}🏥 执行健康检查...${NC}"
    sleep 2
    
    if command -v curl &> /dev/null; then
        HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:$PORT/health" 2>/dev/null)
        if [ "$HEALTH_RESPONSE" = "200" ]; then
            echo -e "${GREEN}✅ 健康检查通过 - 服务运行正常${NC}"
        else
            echo -e "${YELLOW}⚠️  健康检查失败 (状态码: $HEALTH_RESPONSE)${NC}"
            echo -e "${YELLOW}   请检查服务日志: ./logs.sh${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  curl 未安装，跳过健康检查${NC}"
    fi
    
else
    echo -e "${RED}❌ 重启失败!${NC}"
    echo -e "${RED}================================${NC}"
    echo -e "${YELLOW}启动脚本退出码: $START_EXIT_CODE${NC}"
    echo ""
    echo -e "${YELLOW}💡 故障排除:${NC}"
    echo -e "${YELLOW}   1. 检查日志: ./logs.sh${NC}"
    echo -e "${YELLOW}   2. 检查状态: ./status.sh -v${NC}"
    echo -e "${YELLOW}   3. 手动启动: ./start.sh $ENVIRONMENT${NC}"
    echo -e "${YELLOW}   4. 强制重启: ./restart.sh $ENVIRONMENT --force${NC}"
    
    exit 1
fi