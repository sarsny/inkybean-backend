#!/bin/bash

# InkyBean Backend Service 监控与自愈脚本
# 功能：定期检测服务健康状态，异常时自动重启，并生成崩溃原因报告
# 用法：
#   1) 后台运行监控： ./monitor.sh start -e production -i 30
#   2) 停止监控：     ./monitor.sh stop
#   3) 查看状态：     ./monitor.sh status
#   4) 单次检测：     ./monitor.sh once -e production
# 选项：
#   -e, --env <dev|production>   指定环境（默认 production）
#   -i, --interval <秒>          监测间隔（默认 30s）
#   -p, --port <端口>            指定端口（默认从 .env/.env.production 读取）
#   -m, --max-restarts <次数>    10分钟内最大重启次数（默认 3）
#   --no-restart                 仅监控，不自动重启
#   -v, --verbose                显示更详细的输出

set -o pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 默认参数
ENV="production"
INTERVAL=30
PORT=""
MAX_RESTARTS=3
NO_RESTART=false
VERBOSE=false
SERVICE_NAME="inkybean-backend" # PM2进程名（见 ecosystem.config.js）
HEALTH_PATH="/health"
MONITOR_PID_FILE="monitor.pid"
LOG_DIR="logs"
MONITOR_LOG="$LOG_DIR/monitor.log"
CRASH_DIR="$LOG_DIR/crash_reports"
STATE_FILE="$LOG_DIR/monitor_state"

mkdir -p "$LOG_DIR" "$CRASH_DIR"

log() {
  local level="$1"; shift
  local msg="$*"
  local ts
  ts=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "[$ts] $level $msg" | tee -a "$MONITOR_LOG"
}

vlog() {
  if [ "$VERBOSE" = true ]; then
    log "DEBUG" "$*"
  fi
}

usage() {
  cat <<EOF
${BLUE}InkyBean 监控脚本${NC}
用法：
  ./monitor.sh start [选项]      后台启动监控
  ./monitor.sh stop              停止监控
  ./monitor.sh status            查看监控状态
  ./monitor.sh once [选项]       执行一次检测

选项：
  -e, --env <dev|production>     指定环境（默认 production）
  -i, --interval <秒>            监测间隔（默认 30）
  -p, --port <端口>              指定端口（默认从 .env/.env.production 读取）
  -m, --max-restarts <次数>      10分钟内最大重启次数（默认 3）
  --no-restart                   仅监控，不自动重启
  -v, --verbose                  显示详细输出
EOF
}

# 参数解析（命令在第一个位置）
CMD="${1:-}"
shift || true

while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--env)
      ENV="$2"; shift 2;;
    -i|--interval)
      INTERVAL="$2"; shift 2;;
    -p|--port)
      PORT="$2"; shift 2;;
    -m|--max-restarts)
      MAX_RESTARTS="$2"; shift 2;;
    --no-restart)
      NO_RESTART=true; shift;;
    -v|--verbose)
      VERBOSE=true; shift;;
    -h|--help)
      usage; exit 0;;
    *)
      echo -e "${RED}未知选项：$1${NC}"; usage; exit 1;;
  esac
done

# 加载环境端口
load_port() {
  if [ -n "$PORT" ]; then
    return
  fi
  local env_file
  if [[ "$ENV" == "dev" || "$ENV" == "development" ]]; then
    env_file=".env"
  else
    env_file=".env.production"
  fi
  if [ -f "$env_file" ]; then
    local p
    p=$(grep -E '^PORT=' "$env_file" | tail -n1 | cut -d'=' -f2 | tr -d ' ')
    PORT=${p:-3001}
  else
    PORT=3001
  fi
}

is_pm2_available() { command -v pm2 >/dev/null 2>&1; }

pm2_pid() {
  pm2 pid "$SERVICE_NAME" 2>/dev/null || echo ""
}

is_process_running() {
  local pid="$1"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

get_server_pid() {
  if [ -f server.pid ]; then
    cat server.pid
  else
    echo ""
  fi
}

is_port_listening() {
  lsof -Pi :"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1
}

health_check() {
  local url="http://127.0.0.1:${PORT}${HEALTH_PATH}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$url" || echo "000")
  echo "$code"
}

# 检测崩溃原因（从日志中匹配常见错误）
detect_crash_reason() {
  local reason="未知原因"
  local detail=""

  # 优先使用 error.log
  local sources=()
  [ -f "$LOG_DIR/error.log" ] && sources+=("$LOG_DIR/error.log")
  [ -f "$LOG_DIR/combined.log" ] && sources+=("$LOG_DIR/combined.log")
  [ -f "$LOG_DIR/out.log" ] && sources+=("$LOG_DIR/out.log")

  if [ ${#sources[@]} -eq 0 ]; then
    echo "$reason|未找到日志文件"; return
  fi

  local last_lines
  last_lines=$(tail -n 200 "${sources[@]}" 2>/dev/null)

  if echo "$last_lines" | grep -qiE 'EADDRINUSE|address already in use'; then
    reason='端口被占用'
  elif echo "$last_lines" | grep -qiE 'JsonWebTokenError|TOKEN_VERIFICATION_FAILED'; then
    reason='JWT校验失败'
  elif echo "$last_lines" | grep -qiE 'ECONNREFUSED|ETIMEDOUT|ECONNRESET'; then
    reason='网络连接错误'
  elif echo "$last_lines" | grep -qiE 'heap out of memory|Out of memory|Allocation failed'; then
    reason='内存不足(OOM)'
  elif echo "$last_lines" | grep -qiE 'SyntaxError|ReferenceError|TypeError'; then
    reason='代码异常'
  elif echo "$last_lines" | grep -qiE 'RATE_LIMIT_EXCEEDED|Too many requests'; then
    reason='请求频率限制'
  elif echo "$last_lines" | grep -qiE 'MODULE_NOT_FOUND'; then
    reason='依赖缺失'
  elif echo "$last_lines" | grep -qiE 'ENOENT'; then
    reason='文件或目录缺失'
  elif echo "$last_lines" | grep -qiE 'AxiosError|axios.*(timeout|network error)'; then
    reason='HTTP请求错误'
  elif echo "$last_lines" | grep -qiE 'SSL|DEPTH_ZERO_SELF_SIGNED_CERT|UNABLE_TO_VERIFY_LEAF_SIGNATURE'; then
    reason='SSL证书错误'
  elif echo "$last_lines" | grep -qiE 'Supabase|Database.*(error|failed)'; then
    reason='数据库或Supabase错误'
  fi

  # 返回 reason 和摘要（截断）
  detail=$(echo "$last_lines" | tail -n 10 | sed 's/|/-/g')
  echo "$reason|$detail"
}

save_crash_report() {
  local reason="$1"
  local detail="$2"
  local ts
  ts=$(date '+%Y%m%d-%H%M%S')
  local file="$CRASH_DIR/crash-$ts.log"
  {
    echo "=== InkyBean 崩溃报告 ==="
    echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "环境: $ENV"
    echo "端口: $PORT"
    echo "原因: $reason"
    echo "摘要: $detail"
    echo "-- 最近 error/combined/out 日志片段 --"
    [ -f "$LOG_DIR/error.log" ] && echo "# error.log" && tail -n 100 "$LOG_DIR/error.log"
    [ -f "$LOG_DIR/combined.log" ] && echo "# combined.log" && tail -n 100 "$LOG_DIR/combined.log"
    [ -f "$LOG_DIR/out.log" ] && echo "# out.log" && tail -n 100 "$LOG_DIR/out.log"
  } > "$file"
  log "INFO" "崩溃报告已保存: $file"
}

can_restart_now() {
  local now epoch10 ago count
  now=$(date +%s)
  epoch10=$((10*60))
  ago=$((now-epoch10))
  mkdir -p "$LOG_DIR"
  [ -f "$STATE_FILE" ] || touch "$STATE_FILE"
  count=$(awk -v ago="$ago" '{ if ($1 >= ago) c++ } END { print c+0 }' "$STATE_FILE")
  if [ "$count" -ge "$MAX_RESTARTS" ]; then
    log "WARN" "10分钟内重启次数已达上限($MAX_RESTARTS)，进入冷却期"
    return 1
  fi
  echo "$now" >> "$STATE_FILE"
  return 0
}

restart_service() {
  if [ "$NO_RESTART" = true ]; then
    log "WARN" "已开启 --no-restart，仅记录不重启"
    return
  fi
  if ! can_restart_now; then
    return
  fi

  if is_pm2_available && pm2 list | grep -q "$SERVICE_NAME"; then
    log "INFO" "使用 PM2 重启服务: $SERVICE_NAME"
    pm2 restart "$SERVICE_NAME" >/dev/null 2>&1 || pm2 reload ecosystem.config.js --env "$ENV" >/dev/null 2>&1
  else
    log "INFO" "使用脚本重启服务: ./restart.sh $ENV"
    if [[ "$ENV" == "dev" || "$ENV" == "development" ]]; then
      ./restart.sh dev >/dev/null 2>&1
    else
      ./restart.sh production >/dev/null 2>&1
    fi
  fi
}

check_once() {
  load_port
  log "INFO" "开始检测: ENV=$ENV PORT=$PORT"

  local pid="" running=false listening=false code

  if is_pm2_available && pm2 list | grep -q "$SERVICE_NAME"; then
    pid=$(pm2_pid)
    if [ -n "$pid" ] && is_process_running "$pid"; then running=true; fi
  else
    pid=$(get_server_pid)
    if [ -n "$pid" ] && is_process_running "$pid"; then running=true; fi
  fi

  if is_port_listening; then listening=true; fi

  code=$(health_check)

  vlog "PID=$pid running=$running listening=$listening health_code=$code"

  if [ "$running" = true ] && [ "$listening" = true ] && [ "$code" = "200" ]; then
    log "INFO" "✅ 服务健康 - PID=$pid PORT=$PORT"
    return 0
  fi

  log "ERROR" "服务异常 - running=$running listening=$listening health_code=$code"
  local result reason detail
  result=$(detect_crash_reason)
  reason=$(echo "$result" | cut -d '|' -f1)
  detail=$(echo "$result" | cut -d '|' -f2-)
  log "ERROR" "判定原因: $reason"
  save_crash_report "$reason" "$detail"

  restart_service
}

monitor_loop() {
  load_port
  log "INFO" "监控启动: ENV=$ENV PORT=$PORT 间隔=${INTERVAL}s 最大重启/10分钟=$MAX_RESTARTS"
  while true; do
    check_once
    sleep "$INTERVAL"
  done
}

start_monitor() {
  if [ -f "$MONITOR_PID_FILE" ]; then
    local mpid
    mpid=$(cat "$MONITOR_PID_FILE")
    if kill -0 "$mpid" 2>/dev/null; then
      echo -e "${YELLOW}监控已在运行，PID=$mpid${NC}"
      exit 0
    else
      rm -f "$MONITOR_PID_FILE"
    fi
  fi
  nohup bash "$0" daemon -e "$ENV" -i "$INTERVAL" ${PORT:+-p "$PORT"} -m "$MAX_RESTARTS" $([ "$NO_RESTART" = true ] && echo "--no-restart") $([ "$VERBOSE" = true ] && echo "--verbose") \
    > "$LOG_DIR/monitor.out.log" 2>&1 &
  local mpid=$!
  echo "$mpid" > "$MONITOR_PID_FILE"
  echo -e "${GREEN}监控已启动，PID=$mpid 日志: $LOG_DIR/monitor.out.log${NC}"
}

stop_monitor() {
  if [ -f "$MONITOR_PID_FILE" ]; then
    local mpid
    mpid=$(cat "$MONITOR_PID_FILE")
    if kill -0 "$mpid" 2>/dev/null; then
      kill "$mpid"
      sleep 1
      [ -n "$mpid" ] && kill -0 "$mpid" 2>/dev/null && kill -9 "$mpid"
      rm -f "$MONITOR_PID_FILE"
      echo -e "${GREEN}监控已停止${NC}"
    else
      rm -f "$MONITOR_PID_FILE"
      echo -e "${YELLOW}监控状态文件已过期，已清理${NC}"
    fi
  else
    echo -e "${YELLOW}监控未运行${NC}"
  fi
}

status_monitor() {
  if [ -f "$MONITOR_PID_FILE" ]; then
    local mpid
    mpid=$(cat "$MONITOR_PID_FILE")
    if kill -0 "$mpid" 2>/dev/null; then
      echo -e "${GREEN}监控运行中，PID=$mpid${NC}"
      echo "监控日志: $MONITOR_LOG"
      echo "输出日志: $LOG_DIR/monitor.out.log"
    else
      echo -e "${RED}监控记录存在但进程未运行${NC}"
    fi
  else
    echo -e "${YELLOW}监控未运行${NC}"
  fi
}

# 主命令分发
case "$CMD" in
  start)
    start_monitor;;
  stop)
    stop_monitor;;
  status)
    status_monitor;;
  once)
    check_once;;
  daemon)
    monitor_loop;;
  *)
    usage; exit 1;;
esac