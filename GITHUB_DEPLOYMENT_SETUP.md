# GitHub & Azure Deployment Setup Guide

## Overview
This guide explains how to set up GitHub Secrets for automated deployment to Azure with OneSignal and Google Drive integration.

---

## Step 1: Add Secrets to GitHub

Go to: **GitHub Repository → Settings → Secrets and variables → Actions**

### Required Secrets to Add

#### 1. **AZURE_CREDENTIALS** (Service Principal)
```bash
# Generate using Azure CLI
az ad sp create-for-rbac --name "ecss-github-actions" \
  --role contributor \
  --scopes /subscriptions/{SUBSCRIPTION_ID}/resourceGroups/ECSS-Course-Management-System \
  --json-auth
```

**Add to GitHub:**
- Name: `AZURE_CREDENTIALS`
- Value: Paste the entire JSON output from the command above

---

#### 2. **ONESIGNAL_APP_ID**
**Get from:**
- Go to OneSignal Dashboard
- Settings → Keys & IDs
- Copy the "App ID"

**Add to GitHub:**
- Name: `ONESIGNAL_APP_ID`
- Value: Your OneSignal App ID

---

#### 3. **ONESIGNAL_API_KEY**
**Get from:**
- OneSignal Dashboard → Settings → Keys & IDs
- Copy "REST API Key"

**Add to GitHub:**
- Name: `ONESIGNAL_API_KEY`
- Value: Your REST API Key

---

#### 4. **GOOGLE_DRIVE_CREDENTIALS** (Base64 Encoded)
**Prepare the credentials file:**

```bash
# Encode your Google credentials to base64
cat backend2/config/ecss-company-management-system-22a29c296db3.json | base64

# On macOS:
cat backend2/config/ecss-company-management-system-22a29c296db3.json | base64 -i -
```

**Add to GitHub:**
- Name: `GOOGLE_DRIVE_CREDENTIALS`
- Value: The complete base64 encoded output (paste everything)

---

## Step 2: Verify GitHub Secrets

Check that all secrets are properly configured:

```bash
# Using GitHub CLI
gh secret list -R IT-ECSS/ecss-cms

# Expected output:
AZURE_CREDENTIALS              Updated less than 1 minute ago
GOOGLE_DRIVE_CREDENTIALS       Updated less than 1 minute ago
ONESIGNAL_APP_ID               Updated less than 1 minute ago
ONESIGNAL_API_KEY              Updated less than 1 minute ago
```

---

## Step 3: Verify Workflow File

Check that `.github/workflows/main_ecss-backend-node.yml` includes:

```yaml
- name: Validate Required Secrets
  run: |
    # Validates all 4 secrets before deployment

- name: Configure Azure App Settings for OneSignal
  run: |
    # Sets ONESIGNAL_APP_ID, ONESIGNAL_API_KEY, and GOOGLE_DRIVE_FOLDER_ID

- name: Configure Google Drive Credentials
  run: |
    # Decodes base64 credentials into backend2/config/
```

---

## Step 4: Test Deployment

### Method 1: Push to Main Branch (Auto-trigger)
```bash
git add .
git commit -m "Deploy: Add GitHub Actions configuration"
git push origin main
```

### Method 2: Manual Trigger via GitHub UI
- Go to Repository → Actions tab
- Select "ECSS CMS - Node" workflow
- Click "Run workflow" → "Run workflow"

### Method 3: GitHub CLI
```bash
gh workflow run main_ecss-backend-node.yml --ref main
```

---

## Step 5: Monitor Deployment

### View Deployment Progress
1. Go to **GitHub → Actions tab**
2. Click on the latest workflow run
3. Monitor real-time logs

### Check Azure Deployment
```bash
# View app settings
az webapp config appsettings list \
  --resource-group ECSS-Course-Management-System \
  --name ecss-backend-node

# View logs
az webapp log tail \
  --resource-group ECSS-Course-Management-System \
  --name ecss-backend-node
```

### Verify API Health
```bash
curl https://ecss-backend-node.azurewebsites.net/health
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| ❌ Validation failed | Missing secrets | Add all 4 secrets to GitHub |
| ❌ Invalid credentials | Wrong format | Verify base64 encoding of Google credentials |
| ❌ Deployment timeout | Large package | Check Azure logs for details |
| ❌ Google Drive upload fails | Wrong folder ID | Verify folder ID in workflow: `1DF81mvA5pv8_X-_uP8528Vb1xNfs1D8M` |
| ❌ OneSignal config fails | Expired keys | Regenerate keys in OneSignal dashboard |

---

## Secret Configuration Summary

| Secret Name | Source | Format | Expires |
|------------|--------|--------|---------|
| `AZURE_CREDENTIALS` | Azure CLI `az ad sp` | JSON | 1 year |
| `ONESIGNAL_APP_ID` | OneSignal Dashboard | Text | Never |
| `ONESIGNAL_API_KEY` | OneSignal Dashboard | Text | Manual regenerate |
| `GOOGLE_DRIVE_CREDENTIALS` | Google Cloud Console | Base64 JSON | 1 year |

---

## What Happens on Deployment

When you push to `main` or manually trigger the workflow:

1. ✅ **Checkout code** from GitHub
2. ✅ **Validate all 4 secrets** are present
3. ✅ **Install dependencies** (`npm ci`)
4. ✅ **Build backend** (`npm run build`)
5. ✅ **Login to Azure** using AZURE_CREDENTIALS
6. ✅ **Deploy to Azure Web App** at `ecss-backend-node`
7. ✅ **Configure Azure App Settings**:
   - OneSignal credentials
   - Google Drive folder ID
   - Node environment
8. ✅ **Decode & configure Google Drive credentials** in backend
9. ✅ **Deployment complete!** 🎉

---

## Next Steps

- [ ] Add all 4 secrets to GitHub
- [ ] Test deployment by pushing to main
- [ ] Verify all services work (OneSignal, Google Drive)
- [ ] Set up monitoring and alerts
- [ ] Configure automatic deployments for other branches (develop, staging)

---

## Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Azure Service Principal](https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli)
- [OneSignal API Keys](https://documentation.onesignal.com/reference/push-api)
- [Google Service Account Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)
