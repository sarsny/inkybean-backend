#!/bin/bash

# PM2 进程管理脚本
# 用法: ./pm2-start.sh [production|development] [start|stop|restart|status|logs]

set -e

# 默认参数
ENV=${1:-production}
ACTION=${2:-start}

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# 检查PM2是否安装
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 未安装，请先安装: npm install -g pm2"
        exit 1
    fi
}

# 启动服务
start_service() {
    log_info "启动 InkyBean 后端服务 (环境: $ENV)"
    
    # 检查是否已经在运行
    if pm2 list | grep -q "inkybean-backend"; then
        log_warn "服务已在运行，将重启服务"
        pm2 restart inkybean-backend --env $ENV
    else
        pm2 start ecosystem.config.js --env $ENV
    fi
    
    # 保存PM2配置
    pm2 save
    
    log_info "服务启动完成"
    show_status
}

# 停止服务
stop_service() {
    log_info "停止 InkyBean 后端服务"
    
    if pm2 list | grep -q "inkybean-backend"; then
        pm2 stop inkybean-backend
        pm2 delete inkybean-backend
        log_info "服务已停止"
    else
        log_warn "服务未在运行"
    fi
}

# 重启服务
restart_service() {
    log_info "重启 InkyBean 后端服务 (环境: $ENV)"
    
    if pm2 list | grep -q "inkybean-backend"; then
        pm2 restart inkybean-backend --env $ENV
    else
        log_warn "服务未在运行，将启动新实例"
        pm2 start ecosystem.config.js --env $ENV
    fi
    
    pm2 save
    log_info "服务重启完成"
    show_status
}

# 显示状态
show_status() {
    log_info "=== PM2 进程状态 ==="
    pm2 list
    
    echo ""
    log_info "=== 服务详细信息 ==="
    if pm2 list | grep -q "inkybean-backend"; then
        pm2 show inkybean-backend
    else
        log_warn "服务未在运行"
    fi
}

# 显示日志
show_logs() {
    log_info "显示服务日志 (按 Ctrl+C 退出)"
    if pm2 list | grep -q "inkybean-backend"; then
        pm2 logs inkybean-backend --lines 50
    else
        log_error "服务未在运行"
        exit 1
    fi
}

# 监控服务
monitor_service() {
    log_info "启动 PM2 监控面板"
    pm2 monit
}

# 显示帮助
show_help() {
    echo "PM2 进程管理脚本"
    echo ""
    echo "用法: $0 [环境] [操作]"
    echo ""
    echo "环境:"
    echo "  production   生产环境 (默认)"
    echo "  development  开发环境"
    echo ""
    echo "操作:"
    echo "  start        启动服务 (默认)"
    echo "  stop         停止服务"
    echo "  restart      重启服务"
    echo "  status       显示状态"
    echo "  logs         显示日志"
    echo "  monitor      监控面板"
    echo "  help         显示帮助"
    echo ""
    echo "示例:"
    echo "  $0                          # 启动生产环境"
    echo "  $0 development start        # 启动开发环境"
    echo "  $0 production restart       # 重启生产环境"
    echo "  $0 production logs          # 查看生产环境日志"
}

# 主函数
main() {
    check_pm2
    
    case $ACTION in
        start)
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        monitor)
            monitor_service
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知操作: $ACTION"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"