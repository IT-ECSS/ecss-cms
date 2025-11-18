# Setting Up GitHub Actions Secrets for OneSignal

## Step 1: Create a `.env` file locally (DO NOT COMMIT)

Create a file named `.env` in the `backend2` directory:

```bash
ONESIGNAL_APP_ID=01b56852-4a5c-4ccc-9733-11aa47d27400
ONESIGNAL_API_KEY=Basic os_v2_app_ag2wqusklrgmzfztcgveputuad3rucilqbjuxs4zrandzqugjidppef343cldz66gr76pra6ccd2c5eewquqbha6l3mlfblscdob5hi
```

The `.gitignore` file already excludes `.env` from being committed.

## Step 2: Add GitHub Actions Secrets

1. Go to your GitHub repository: https://github.com/IT-ECSS/ecss-cms
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:

### Secret 1: ONESIGNAL_APP_ID
- **Name:** `ONESIGNAL_APP_ID`
- **Value:** `01b56852-4a5c-4ccc-9733-11aa47d27400`

### Secret 2: ONESIGNAL_API_KEY
- **Name:** `ONESIGNAL_API_KEY`
- **Value:** `Basic os_v2_app_ag2wqusklrgmzfztcgveputuad3rucilqbjuxs4zrandzqugjidppef343cldz66gr76pra6ccd2c5eewquqbha6l3mlfblscdob5hi`

## Step 3: Update Azure App Service Configuration

If your app is running on Azure, add these application settings:

1. Go to Azure Portal → App Service (backend)
2. Click **Configuration** → **Application settings**
3. Add:
   - `ONESIGNAL_APP_ID`: `01b56852-4a5c-4ccc-9733-11aa47d27400`
   - `ONESIGNAL_API_KEY`: `Basic os_v2_app_ag2wqusklrgmzfztcgveputuad3rucilqbjuxs4zrandzqugjidppef343cldz66gr76pra6ccd2c5eewquqbha6l3mlfblscdob5hi`

## Step 4: Load environment variables in Node.js

The application now loads these variables using:
```javascript
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;
```

## Step 5: Local Development

To run locally, make sure your `.env` file is in the `backend2` directory. Use a package like `dotenv`:

```bash
npm install dotenv
```

Add this to the top of `app.js`:
```javascript
require('dotenv').config();
```

## Important Security Notes

⚠️ **Never commit `.env` files to GitHub**
⚠️ **Always use environment variables for sensitive credentials**
⚠️ **Regenerate keys if they are ever exposed** (OneSignal has already revoked the exposed key)

## Files Changed

- `notificationService.js` - Now reads from environment variables
- `.env.example` - Template showing required variables
- `.gitignore` - Prevents `.env` files from being committed
- `.github/workflows/deploy-backend.yml` - GitHub Actions workflow example
