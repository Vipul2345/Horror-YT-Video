# Troubleshooting Guide

Common issues and solutions when building, testing, or rendering videos with Nightfall AI.

---

## 1. Video Duration Discrepancies or Runaway Renders

### Problem
A single scene or the entire video generates as 20+ minutes instead of 3–5 seconds.

### Cause
In earlier versions of FFmpeg motion scripts, the `zoompan` filter combined with `-loop 1` caused frame multiplication (generating `d` frames for every input frame endlessly).

### Solution
Nightfall AI uses direct frame-by-frame scale and crop mathematical expressions in `MotionEngine` (`src/engines/motion_engine.ts`):
```bash
scale=eval=frame:w='1920*(1.0 + 0.12*t/DUR)':h='1080*(1.0 + 0.12*t/DUR)',crop=1920:1080:(iw-1920)/2:(ih-1080)/2
```
This guarantees that an input with `-t 4.5` will produce exactly 4.500000 seconds of 30fps video.

---

## 2. Veo 3.1 Budget Limit Reached (`VEO_MAX_SECONDS_REACHED`)

### Behavior
A warning appears in logs:
`Veo budget reached (...). Falling back to image animation.`

### Explanation
This is the intended cost safety behavior! Google Veo 3.1 is charged per second generated. When your configured `MAX_VEO_SECONDS` or `MAX_VEO_SCENES` budget is reached, the pipeline continues without failing, seamlessly converting remaining scenes to animated stills with the 2.5D Motion Engine.

---

## 3. Subtitles Not Burning in FFmpeg on Windows

### Problem
Error: `Unable to parse option value 'C:\...' as image size or filename`

### Cause
Windows drive colons (`C:`) and backslashes (`\`) conflict with FFmpeg filter argument parsing.

### Solution
In `RenderEngine` (`src/engines/render_engine.ts`), Windows paths are normalized to forward slashes, and colons in file paths are escaped:
```typescript
const safeAssPath = path.resolve(captionsPath).replace(/\\/g, '/').replace(/:/g, '\\:');
videoFilter = `subtitles='${safeAssPath}',format=yuv420p`;
```

---

## 4. YouTube Upload Authentication Errors (`invalid_grant`)

### Problem
`GaxiosError: invalid_grant - Bad Request`

### Cause
The OAuth 2.0 refresh token has expired, been revoked, or the app status in Google Cloud is in "Testing" mode and the refresh token expired after 7 days.

### Solution
1. In Google Cloud Console, ensure your email is added under **OAuth consent screen > Test users**.
2. Generate a new refresh token using [Google OAuth Playground](https://developers.google.com/oauthplayground) with your Client ID and Client Secret.
3. Update `YOUTUBE_REFRESH_TOKEN` in your `.env` or GitHub Secrets.
