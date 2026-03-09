#!/bin/bash

# Start script for Casa Chindea project
# This script starts PocketBase, Backend, and Frontend services

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Casa Chindea services...${NC}"

# Check if required ports are available
if command -v lsof &> /dev/null; then
    if lsof -ti:3001 &> /dev/null; then
        echo -e "${YELLOW}Warning: Port 3001 is already in use. Run ./stop.sh first${NC}"
        exit 1
    fi
    if lsof -ti:8090 &> /dev/null; then
        echo -e "${YELLOW}Warning: Port 8090 is already in use. Run ./stop.sh first${NC}"
        exit 1
    fi
    if lsof -ti:8080 &> /dev/null; then
        echo -e "${YELLOW}Warning: Port 8080 is already in use. Run ./stop.sh first${NC}"
        exit 1
    fi
fi

# Load environment variables from .env.local
if [ -f .env ]; then
    echo -e "${YELLOW}Loading environment variables from .env.local...${NC}"
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
else
    echo -e "${YELLOW}Warning: .env.local file not found!${NC}"
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Start PocketBase
echo -e "${GREEN}Starting PocketBase...${NC}"
cd api
if [ -f ./pocketbase ]; then
    ./pocketbase serve --http="127.0.0.1:8090" > ../logs/pocketbase.log 2>&1 &
    POCKETBASE_PID=$!
    echo $POCKETBASE_PID > ../logs/pocketbase.pid
    echo -e "${GREEN}[OK] PocketBase started (PID: $POCKETBASE_PID)${NC}"
    echo -e "  URL: http://127.0.0.1:8090"
    echo -e "  Admin: http://127.0.0.1:8090/_/"
else
    echo -e "${YELLOW}Warning: PocketBase binary not found in api/ directory${NC}"
fi
cd ..

# Wait for PocketBase to start
sleep 2

# Start Backend
echo -e "${GREEN}Starting Backend server...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install > ../logs/backend-install.log 2>&1
fi
NODE_ENV=development npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid
cd ..
echo -e "${GREEN}[OK] Backend started (PID: $BACKEND_PID)${NC}"
echo -e "  URL: http://localhost:3001"

# Wait for backend to start
sleep 2

# Start Frontend (from root)
echo -e "${GREEN}Starting Frontend (Vite dev server)...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install > logs/frontend-install.log 2>&1
fi
cd public
npx vite > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid
cd ..
echo -e "${GREEN}[OK] Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "  URL: http://localhost:8080"

# Wait a moment and check if processes are still running
sleep 2

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}All services started successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "PocketBase:  http://127.0.0.1:8090"
echo -e "Backend:     http://localhost:3001"
echo -e "Frontend:    http://localhost:8080"
echo ""
echo -e "Logs are available in the ${YELLOW}logs/${NC} directory"
echo -e "To stop all services, run: ${YELLOW}./stop.sh${NC}"
echo ""

