# YouTube Data API v3 Setup Guide

This guide explains how to set up Google OAuth 2.0 credentials for automated YouTube video publishing.

---

## 1. Enable YouTube Data API v3

1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. Select or create a project.
3. In the navigation menu, go to **APIs & Services > Library**.
4. Search for **YouTube Data API v3** and click **Enable**.

---

## 2. Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**.
2. Select User Type: **External** and click **Create**.
3. Fill in required App name (e.g., `Nightfall Video Uploader`) and support email.
4. Add scopes:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube`
5. In **Test users**, add your YouTube channel's Google email address.

---

## 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Application type: **Web application** (or **Desktop app**).
4. Add Authorized redirect URI:
   - `https://developers.google.com/oauthplayground` (useful for obtaining a refresh token)
5. Copy your **Client ID** and **Client Secret**.

---

## 4. Obtain a Long-Lived Refresh Token

1. Open [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. In the top right corner, click the **Gear icon (OAuth 2.0 configuration)**.
3. Check **Use your own OAuth credentials** and enter your Client ID and Client Secret.
4. In Step 1 (Select & authorize APIs), find **YouTube Data API v3** and select:
   - `https://www.googleapis.com/auth/youtube.upload`
5. Click **Authorize APIs** and log into your YouTube Google account.
6. In Step 2, click **Exchange authorization code for tokens**.
7. Copy the **Refresh token** value.

---

## 5. Add to `.env` or GitHub Secrets

In your local `.env`:
```env
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REFRESH_TOKEN=your_refresh_token
YOUTUBE_PRIVACY_STATUS=private
```

In GitHub Repository Secrets (for GitHub Actions):
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`
- `YOUTUBE_PRIVACY_STATUS`
