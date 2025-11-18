# Deployment Guide for OneSignal Credentials

## Option 1: Deploy to Azure App Service (Recommended)

### Step 1: Add Secrets to GitHub Actions

Go to: https://github.com/IT-ECSS/ecss-cms/settings/secrets/actions

Add these secrets:
- `ONESIGNAL_APP_ID`: `01b56852-4a5c-4ccc-9733-11aa47d27400`
- `ONESIGNAL_API_KEY`: `BBasic os_v2_app_ag2wqusklrgmzfztcgveputuad3rucilqbjuxs4zrandzqugjidppef343cldz66gr76pra6ccd2c5eewquqbha6l3mlfblscdob5hi`

### Step 2: Configure Azure App Service

1. Go to Azure Portal → App Service (ecss-backend-node)
2. Click **Configuration** → **Application settings**
3. Add new app settings:
   - Key: `ONESIGNAL_APP_ID`
     Value: `01b56852-4a5c-4ccc-9733-11aa47d27400`
   - Key: `ONESIGNAL_API_KEY`
     Value: `Basic os_v2_app_ag2wqusklrgmzfztcgveputuad3rucilqbjuxs4zrandzqugjidppef343cldz66gr76pra6ccd2c5eewquqbha6l3mlfblscdob5hi`
4. Click **Save** and let it restart

### Step 3: Deploy Using Azure CLI

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "your-subscription-id"

# Deploy backend2
cd backend2
az webapp up --resource-group ecss-rg --name ecss-backend-node --runtime "node|18-lts"
```

Or use Git deployment:
```bash
# Add Azure remote
git remote add azure <your-azure-git-url>

# Deploy
git push azure main
```

### Step 4: Verify Deployment

```bash
# Check logs
az webapp log tail --resource-group ecss-rg --name ecss-backend-node

# Test the API
curl https://ecss-backend-node.azurewebsites.net/health
```

---

## Option 2: Deploy to Local/Development Environment

### Step 1: Create `.env` file

In `backend2/` directory, create `.env`:

```bash
ONESIGNAL_APP_ID=01b56852-4a5c-4ccc-9733-11aa47d27400
ONESIGNAL_API_KEY=Basic os_v2_app_ag2wqusklrgmzfztcgveputuacwlt4dbknlesx5kamokp5lqu3mzgglrmomg7mtrs33sixrz7o7qz4dv7vx5mbc5bmfrsvohdfjrxoi
NODE_ENV=development
PORT=3001
```

### Step 2: Install dotenv (if not already installed)

```bash
cd backend2
npm install dotenv
```

### Step 3: Update `app.js` to load environment variables

Add at the very top of `app.js`:

```javascript
// Load environment variables from .env file
require('dotenv').config();
```

### Step 4: Start the server

```bash
cd backend2
npm start
```

The server will now use the environment variables from `.env`.

---

## Option 3: Using Docker

### Step 1: Create a `.dockerignore` file

```
node_modules
npm-debug.log
.env
.env.*
.git
.gitignore
README.md
```

### Step 2: Create a `Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "app.js"]
```

### Step 3: Build and run with environment variables

```bash
# Build
docker build -t ecss-backend:latest .

# Run with environment variables
docker run -d \
  -e ONESIGNAL_APP_ID=01b56852-4a5c-4ccc-9733-11aa47d27400 \
  -e ONESIGNAL_API_KEY='Basic os_v2_app_ag2wqusklrgmzfztcgveputuacwlt4dbknlesx5kamokp5lqu3mzgglrmomg7mtrs33sixrz7o7qz4dv7vx5mbc5bmfrsvohdfjrxoi' \
  -p 3001:3001 \
  --name ecss-backend \
  ecss-backend:latest
```

### Step 4: Deploy to Azure Container Registry

```bash
# Login to ACR
az acr login --name youracregistry

# Tag image
docker tag ecss-backend:latest youracregistry.azurecr.io/ecss-backend:latest

# Push to ACR
docker push youracregistry.azurecr.io/ecss-backend:latest

# Deploy to Azure Container Instances or App Service
az container create \
  --resource-group ecss-rg \
  --name ecss-backend \
  --image youracregistry.azurecr.io/ecss-backend:latest \
  --cpu 1 --memory 1 \
  --environment-variables ONESIGNAL_APP_ID=01b56852-4a5c-4ccc-9733-11aa47d27400 ONESIGNAL_API_KEY='Basic os_v2_app_ag2wqusklrgmzfztcgveputuacwlt4dbknlesx5kamokp5lqu3mzgglrmomg7mtrs33sixrz7o7qz4dv7vx5mbc5bmfrsvohdfjrxoi'
```

---

## Security Checklist

✅ **Before deploying, verify:**

- [ ] `.env` file is in `.gitignore` (never commit credentials)
- [ ] Secrets are added to GitHub Actions
- [ ] Secrets are added to Azure App Service Configuration
- [ ] `notificationService.js` uses `process.env.ONESIGNAL_API_KEY`
- [ ] `app.js` calls `require('dotenv').config()`
- [ ] No hardcoded credentials in any committed files
- [ ] Test that notifications work after deployment

---

## Troubleshooting

### Issue: "OneSignal credentials are not configured"

**Solution:** Make sure environment variables are set:
```bash
echo $ONESIGNAL_APP_ID
echo $ONESIGNAL_API_KEY
```

### Issue: Notifications not sending after deployment

**Solution:** Check Azure logs:
```bash
az webapp log tail --resource-group ecss-rg --name ecss-backend-node
```

### Issue: 401 Unauthorized from OneSignal API

**Solution:** Verify the API key is correct and not expired. Generate a new one if needed.

---

## After Deployment

1. Test the notification service:
   ```bash
   curl -X POST https://ecss-backend-node.azurewebsites.net/notification \
     -H "Content-Type: application/json" \
     -d '{"title":"Test","message":"Hello"}'
   ```

2. Monitor logs for any errors

3. Ensure credentials are securely stored, not logged
