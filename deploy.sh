#!/bin/bash

# ECSS Backend Deployment Script
# This script deploys the backend to Azure App Service

set -e

echo "🚀 ECSS Backend Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if user is logged in to Azure
echo "Checking Azure login status..."
if ! az account show &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Azure. Please run: az login${NC}"
    exit 1
fi

CURRENT_ACCOUNT=$(az account show --query name -o tsv)
echo -e "${GREEN}✓ Logged in as: $CURRENT_ACCOUNT${NC}"

# Configuration
RESOURCE_GROUP="ecss-rg"
APP_SERVICE_NAME="ecss-backend-node"
BACKEND_DIR="backend2"

# Verify environment variables
echo ""
echo -e "${YELLOW}Verifying environment variables...${NC}"
if [ -z "$ONESIGNAL_APP_ID" ]; then
    echo -e "${RED}❌ ONESIGNAL_APP_ID not set${NC}"
    echo "Set it with: export ONESIGNAL_APP_ID='01b56852-4a5c-4ccc-9733-11aa47d27400'"
    exit 1
fi
echo -e "${GREEN}✓ ONESIGNAL_APP_ID is set: $ONESIGNAL_APP_ID${NC}"
if [ "$ONESIGNAL_APP_ID" != "01b56852-4a5c-4ccc-9733-11aa47d27400" ]; then
    echo -e "${YELLOW}⚠️  Warning: ONESIGNAL_APP_ID appears to be different${NC}"
fi

if [ -z "$ONESIGNAL_API_KEY" ]; then
    echo -e "${RED}❌ ONESIGNAL_API_KEY not set${NC}"
    echo "Set it with: export ONESIGNAL_API_KEY='Basic os_v2_app_ag2wqusklrgmzfztcgveputuac...'"
    exit 1
fi
echo -e "${GREEN}✓ ONESIGNAL_API_KEY is set${NC}"

# Check if app service exists
echo ""
echo "Checking if App Service exists..."
if ! az webapp show --resource-group "$RESOURCE_GROUP" --name "$APP_SERVICE_NAME" &> /dev/null; then
    echo -e "${YELLOW}⚠️  App Service not found. Creating it...${NC}"
    az webapp create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$APP_SERVICE_NAME" \
        --runtime "node|18-lts" \
        --plan "ecss-app-service-plan"
fi
echo -e "${GREEN}✓ App Service is ready${NC}"

# Update app settings
echo ""
echo -e "${YELLOW}Updating App Service configuration...${NC}"
az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_SERVICE_NAME" \
    --settings \
    ONESIGNAL_APP_ID="$ONESIGNAL_APP_ID" \
    ONESIGNAL_API_KEY="$ONESIGNAL_API_KEY" \
    NODE_ENV="production"

echo -e "${GREEN}✓ Configuration updated${NC}"

# Deploy
echo ""
echo -e "${YELLOW}Deploying backend...${NC}"
cd "$BACKEND_DIR"
npm install
npm run build || true
cd ..

# Push to Azure using Git
echo -e "${YELLOW}Pushing to Azure...${NC}"
git push azure main

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Wait for deployment to complete (1-2 minutes)"
echo "2. Check logs: az webapp log tail --resource-group $RESOURCE_GROUP --name $APP_SERVICE_NAME"
echo "3. Test: curl https://$APP_SERVICE_NAME.azurewebsites.net/health"
