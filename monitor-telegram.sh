#!/bin/bash
# DeepRead AI Real-time Monitor - Sends alerts to Telegram via OpenClaw
# Usage: ./monitor-telegram.sh [--continuous]

DEEPREAD_BACKEND="http://localhost:3001"
DEEPREAD_FRONTEND="http://localhost:3000"
DEEPREAD_URL="https://deepreader.shubham.wtf"
LOG_FILE="/tmp/deepread-monitor.log"
ALERT_COOLDOWN=300  # 5 minutes between repeat alerts

# Track last alert times
declare -A LAST_ALERTS

log() {
    echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $1" | tee -a "$LOG_FILE"
}

send_telegram_alert() {
    local message="$1"
    local priority="${2:-normal}"
    
    # Use OpenClaw wake to send Telegram message
    if [ "$priority" = "urgent" ]; then
        openclaw gateway wake --text "🚨 DeepRead ALERT: $message" --mode now 2>/dev/null
    else
        openclaw gateway wake --text "📊 DeepRead: $message" --mode now 2>/dev/null
    fi
}

check_backend() {
    local response=$(curl -s -w "\n%{http_code}" --max-time 10 "$DEEPREAD_BACKEND/health" 2>/dev/null)
    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        local status=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null)
        if [ "$status" = "ok" ]; then
            log "✅ Backend: OK"
            return 0
        fi
    fi
    
    log "❌ Backend: FAILED (HTTP $http_code)"
    return 1
}

check_frontend() {
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$DEEPREAD_FRONTEND" 2>/dev/null)
    
    if [ "$http_code" = "200" ]; then
        log "✅ Frontend: OK"
        return 0
    fi
    
    log "❌ Frontend: FAILED (HTTP $http_code)"
    return 1
}

check_tunnel() {
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$DEEPREAD_URL" 2>/dev/null)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "302" ]; then
        log "✅ Tunnel: OK ($DEEPREAD_URL)"
        return 0
    fi
    
    log "❌ Tunnel: FAILED (HTTP $http_code)"
    return 1
}

run_checks() {
    local issues=()
    
    if ! check_backend; then
        issues+=("Backend down")
    fi
    
    if ! check_frontend; then
        issues+=("Frontend down")
    fi
    
    if ! check_tunnel; then
        issues+=("Tunnel unreachable")
    fi
    
    # Send alert if there are issues
    if [ ${#issues[@]} -gt 0 ]; then
        local alert_key=$(echo "${issues[*]}" | md5sum | cut -d' ' -f1)
        local now=$(date +%s)
        local last_alert=${LAST_ALERTS[$alert_key]:-0}
        
        if [ $((now - last_alert)) -gt $ALERT_COOLDOWN ]; then
            send_telegram_alert "${issues[*]}" "urgent"
            LAST_ALERTS[$alert_key]=$now
        fi
        return 1
    fi
    
    return 0
}

# Main
log "=== DeepRead Monitor Started ==="

if [ "$1" = "--continuous" ]; then
    log "Running in continuous mode (Ctrl+C to stop)"
    while true; do
        run_checks
        sleep 60  # Check every minute
    done
else
    run_checks
    if [ $? -eq 0 ]; then
        log "All services healthy"
    else
        log "Issues detected - alert sent to Telegram"
    fi
fi
