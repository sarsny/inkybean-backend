#!/bin/bash

# Cobean iOS Backend 私有仓库部署脚本
# 专门用于部署私有GitHub仓库

set -e  # 遇到错误立即退出

# 配置变量
PROJECT_NAME="inkybean-backend"
DEPLOY_DIR="/var/www/inkybean-backend"
BACKUP_DIR="/var/backups/inkybean-backend"
SERVICE_NAME="inkybean-backend"
NODE_VERSION="18"

# GitHub 私有仓库配置
REPO_OWNER="sarsny"
REPO_NAME="inkybean-backend"

# 方法1: 使用 Personal Access Token (推荐)
# 在GitHub Settings > Developer settings > Personal access tokens 创建
# 需要 repo 权限
GITHUB_TOKEN="${GITHUB_TOKEN:-}"  # 从环境变量读取
REPO_URL_HTTPS="https://${GITHUB_TOKEN}@github.com/${REPO_OWNER}/${REPO_NAME}.git"

# 方法2: 使用 SSH Key
REPO_URL_SSH="git@github.com:${REPO_OWNER}/${REPO_NAME}.git"

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

# 检查认证方式
check_auth() {
    log_info "检查GitHub认证配置..."
    
    if [ -n "$GITHUB_TOKEN" ]; then
        log_info "检测到 Personal Access Token"
        EFFECTIVE_REPO_URL="$REPO_URL_HTTPS"
        AUTH_METHOD="token"
        return 0
    fi
    
    # 检查SSH密钥
    if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
        log_info "SSH密钥认证可用"
        EFFECTIVE_REPO_URL="$REPO_URL_SSH"
        AUTH_METHOD="ssh"
        return 0
    fi
    
    log_error "未找到有效的GitHub认证方式"
    echo "请选择以下方式之一："
    echo "1. 设置环境变量: export GITHUB_TOKEN=your_token_here"
    echo "2. 配置SSH密钥到GitHub账户"
    exit 1
}

# 拉取代码
pull_code() {
    log_info "拉取最新代码 (使用 $AUTH_METHOD 认证)..."
    
    if [ -d "$DEPLOY_DIR" ]; then
        cd "$DEPLOY_DIR"
        
        # 检查是否是Git仓库
        if [ ! -d ".git" ]; then
            log_error "部署目录存在但不是Git仓库，将重新克隆"
            cd ..
            rm -rf "$DEPLOY_DIR"
            git clone "$EFFECTIVE_REPO_URL" "$DEPLOY_DIR"
            cd "$DEPLOY_DIR"
            log_success "仓库重新克隆完成"
            return
        fi
        
        # 更新远程URL
        git remote set-url origin "$EFFECTIVE_REPO_URL"
        
        # 检查是否有未提交的更改
        if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
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
        git clone "$EFFECTIVE_REPO_URL" "$DEPLOY_DIR"
        cd "$DEPLOY_DIR"
        
        log_success "代码克隆完成"
    fi
}

# 显示使用说明
show_usage() {
    echo "InkyBean Backend 私有仓库部署脚本"
    echo ""
    echo "认证方式:"
    echo "  方法1 - Personal Access Token:"
    echo "    export GITHUB_TOKEN=your_token_here"
    echo "    ./deploy-private.sh deploy"
    echo ""
    echo "  方法2 - SSH Key:"
    echo "    ssh-keygen -t ed25519 -C 'your_email@example.com'"
    echo "    cat ~/.ssh/id_ed25519.pub  # 添加到GitHub SSH Keys"
    echo "    ./deploy-private.sh deploy"
    echo ""
    echo "用法: ./deploy-private.sh [选项]"
    echo ""
    echo "选项:"
    echo "  deploy          执行完整部署流程"
    echo "  check-auth      检查认证配置"
    echo "  --help          显示此帮助信息"
}

# 主函数
main() {
    case "${1:-}" in
        "deploy")
            check_auth
            pull_code
            log_success "InkyBean Backend 部署完成!"
            ;;
        "check-auth")
            check_auth
            log_success "认证配置正常"
            ;;
        "--help"|"help"|"")
            show_usage
            ;;
        *)
            log_error "未知选项: $1"
            show_usage
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"