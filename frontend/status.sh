#!/bin/bash
# Quick status check for DeepRead AI Frontend

echo "=== DeepRead AI Frontend Status ==="
echo ""

# Check if port 3000 is listening
if ss -tlnp | grep -q ':3000'; then
    echo "✓ Port 3000 is LISTENING"
else
    echo "✗ Port 3000 is NOT listening"
fi

# Check HTTP response
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ HTTP Response: 200 OK"
else
    echo "✗ HTTP Response: $HTTP_CODE"
fi

# Check processes
echo ""
echo "=== Running Processes ==="
ps aux | grep -E "(next|start-frontend)" | grep -v grep | grep -v status

echo ""
echo "=== Recent Log ==="
tail -5 /var/log/deepread-frontend.log 2>/dev/null || tail -5 /tmp/deepread-frontend.log 2>/dev/null || echo "No log file"

echo ""
echo "=== URLs ==="
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001"
