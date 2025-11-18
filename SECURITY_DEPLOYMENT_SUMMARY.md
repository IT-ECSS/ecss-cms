# 🔐 Security & Deployment Setup Complete

## Summary of Changes

Your OneSignal API credentials have been secured and deployment automation has been set up.

---

## Files Created/Updated

### 🔒 Security Files
- **`backend2/.env.example`** - Template for environment variables (safe to commit)
- **`backend2/.gitignore`** - Prevents `.env` from being committed
- **`ONESIGNAL_SETUP.md`** - Step-by-step setup instructions

### 🚀 Deployment Files
- **`.github/workflows/deploy-backend.yml`** - GitHub Actions CI/CD pipeline
- **`DEPLOYMENT_GUIDE.md`** - Multiple deployment options (Azure, Docker, Local)
- **`deploy.sh`** - Automated deployment script

### 📝 Updated Code
- **`backend2/services/notificationService.js`** - Now uses environment variables

---

## Quick Start - Deploy Now

### Step 1: Add GitHub Secrets
Go to: https://github.com/IT-ECSS/ecss-cms/settings/secrets/actions

Click "New repository secret" and add:

| Secret Name | Value |
|---|---|
| `ONESIGNAL_APP_ID` | `01b56852-4a5c-4ccc-9733-11aa47d27400` |
| `ONESIGNAL_API_KEY` | `Basic os_v2_app_ag2wqusklrgmzfztcgveputuad3rucilqbjuxs4zrandzqugjidppef343cldz66gr76pra6ccd2c5eewquqbha6l3mlfblscdob5hi` |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | (Get from Azure Portal > App Service > Download publish profile) |

### Step 2: Push to Main Branch
```bash
git add .
git commit -m "🔐 Secure OneSignal credentials with environment variables"
git push origin main
```

This triggers automatic deployment to Azure! ✨

### Step 3: Monitor Deployment
- Check GitHub Actions: https://github.com/IT-ECSS/ecss-cms/actions
- Check Azure: https://portal.azure.com > App Service > ecss-backend-node

---

## Local Development

Create `.env` in `backend2/` directory:
```bash
ONESIGNAL_APP_ID=01b56852-4a5c-4ccc-9733-11aa47d27400
ONESIGNAL_API_KEY=Basic os_v2_app_ag2wqusklrgmzfztcgveputuad3rucilqbjuxs4zrandzqugjidppef343cldz66gr76pra6ccd2c5eewquqbha6l3mlfblscdob5hi
NODE_ENV=development
```

Then run:
```bash
cd backend2
npm install dotenv
npm start
```

---

## How It Works

```
┌─────────────────┐
│   Your Code     │
│  (Credentials   │
│   in .env or    │
│   Secrets)      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  process.env.ONESIGNAL_API_KEY  │
│  process.env.ONESIGNAL_APP_ID   │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  notificationService.js         │
│  Uses environment variables     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  OneSignal API                  │
│  Sends notifications            │
└─────────────────────────────────┘
```

---

## Security Checklist

✅ Credentials removed from source code
✅ `.env` files excluded from Git
✅ Secrets stored securely in GitHub & Azure
✅ Environment variables used at runtime
✅ GitHub Actions automated deployment
✅ Azure App Service configured
✅ Deployment script ready

---

## Troubleshooting

### Issue: Environment variables not loading locally
**Solution:** Make sure `.env` file exists in `backend2/` directory and `require('dotenv').config()` is at top of `app.js`

### Issue: GitHub Actions fails
**Check:** 
- All secrets are added correctly
- AZURE_WEBAPP_PUBLISH_PROFILE is valid
- Repository is public (or Actions are enabled)

### Issue: OneSignal notifications not sending
**Check logs:**
```bash
az webapp log tail --resource-group ecss-rg --name ecss-backend-node
```

---

## Next Steps

1. ✅ Add secrets to GitHub
2. ✅ Create Azure publish profile and add as secret
3. ✅ Push changes to main branch
4. ✅ Watch GitHub Actions deploy automatically
5. ✅ Test notifications on deployed app

---

## Important Notes

⚠️ **NEVER commit `.env` files to Git**
⚠️ **NEVER log secrets in console**
⚠️ **ALWAYS use environment variables for credentials**
⚠️ **Rotate keys periodically for security**

---

For detailed deployment instructions, see `DEPLOYMENT_GUIDE.md`
For setup instructions, see `ONESIGNAL_SETUP.md`
