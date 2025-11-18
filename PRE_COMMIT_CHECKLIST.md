# Pre-Commit Checklist

## Before You Push to GitHub

### ✅ Step 1: Verify Local Setup Works

```bash
# 1. Make sure server starts without warnings
cd backend2
npm start

# Expected output:
# ✓ ONESIGNAL_APP_ID: 01b56852-4a5c-4ccc-9733-11aa47d27400
# ✓ ONESIGNAL_API_KEY: ✓ Set
# Server running at port 3001
```

### ✅ Step 2: Check Git Status

```bash
# See what will be committed
git status

# You should see:
# - .github/workflows/deploy-backend.yml (ADDED)
# - backend2/app.js (MODIFIED)
# - backend2/package.json (MODIFIED)
# - backend2/.env.example (ADDED)
# - backend2/.gitignore (ADDED)
# - setup-local.sh (ADDED)
# - deploy.sh (ADDED)
# - Various .md files (ADDED)

# You should NOT see:
# - backend2/.env (should be ignored ✅)
# - backend2/node_modules (should be ignored ✅)
```

### ✅ Step 3: Verify .env is Ignored

```bash
# Check if .env is ignored
git check-ignore -v backend2/.env

# Expected output:
# backend2/.env    .gitignore
```

### ✅ Step 4: Review Changes

```bash
# See exactly what you're committing
git diff --cached

# Verify:
# - No real API keys in the diff
# - No credentials visible
# - Only template files (.env.example)
```

### ✅ Step 5: Add GitHub Secrets

**BEFORE** you push, make sure secrets are added to GitHub:

1. Go to: https://github.com/IT-ECSS/ecss-cms/settings/secrets/actions

2. Verify these 3 secrets exist:
   - [ ] `ONESIGNAL_APP_ID` = `01b56852-4a5c-4ccc-9733-11aa47d27400`
   - [ ] `ONESIGNAL_API_KEY` = `Basic os_v2_app_ag2wqusklrgmzfztcgveputuacwlt4dbknlesx5kamokp5lqu3mzgglrmomg7mtrs33sixrz7o7qz4dv7vx5mbc5bmfrsvohdfjrxoi`
   - [ ] `AZURE_WEBAPP_PUBLISH_PROFILE` = (download from Azure Portal)

---

## Safe to Commit? ✅

If all above checks pass, you're ready!

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "🔐 Secure OneSignal credentials and setup local development

- Moved credentials to environment variables
- Created .env file (ignored by git)
- Added dotenv support to app.js
- Created LOCAL_DEVELOPMENT_SETUP.md guide
- Added automated setup script
- Created GitHub Actions deployment workflow
- Credentials stored securely in GitHub Actions secrets"

# Push to GitHub (triggers automatic deployment!)
git push origin main
```

---

## After Push

✅ GitHub Actions will:
1. Build the application
2. Configure Azure App Service settings
3. Deploy to Azure automatically
4. Use secrets (not `.env` file)

✅ Monitor deployment:
- GitHub Actions: https://github.com/IT-ECSS/ecss-cms/actions
- Azure Portal: https://portal.azure.com

---

## Troubleshooting

### If you accidentally committed .env:

```bash
# Remove it from Git history
git rm --cached backend2/.env
git commit -m "Remove .env from tracking"
git push

# The file stays locally but won't be tracked anymore
```

### If secrets aren't working on Azure:

```bash
# Check Azure App Service settings
az webapp config appsettings list --resource-group ecss-rg --name ecss-backend-node

# Expected output:
# [
#   {"name": "ONESIGNAL_APP_ID", "value": "01b56852-4a5c-4ccc-9733-11aa47d27400"},
#   {"name": "ONESIGNAL_API_KEY", "value": "Basic os_v2_app_ag2wqusklrgmzfztcgveputuacwlt..."},
#   ...
# ]
```

### If GitHub Actions fails:

1. Check GitHub Actions logs: https://github.com/IT-ECSS/ecss-cms/actions
2. Verify all secrets are added correctly
3. Check Azure publish profile is valid

---

## Remember

⚠️ **Never commit:**
- `.env` files with real credentials
- API keys or secrets
- Passwords or tokens

✅ **Always commit:**
- `.env.example` (template only)
- `package.json` (declares dependencies)
- Source code
- Documentation
- GitHub Actions workflows

Your setup is secure! 🔐
