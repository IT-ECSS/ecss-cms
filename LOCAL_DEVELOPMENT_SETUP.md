# Local Development Setup Guide

## Prerequisites
- Node.js 18+ installed
- npm installed
- Git installed

## Step 1: Install Dependencies

```bash
cd backend2
npm install
```

This will install all dependencies including the new `dotenv` package.

## Step 2: Verify `.env` File

Check that `.env` file exists in `backend2/` directory with:

```bash
ls -la backend2/.env
```

You should see:
```
-rw-r--r--  1 user  group  250 Nov 18 12:00 backend2/.env
```

## Step 3: Check Environment Variables

Verify the variables are loaded:

```bash
cd backend2
node -e "require('dotenv').config(); console.log('✓ ONESIGNAL_APP_ID:', process.env.ONESIGNAL_APP_ID); console.log('✓ ONESIGNAL_API_KEY:', process.env.ONESIGNAL_API_KEY ? '✓ Set' : '✗ Not set');"
```

You should see:
```
✓ ONESIGNAL_APP_ID: 01b56852-4a5c-4ccc-9733-11aa47d27400
✓ ONESIGNAL_API_KEY: ✓ Set
```

## Step 4: Start the Server

### Option A: Development Mode (with auto-reload)
```bash
npm run dev
```

### Option B: Production Mode
```bash
npm start
```

## Step 5: Test the API

In another terminal:

```bash
curl http://localhost:3001/health
```

Or test OneSignal notification endpoint:

```bash
curl -X POST http://localhost:3001/notification \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Hello from local dev"}'
```

## Expected Output

You should see:
```
✓ ONESIGNAL_APP_ID: 01b56852-4a5c-4ccc-9733-11aa47d27400
✓ ONESIGNAL_API_KEY: ✓ Set
Server running at port 3001
```

And **NO warnings** about missing credentials!

---

## Troubleshooting

### Issue: Still getting the warning?

**Solution:** 
1. Make sure `.env` file is in `backend2/` directory
2. Check that `app.js` has `require('dotenv').config();` at the top
3. Restart the server with `npm start`

### Issue: `dotenv` module not found?

**Solution:**
```bash
cd backend2
npm install dotenv --save
npm install
```

### Issue: PORT already in use?

**Solution:** 
Change PORT in `.env`:
```
PORT=3002
```

### Issue: Cannot find module 'dotenv'?

**Solution:**
Make sure you ran:
```bash
cd backend2
npm install
```

---

## Files Modified

- ✅ Created `backend2/.env` - Contains your local environment variables
- ✅ Updated `backend2/app.js` - Added `require('dotenv').config()` at top
- ✅ Updated `backend2/package.json` - Added `dotenv` dependency

---

## What's Different Now?

**Before:** Hardcoded credentials in code (❌ Not secure)
**After:** Credentials loaded from `.env` file (✅ Secure)

The `.env` file is ignored by Git (`.gitignore` includes it), so credentials are never committed to GitHub.

---

## Ready to Deploy?

Once local testing works, you can:
1. Commit changes: `git add . && git commit -m "Setup env variables"`
2. Push to GitHub: `git push origin main`
3. GitHub Actions will automatically deploy to Azure with the secrets! 🚀
