# Google OAuth Redirect URI Setup Guide

## Fix redirect_uri_mismatch Error

If you're seeing the error: **"Error 400: redirect_uri_mismatch"**, follow these steps:

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/apis/credentials
2. Make sure you're in the correct project (FlowFpundryPro)

### Step 2: Edit Your OAuth Client
1. Find your OAuth client (named "FlowFoundry Web Client" or similar)
2. Click the **edit icon (pencil)** next to it

### Step 3: Add the Correct Redirect URI
In the **"Authorized redirect URIs"** section:

1. Click **"+ ADD URI"**
2. Enter exactly this URI (no trailing slash):
   ```
   http://localhost:3000/api/auth/callback/google
   ```
3. Click **"ADD"**
4. Click **"SAVE"** at the bottom

### Step 4: Verify
- The redirect URI must match **exactly**: `http://localhost:3000/api/auth/callback/google`
- No trailing slash
- Must be `http://` (not `https://`) for localhost
- Port must be `:3000` (match your dev server)

### Step 5: Wait and Test
1. Wait 1-2 minutes for Google to update
2. Try signing in with Google again
3. It should work now!

## Gmail API Scopes

The Gmail connector requires the Gmail API scope. This is already configured in the code, but you need to ensure it's approved in your OAuth consent screen:

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Click "Edit App"
3. Go to "Scopes" section
4. Make sure these scopes are added:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/gmail.send` (for sending emails)
5. Click "Save and Continue"

## Enable Gmail API

1. Go to: https://console.cloud.google.com/apis/library
2. Search for "Gmail API"
3. Click on "Gmail API"
4. Click "Enable"

## For Production
When deploying to production, add your production redirect URI:
```
https://yourdomain.com/api/auth/callback/google
```

