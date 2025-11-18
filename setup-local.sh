#!/bin/bash

# Local Development Setup Script
# This script sets up the backend for local development

echo "🚀 ECSS Backend Local Setup"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Navigate to backend2
cd backend2 || exit

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "Creating .env file..."
    cat > .env << EOF
# OneSignal Configuration
ONESIGNAL_APP_ID=01b56852-4a5c-4ccc-9733-11aa47d27400
ONESIGNAL_API_KEY=Basic os_v2_app_ag2wqusklrgmzfztcgveputuad3rucilqbjuxs4zrandzqugjidppef343cldz66gr76pra6ccd2c5eewquqbha6l3mlfblscdob5hi

# Server Configuration
NODE_ENV=development
PORT=3001
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo ""
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Verify environment variables
echo ""
echo "Verifying environment variables..."
node -e "
require('dotenv').config();
const appId = process.env.ONESIGNAL_APP_ID;
const apiKey = process.env.ONESIGNAL_API_KEY;

if (!appId || !apiKey) {
    console.log('\x1b[31m❌ Missing credentials\x1b[0m');
    process.exit(1);
}

console.log('\x1b[32m✓ ONESIGNAL_APP_ID:\x1b[0m', appId);
console.log('\x1b[32m✓ ONESIGNAL_API_KEY:\x1b[0m', apiKey ? '✓ Set' : '✗ Not set');
console.log('\x1b[32m✓ NODE_ENV:\x1b[0m', process.env.NODE_ENV || 'development');
console.log('\x1b[32m✓ PORT:\x1b[0m', process.env.PORT || '3001');
"

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Start the server with:"
echo -e "  ${YELLOW}npm start${NC}        (production mode)"
echo -e "  ${YELLOW}npm run dev${NC}      (development mode with auto-reload)"
echo ""
echo "Test the API with:"
echo -e "  ${YELLOW}curl http://localhost:3001/health${NC}"
