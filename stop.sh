#!/bin/bash

# Stop script for Casa Chindea project
# This script stops all running services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Stopping Casa Chindea services...${NC}"

# Function to stop a service
stop_service() {
    local service_name=$1
    local pid_file=$2

    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${GREEN}Stopping $service_name (PID: $PID)...${NC}"
            kill $PID 2>/dev/null
            sleep 1

            # Force kill if still running
            if ps -p $PID > /dev/null 2>&1; then
                echo -e "  Force stopping $service_name..."
                kill -9 $PID 2>/dev/null
            fi
            echo -e "${GREEN}✓ $service_name stopped${NC}"
        else
            echo -e "  $service_name is not running"
        fi
        rm "$pid_file"
    else
        echo -e "  No PID file found for $service_name"
    fi
}

# Stop services in reverse order
stop_service "Frontend" "logs/frontend.pid"
stop_service "Backend" "logs/backend.pid"
stop_service "PocketBase" "logs/pocketbase.pid"

# Additional cleanup - kill any remaining node processes running our services
echo ""
echo -e "${BLUE}Cleaning up any remaining processes...${NC}"

# Kill any remaining backend processes
pkill -f "node backend/index.js" 2>/dev/null && echo -e "${GREEN}✓ Cleaned up backend processes${NC}"
pkill -f "nodemon backend/index.js" 2>/dev/null && echo -e "${GREEN}✓ Cleaned up nodemon processes${NC}"

# Kill any remaining vite processes
pkill -f "vite" 2>/dev/null && echo -e "${GREEN}✓ Cleaned up vite processes${NC}"

# Kill any remaining pocketbase processes
pkill -f "pocketbase serve" 2>/dev/null && echo -e "${GREEN}✓ Cleaned up pocketbase processes${NC}"

# Kill processes by port if they're still running
if command -v lsof &> /dev/null; then
    if lsof -ti:3001 &> /dev/null; then
        lsof -ti:3001 | xargs kill -9 2>/dev/null && echo -e "${GREEN}✓ Freed port 3001${NC}"
    fi
    if lsof -ti:8090 &> /dev/null; then
        lsof -ti:8090 | xargs kill -9 2>/dev/null && echo -e "${GREEN}✓ Freed port 8090${NC}"
    fi
    if lsof -ti:8080 &> /dev/null; then
        lsof -ti:8080 | xargs kill -9 2>/dev/null && echo -e "${GREEN}✓ Freed port 8080${NC}"
    fi
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}All services stopped!${NC}"
echo -e "${BLUE}========================================${NC}"

