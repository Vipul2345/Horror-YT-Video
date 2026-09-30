# GitHub Pages & Secure Trigger Setup

This guide explains how the static web interface is deployed to GitHub Pages and how generation jobs are triggered securely without exposing private credentials.

---

## 1. Zero-Secret Static Architecture

The static website located in `public/` is hosted via GitHub Pages:
- It runs 100% in the user's web browser as HTML5, CSS3, and JavaScript.
- It **never contains any API keys, Google Cloud secrets, or GitHub Personal Access Tokens (PATs)**.
- It can be shared publicly without any security risk.

---

## 2. Enabling GitHub Pages in Your Repository

1. Open your repository on GitHub: `https://github.com/Vipul2345/Horror-YT-Video`.
2. Go to **Settings > Pages**.
3. Under **Build and deployment > Source**, select:
   - **GitHub Actions**
4. Push a commit to `main`. The `.github/workflows/deploy-pages.yml` workflow will automatically run and publish your site at:
   `https://vipul2345.github.io/Horror-YT-Video/`

---

## 3. Trigger Methods Supported by the UI

### Method A: Session-Only Personal Access Token (Direct GitHub API)
- The user inputs a fine-grained GitHub PAT with `Actions: Read and write` permission.
- The token is stored strictly in transient browser memory (`sessionStorage`) and discarded when the tab closes.
- The browser calls `POST https://api.github.com/repos/Vipul2345/Horror-YT-Video/actions/workflows/generate-video.yml/dispatches` directly.
- No intermediary server or logging is involved.

### Method B: Serverless Webhook Proxy (Optional)
- You can deploy a tiny Cloudflare Worker or Vercel Edge function that holds the GitHub dispatch PAT as an encrypted environment variable.
- The web UI sends the topic payload to your webhook URL, which triggers the GitHub Actions workflow.

### Method C: One-Click Manual Trigger Link
- The UI provides a direct link to the repository's GitHub Actions workflow page.
- The user runs the workflow directly using GitHub's built-in `Run workflow` button with pre-filled inputs.

### Method D: Local Development CLI
- When developing locally on Windows, the user simply runs `npm run generate -- --topic="..."` or runs the local UI via `npm run serve`.
