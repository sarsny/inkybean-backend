#!/bin/bash

# Cobean iOS Backend 部署脚本
# 用于从GitHub拉取代码并部署到生产服务器

set -e  # 遇到错误立即退出

# 配置变量
PROJECT_NAME="cobean-backend"
REPO_URL="https://github.com/your-username/cobean-ios-backend.git"  # 请替换为实际的仓库地址
DEPLOY_DIR="/var/www/cobean-backend"
BACKUP_DIR="/var/backups/cobean-backend"
SERVICE_NAME="cobean-backend"
NODE_VERSION="18"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "建议不要使用root用户运行此脚本"
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 检查必要的工具
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查git
    if ! command -v git &> /dev/null; then
        log_error "Git 未安装，请先安装 Git"
        exit 1
    fi
    
    # 检查node
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js ${NODE_VERSION}+"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    # 检查pm2
    if ! command -v pm2 &> /dev/null; then
        log_warning "PM2 未安装，将自动安装..."
        npm install -g pm2
    fi
    
    log_success "依赖检查完成"
}

# 创建备份
create_backup() {
    if [ -d "$DEPLOY_DIR" ]; then
        log_info "创建当前版本备份..."
        
        # 创建备份目录
        mkdir -p "$BACKUP_DIR"
        
        # 创建时间戳
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"
        
        # 复制当前版本
        cp -r "$DEPLOY_DIR" "$BACKUP_PATH"
        
        # 保留最近5个备份
        cd "$BACKUP_DIR"
        ls -t | tail -n +6 | xargs -r rm -rf
        
        log_success "备份创建完成: $BACKUP_PATH"
    fi
}

# 拉取最新代码
pull_code() {
    log_info "拉取最新代码..."
    
    if [ -d "$DEPLOY_DIR" ]; then
        cd "$DEPLOY_DIR"
        
        # 检查是否有未提交的更改
        if [ -n "$(git status --porcelain)" ]; then
            log_warning "检测到未提交的更改，将被重置"
            git reset --hard HEAD
            git clean -fd
        fi
        
        # 拉取最新代码
        git fetch origin
        git reset --hard origin/main
        
        log_success "代码更新完成"
    else
        log_info "首次部署，克隆仓库..."
        
        # 创建部署目录的父目录
        mkdir -p "$(dirname "$DEPLOY_DIR")"
        
        # 克隆仓库
        git clone "$REPO_URL" "$DEPLOY_DIR"
        cd "$DEPLOY_DIR"
        
        log_success "代码克隆完成"
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    cd "$DEPLOY_DIR"
    
    # 清理npm缓存
    npm cache clean --force
    
    # 删除node_modules和package-lock.json（可选）
    if [ "$1" = "--clean" ]; then
        log_info "清理现有依赖..."
        rm -rf node_modules package-lock.json
    fi
    
    # 安装依赖
    npm ci --production
    
    log_success "依赖安装完成"
}

# 配置环境变量
setup_environment() {
    log_info "配置环境变量..."
    
    cd "$DEPLOY_DIR"
    
    # 检查生产环境配置文件
    if [ ! -f ".env.production" ]; then
        log_error "未找到 .env.production 文件，请先创建生产环境配置"
        exit 1
    fi
    
    # 复制生产环境配置
    cp .env.production .env
    
    log_success "环境变量配置完成"
}

# 运行数据库迁移
run_migrations() {
    log_info "运行数据库迁移..."
    
    cd "$DEPLOY_DIR"
    
    # 如果有迁移脚本，在这里运行
    if [ -f "migrations/migrate.js" ]; then
        node migrations/migrate.js
        log_success "数据库迁移完成"
    else
        log_warning "未找到迁移脚本，跳过数据库迁移"
    fi
}

# 构建项目（如果需要）
build_project() {
    log_info "构建项目..."
    
    cd "$DEPLOY_DIR"
    
    # 如果有构建脚本
    if npm run build --if-present; then
        log_success "项目构建完成"
    else
        log_info "无需构建，跳过构建步骤"
    fi
}

# 启动服务
start_service() {
    log_info "启动服务..."
    
    cd "$DEPLOY_DIR"
    
    # 停止现有服务
    if pm2 describe "$SERVICE_NAME" > /dev/null 2>&1; then
        log_info "停止现有服务..."
        pm2 stop "$SERVICE_NAME"
        pm2 delete "$SERVICE_NAME"
    fi
    
    # 启动新服务
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js
    else
        pm2 start index.js --name "$SERVICE_NAME" --env production
    fi
    
    # 保存PM2配置
    pm2 save
    
    log_success "服务启动完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 等待服务启动
    sleep 5
    
    # 检查服务状态
    if pm2 describe "$SERVICE_NAME" | grep -q "online"; then
        log_success "服务运行正常"
        
        # 检查HTTP响应（如果配置了健康检查端点）
        if command -v curl &> /dev/null; then
            if curl -f http://localhost:3000/health > /dev/null 2>&1; then
                log_success "HTTP健康检查通过"
            else
                log_warning "HTTP健康检查失败，请检查服务配置"
            fi
        fi
    else
        log_error "服务启动失败"
        pm2 logs "$SERVICE_NAME" --lines 20
        exit 1
    fi
}

# 清理旧备份
cleanup() {
    log_info "清理旧备份..."
    
    if [ -d "$BACKUP_DIR" ]; then
        # 删除7天前的备份
        find "$BACKUP_DIR" -type d -name "backup_*" -mtime +7 -exec rm -rf {} +
        log_success "清理完成"
    fi
}

# 回滚函数
rollback() {
    log_warning "开始回滚到上一个版本..."
    
    # 找到最新的备份
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -n 1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        log_error "未找到备份，无法回滚"
        exit 1
    fi
    
    # 停止当前服务
    pm2 stop "$SERVICE_NAME" || true
    
    # 恢复备份
    rm -rf "$DEPLOY_DIR"
    cp -r "$BACKUP_DIR/$LATEST_BACKUP" "$DEPLOY_DIR"
    
    # 重启服务
    cd "$DEPLOY_DIR"
    pm2 start ecosystem.config.js || pm2 start index.js --name "$SERVICE_NAME"
    
    log_success "回滚完成"
}

# 显示帮助信息
show_help() {
    echo "Cobean Backend 部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  deploy          执行完整部署流程"
    echo "  rollback        回滚到上一个版本"
    echo "  --clean         清理依赖后重新安装"
    echo "  --help          显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 deploy              # 标准部署"
    echo "  $0 deploy --clean      # 清理依赖后部署"
    echo "  $0 rollback            # 回滚到上一版本"
}

# 主函数
main() {
    log_info "开始 Cobean Backend 部署流程..."
    
    case "${1:-deploy}" in
        "deploy")
            check_root
            check_dependencies
            create_backup
            pull_code
            
            if [ "$2" = "--clean" ]; then
                install_dependencies --clean
            else
                install_dependencies
            fi
            
            setup_environment
            run_migrations
            build_project
            start_service
            health_check
            cleanup
            
            log_success "🎉 部署完成！"
            log_info "服务状态: pm2 status"
            log_info "查看日志: pm2 logs $SERVICE_NAME"
            ;;
        "rollback")
            rollback
            ;;
        "--help"|"help")
            show_help
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 捕获错误并提供回滚选项
trap 'log_error "部署失败！"; read -p "是否回滚到上一版本? (y/N): " -n 1 -r; echo; if [[ $REPLY =~ ^[Yy]$ ]]; then rollback; fi' ERR

# 执行主函数
main "$@"