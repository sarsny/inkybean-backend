# 私有GitHub仓库部署设置指南

## 概述

由于你的GitHub仓库设置为私有，服务器无法直接访问代码。本指南提供两种认证方式来解决这个问题。

## 🔐 认证方式

### 方法1: Personal Access Token (推荐)

#### 1.1 创建Personal Access Token

1. 登录GitHub，进入 **Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)**
2. 点击 **Generate new token** > **Generate new token (classic)**
3. 设置Token信息：
   - **Note**: `Cobean Backend Deployment`
   - **Expiration**: 选择合适的过期时间
   - **Scopes**: 勾选 `repo` (完整仓库访问权限)
4. 点击 **Generate token**
5. **重要**: 复制生成的token，离开页面后无法再次查看

#### 1.2 在服务器上使用Token

```bash
# 方式1: 设置环境变量 (推荐)
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
./deploy-private.sh deploy

# 方式2: 直接在脚本中设置
# 编辑 deploy.sh，取消注释并设置：
# GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
```

#### 1.3 永久设置环境变量

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
echo 'export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"' >> ~/.bashrc
source ~/.bashrc
```

### 方法2: SSH Key

#### 2.1 生成SSH密钥

```bash
# 在服务器上生成SSH密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

# 查看公钥
cat ~/.ssh/id_ed25519.pub
```

#### 2.2 添加SSH密钥到GitHub

1. 复制公钥内容
2. 登录GitHub，进入 **Settings** > **SSH and GPG keys**
3. 点击 **New SSH key**
4. 设置：
   - **Title**: `Cobean Server`
   - **Key**: 粘贴公钥内容
5. 点击 **Add SSH key**

#### 2.3 测试SSH连接

```bash
# 测试SSH连接
ssh -T git@github.com

# 应该看到类似输出：
# Hi sarsny! You've successfully authenticated, but GitHub does not provide shell access.
```

## 🚀 部署脚本使用

### 使用专用私有仓库脚本

```bash
# 检查认证配置
./deploy-private.sh check-auth

# 执行部署
./deploy-private.sh deploy

# 查看帮助
./deploy-private.sh --help
```

### 使用原始部署脚本

```bash
# 设置Token后使用原脚本
export GITHUB_TOKEN="your_token_here"
./deploy.sh deploy
```

## 📋 部署文件对比

| 文件 | 用途 | 特点 |
|------|------|------|
| `deploy.sh` | 通用部署脚本 | 支持公开和私有仓库，功能完整 |
| `deploy-private.sh` | 私有仓库专用 | 专门处理认证，简化配置 |

## 🔧 故障排除

### Token认证问题

```bash
# 检查Token是否设置
echo $GITHUB_TOKEN

# 测试Token权限
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# 测试仓库访问
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/repos/sarsny/inkybean-backend
```

### SSH认证问题

```bash
# 检查SSH密钥
ls -la ~/.ssh/

# 测试SSH连接（详细模式）
ssh -vT git@github.com

# 检查SSH配置
cat ~/.ssh/config
```

### 常见错误

1. **403 Forbidden**: Token权限不足或已过期
2. **Permission denied**: SSH密钥未正确配置
3. **Repository not found**: 仓库名称错误或无访问权限

## 🛡️ 安全建议

1. **Token安全**:
   - 定期更换Token
   - 使用最小权限原则
   - 不要在代码中硬编码Token

2. **SSH密钥安全**:
   - 使用强密码保护私钥
   - 定期轮换SSH密钥
   - 限制密钥访问权限

3. **服务器安全**:
   - 使用环境变量存储敏感信息
   - 定期更新系统和依赖
   - 监控部署日志

## 📞 支持

如果遇到问题，请检查：
1. GitHub Token是否有效且具有正确权限
2. SSH密钥是否正确配置
3. 网络连接是否正常
4. 仓库名称和路径是否正确