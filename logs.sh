#!/bin/bash

# InkyBean Backend Service 日志查看脚本
# 使用方法: ./logs.sh [选项] [日志类型]

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 默认参数
LOG_TYPE="combined"
LINES=50
FOLLOW=false
SEARCH_TERM=""
SHOW_HELP=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -n|--lines)
            LINES="$2"
            shift 2
            ;;
        -s|--search)
            SEARCH_TERM="$2"
            shift 2
            ;;
        -h|--help)
            SHOW_HELP=true
            shift
            ;;
        combined|error|out|access)
            LOG_TYPE="$1"
            shift
            ;;
        *)
            # 如果是数字，当作行数处理
            if [[ "$1" =~ ^[0-9]+$ ]]; then
                LINES="$1"
            else
                echo -e "${RED}❌ 未知参数: $1${NC}"
                SHOW_HELP=true
            fi
            shift
            ;;
    esac
done

# 显示帮助信息
if [ "$SHOW_HELP" = true ]; then
    echo -e "${BLUE}InkyBean Backend Service 日志查看脚本${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
    echo -e "${YELLOW}使用方法:${NC}"
    echo -e "  ./logs.sh [选项] [日志类型]"
    echo ""
    echo -e "${YELLOW}日志类型:${NC}"
    echo -e "  combined    - 综合日志 (默认)"
    echo -e "  error       - 错误日志"
    echo -e "  out         - 输出日志"
    echo -e "  access      - 访问日志 (如果存在)"
    echo ""
    echo -e "${YELLOW}选项:${NC}"
    echo -e "  -f, --follow        - 实时跟踪日志"
    echo -e "  -n, --lines NUM     - 显示最后 NUM 行 (默认: 50)"
    echo -e "  -s, --search TERM   - 搜索包含指定内容的日志"
    echo -e "  -h, --help          - 显示帮助信息"
    echo ""
    echo -e "${YELLOW}示例:${NC}"
    echo -e "  ./logs.sh                    # 查看最后50行综合日志"
    echo -e "  ./logs.sh -f                 # 实时跟踪综合日志"
    echo -e "  ./logs.sh error -n 100       # 查看最后100行错误日志"
    echo -e "  ./logs.sh -s \"ERROR\"         # 搜索包含ERROR的日志"
    echo -e "  ./logs.sh -f error           # 实时跟踪错误日志"
    echo -e "  ./logs.sh 200                # 查看最后200行日志"
    echo ""
    echo -e "${YELLOW}快捷键 (实时模式):${NC}"
    echo -e "  Ctrl+C              - 退出实时跟踪"
    echo -e "  Ctrl+Z              - 暂停/后台运行"
    exit 0
fi

echo -e "${BLUE}📋 InkyBean Backend Service 日志查看${NC}"
echo -e "${BLUE}================================${NC}"

# 检查日志目录
if [ ! -d "logs" ]; then
    echo -e "${RED}❌ 日志目录不存在: logs/${NC}"
    echo -e "${YELLOW}💡 请确保服务已启动并创建了日志文件${NC}"
    exit 1
fi

# 确定日志文件路径
case $LOG_TYPE in
    combined)
        LOG_FILE="logs/combined.log"
        LOG_NAME="综合日志"
        ;;
    error)
        LOG_FILE="logs/error.log"
        LOG_NAME="错误日志"
        ;;
    out)
        LOG_FILE="logs/out.log"
        LOG_NAME="输出日志"
        ;;
    access)
        LOG_FILE="logs/access.log"
        LOG_NAME="访问日志"
        ;;
    *)
        echo -e "${RED}❌ 未知的日志类型: $LOG_TYPE${NC}"
        exit 1
        ;;
esac

# 检查日志文件是否存在
if [ ! -f "$LOG_FILE" ]; then
    echo -e "${RED}❌ 日志文件不存在: $LOG_FILE${NC}"
    echo -e "${YELLOW}💡 可用的日志文件:${NC}"
    for file in logs/*.log; do
        if [ -f "$file" ]; then
            file_size=$(du -h "$file" | cut -f1)
            echo -e "   ${CYAN}$(basename "$file")${NC} (${YELLOW}$file_size${NC})"
        fi
    done
    exit 1
fi

# 获取文件信息
FILE_SIZE=$(du -h "$LOG_FILE" | cut -f1)
LAST_MODIFIED=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$LOG_FILE" 2>/dev/null || stat -c "%y" "$LOG_FILE" 2>/dev/null | cut -d'.' -f1)
TOTAL_LINES=$(wc -l < "$LOG_FILE" 2>/dev/null || echo "0")

echo -e "${CYAN}📄 日志文件: ${YELLOW}$LOG_NAME${NC}"
echo -e "${CYAN}📁 文件路径: ${YELLOW}$LOG_FILE${NC}"
echo -e "${CYAN}📊 文件大小: ${YELLOW}$FILE_SIZE${NC}"
echo -e "${CYAN}🕒 最后修改: ${YELLOW}$LAST_MODIFIED${NC}"
echo -e "${CYAN}📏 总行数: ${YELLOW}$TOTAL_LINES${NC}"

if [ ! -z "$SEARCH_TERM" ]; then
    echo -e "${CYAN}🔍 搜索词: ${YELLOW}$SEARCH_TERM${NC}"
fi

if [ "$FOLLOW" = true ]; then
    echo -e "${CYAN}👁️  模式: ${YELLOW}实时跟踪${NC}"
else
    echo -e "${CYAN}📖 显示行数: ${YELLOW}$LINES${NC}"
fi

echo -e "${BLUE}================================${NC}"

# 添加颜色高亮函数
colorize_logs() {
    while IFS= read -r line; do
        # 时间戳高亮 (ISO 8601 格式)
        line=$(echo "$line" | sed -E "s/([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z)/$(printf "${CYAN}")\\1$(printf "${NC}")/g")
        
        # 日志级别高亮
        line=$(echo "$line" | sed -E "s/(ERROR|FATAL)/$(printf "${RED}")\\1$(printf "${NC}")/g")
        line=$(echo "$line" | sed -E "s/(WARN|WARNING)/$(printf "${YELLOW}")\\1$(printf "${NC}")/g")
        line=$(echo "$line" | sed -E "s/(INFO)/$(printf "${GREEN}")\\1$(printf "${NC}")/g")
        line=$(echo "$line" | sed -E "s/(DEBUG)/$(printf "${BLUE}")\\1$(printf "${NC}")/g")
        
        # HTTP 状态码高亮
        line=$(echo "$line" | sed -E "s/([2][0-9]{2})/$(printf "${GREEN}")\\1$(printf "${NC}")/g")  # 2xx 成功
        line=$(echo "$line" | sed -E "s/([4][0-9]{2})/$(printf "${YELLOW}")\\1$(printf "${NC}")/g") # 4xx 客户端错误
        line=$(echo "$line" | sed -E "s/([5][0-9]{2})/$(printf "${RED}")\\1$(printf "${NC}")/g")    # 5xx 服务器错误
        
        # IP 地址高亮
        line=$(echo "$line" | sed -E "s/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/$(printf "${PURPLE}")\\1$(printf "${NC}")/g")
        
        # 搜索词高亮
        if [ ! -z "$SEARCH_TERM" ]; then
            line=$(echo "$line" | sed -E "s/($SEARCH_TERM)/$(printf "${YELLOW}${RED}")\\1$(printf "${NC}")/gi")
        fi
        
        echo -e "$line"
    done
}

# 执行日志查看命令
if [ "$FOLLOW" = true ]; then
    echo -e "${GREEN}🔄 开始实时跟踪日志... (按 Ctrl+C 退出)${NC}"
    echo ""
    
    if [ ! -z "$SEARCH_TERM" ]; then
        tail -f "$LOG_FILE" | grep -i --line-buffered "$SEARCH_TERM" | colorize_logs
    else
        tail -f "$LOG_FILE" | colorize_logs
    fi
else
    if [ ! -z "$SEARCH_TERM" ]; then
        echo -e "${GREEN}🔍 搜索结果:${NC}"
        echo ""
        SEARCH_RESULTS=$(grep -i "$SEARCH_TERM" "$LOG_FILE" | tail -n "$LINES")
        if [ -z "$SEARCH_RESULTS" ]; then
            echo -e "${YELLOW}⚠️  未找到包含 '$SEARCH_TERM' 的日志条目${NC}"
        else
            RESULT_COUNT=$(grep -i "$SEARCH_TERM" "$LOG_FILE" | wc -l | tr -d ' ')
            echo -e "${CYAN}找到 ${YELLOW}$RESULT_COUNT${CYAN} 条匹配记录，显示最后 ${YELLOW}$LINES${CYAN} 条:${NC}"
            echo ""
            echo "$SEARCH_RESULTS" | colorize_logs
        fi
    else
        echo -e "${GREEN}📖 最后 $LINES 行日志:${NC}"
        echo ""
        tail -n "$LINES" "$LOG_FILE" | colorize_logs
    fi
fi

# 如果不是实时模式，显示额外信息
if [ "$FOLLOW" = false ]; then
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${YELLOW}💡 更多选项:${NC}"
    echo -e "${YELLOW}   实时跟踪: ./logs.sh -f${NC}"
    echo -e "${YELLOW}   查看错误: ./logs.sh error${NC}"
    echo -e "${YELLOW}   搜索日志: ./logs.sh -s \"关键词\"${NC}"
    echo -e "${YELLOW}   更多行数: ./logs.sh -n 100${NC}"
    echo -e "${YELLOW}   查看帮助: ./logs.sh --help${NC}"
    
    # 显示其他可用的管理脚本
    echo ""
    echo -e "${YELLOW}🛠️  管理脚本:${NC}"
    echo -e "${YELLOW}   查看状态: ./status.sh${NC}"
    echo -e "${YELLOW}   启动服务: ./start.sh${NC}"
    echo -e "${YELLOW}   停止服务: ./stop.sh${NC}"
    echo -e "${YELLOW}   重启服务: ./restart.sh${NC}"
fi