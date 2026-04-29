#!/bin/bash

# Deployment script for Azure App Service
# This ensures npm install runs properly on the Linux environment

set -e

echo "Starting deployment..."
cd /home/site/wwwroot

echo "Installing Node.js dependencies..."
npm ci --prefer-offline --no-audit

echo "Building if needed..."
npm run build --if-present

echo "✓ Deployment complete"
