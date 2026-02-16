#!/bin/bash
# DeepRead AI Frontend Auto-Restart Script
# Keeps the Next.js frontend running on port 3000

FRONTEND_DIR="/root/.openclaw/workspace/projects/deepread-ai/frontend"
LOG_FILE="/var/log/deepread-frontend.log"
PID_FILE="/var/run/deepread-frontend.pid"

# Create log file if it doesn't exist
touch "$LOG_FILE" 2>/dev/null || LOG_FILE="/tmp/deepread-frontend.log"

cd "$FRONTEND_DIR" || exit 1

echo "$(date): Starting DeepRead AI frontend auto-restart monitor..." >> "$LOG_FILE"

# Function to check if port 3000 is in use
check_port() {
    lsof -i :3000 >/dev/null 2>&1
    return $?
}

# Function to kill existing process on port 3000
kill_existing() {
    local pid=$(lsof -t -i :3000 2>/dev/null)
    if [ -n "$pid" ]; then
        echo "$(date): Killing existing process on port 3000 (PID: $pid)" >> "$LOG_FILE"
        kill "$pid" 2>/dev/null
        sleep 2
        kill -9 "$pid" 2>/dev/null
    fi
}

# Kill any existing process
kill_existing

# Main loop - restart on crash
while true; do
    echo "$(date): Starting Next.js frontend..." >> "$LOG_FILE"
    
    # Start the Next.js server
    npm run start >> "$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > "$PID_FILE"
    
    # Wait for server to be ready
    sleep 5
    
    # Check if it started successfully
    if check_port; then
        echo "$(date): Frontend started successfully on port 3000 (PID: $SERVER_PID)" >> "$LOG_FILE"
    else
        echo "$(date): WARNING - Port 3000 not responding after start" >> "$LOG_FILE"
    fi
    
    # Wait for the process to exit
    wait $SERVER_PID
    EXIT_CODE=$?
    
    echo "$(date): Frontend exited with code $EXIT_CODE. Restarting in 3 seconds..." >> "$LOG_FILE"
    sleep 3
done
