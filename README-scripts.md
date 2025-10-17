# InkyBean Backend Service 管理脚本

这些脚本用于管理 InkyBean Backend Service 的启动、停止、监控和日志查看。

## 脚本列表

### 🚀 start.sh - 启动服务
启动 InkyBean Backend Service

**使用方法:**
```bash
./start.sh [环境]
```

**参数:**
- `dev` 或 `development` - 开发环境 (默认)
- `prod` 或 `production` - 生产环境

**示例:**
```bash
./start.sh              # 启动开发环境
./start.sh dev           # 启动开发环境
./start.sh prod          # 启动生产环境
```

**功能:**
- 检查系统依赖 (Node.js, npm)
- 验证必要文件 (package.json, .env)
- 自动安装依赖
- 检查端口占用并处理冲突
- 创建日志目录
- 启动服务并保存进程ID

---

### 🛑 stop.sh - 停止服务
停止 InkyBean Backend Service

**使用方法:**
```bash
./stop.sh [选项]
```

**选项:**
- `force` - 强制停止服务

**示例:**
```bash
./stop.sh               # 优雅停止服务
./stop.sh force         # 强制停止服务
```

**功能:**
- 优雅停止服务进程
- 清理PID文件
- 处理PM2进程
- 强制终止残留进程

---

### 📊 status.sh - 状态检查
检查 InkyBean Backend Service 运行状态

**使用方法:**
```bash
./status.sh [选项]
```

**选项:**
- `-v` 或 `--verbose` - 显示详细信息

**示例:**
```bash
./status.sh             # 基本状态检查
./status.sh -v          # 详细状态检查
```

**功能:**
- 检查服务运行状态
- 验证端口占用情况
- 执行健康检查
- 显示日志文件状态
- 显示系统资源使用情况 (详细模式)

---

### 🔄 restart.sh - 重启服务
重启 InkyBean Backend Service

**使用方法:**
```bash
./restart.sh [环境] [选项]
```

**参数:**
- `dev` 或 `development` - 开发环境 (默认)
- `prod` 或 `production` - 生产环境

**选项:**
- `--force` 或 `-f` - 强制重启

**示例:**
```bash
./restart.sh            # 重启开发环境
./restart.sh prod       # 重启生产环境
./restart.sh dev --force # 强制重启开发环境
```

**功能:**
- 停止当前服务
- 等待服务完全停止
- 启动新的服务实例
- 执行健康检查

---

### 📋 logs.sh - 日志查看
查看 InkyBean Backend Service 日志

**使用方法:**
```bash
./logs.sh [选项] [日志类型]
```

**日志类型:**
- `combined` - 综合日志 (默认)
- `error` - 错误日志
- `out` - 输出日志
- `access` - 访问日志 (如果存在)

**选项:**
- `-f` 或 `--follow` - 实时跟踪日志
- `-n` 或 `--lines NUM` - 显示最后 NUM 行 (默认: 50)
- `-s` 或 `--search TERM` - 搜索包含指定内容的日志
- `-h` 或 `--help` - 显示帮助信息

**示例:**
```bash
./logs.sh                    # 查看最后50行综合日志
./logs.sh -f                 # 实时跟踪综合日志
./logs.sh error -n 100       # 查看最后100行错误日志
./logs.sh -s "ERROR"         # 搜索包含ERROR的日志
./logs.sh -f error           # 实时跟踪错误日志
./logs.sh 200                # 查看最后200行日志
```

**功能:**
- 查看不同类型的日志文件
- 实时跟踪日志输出
- 搜索特定内容
- 彩色高亮显示 (错误、警告、状态码等)

## 快速开始

1. **首次启动:**
   ```bash
   ./start.sh
   ```

2. **检查状态:**
   ```bash
   ./status.sh
   ```

3. **查看日志:**
   ```bash
   ./logs.sh -f
   ```

4. **重启服务:**
   ```bash
   ./restart.sh
   ```

5. **停止服务:**
   ```bash
   ./stop.sh
   ```

## 常见问题

### Q: 端口被占用怎么办？
A: 使用 `./stop.sh force` 强制停止，或者 `./restart.sh --force` 强制重启

### Q: 服务启动失败？
A: 
1. 检查日志: `./logs.sh error`
2. 检查状态: `./status.sh -v`
3. 确认环境配置: 检查 `.env` 文件

### Q: 如何查看实时日志？
A: 使用 `./logs.sh -f` 实时跟踪日志

### Q: 如何搜索特定错误？
A: 使用 `./logs.sh -s "错误关键词"`

## 注意事项

1. **权限问题:** 确保脚本有执行权限
   ```bash
   chmod +x *.sh
   ```

2. **环境配置:** 确保 `.env` 文件配置正确

3. **依赖检查:** 脚本会自动检查 Node.js 和 npm，确保已安装

4. **日志管理:** 定期清理日志文件以节省磁盘空间

5. **生产环境:** 在生产环境中使用 `prod` 参数启动服务

## 文件结构

```
InkyBeanService/
├── start.sh          # 启动脚本
├── stop.sh           # 停止脚本
├── status.sh         # 状态检查脚本
├── restart.sh        # 重启脚本
├── logs.sh           # 日志查看脚本
├── server.pid        # 进程ID文件 (运行时生成)
├── logs/             # 日志目录
│   ├── combined.log  # 综合日志
│   ├── error.log     # 错误日志
│   └── out.log       # 输出日志
└── README-scripts.md # 本文档
```

## 支持

如果遇到问题，请：
1. 查看日志文件
2. 使用详细模式检查状态
3. 检查环境配置
4. 联系开发团队