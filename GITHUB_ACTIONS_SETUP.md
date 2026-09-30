# GitHub Actions Automation & CI/CD Setup

Nightfall AI includes two production GitHub Actions workflows located in `.github/workflows/`:

1. `generate-video.yml`: Autonomous video generation worker that renders 1080p horror videos and uploads artifacts.
2. `deploy-pages.yml`: Deploys the static web interface to GitHub Pages on every push to `main`.

---

## 1. Configuring GitHub Secrets

To enable cloud video generation and automated YouTube uploads, configure your secrets in GitHub:

1. In your repository, go to **Settings > Secrets and variables > Actions**.
2. Under **Repository secrets**, click **New repository secret**.
3. Add the following secrets:
   - `GEMINI_API_KEY`: Your Google AI Studio API key.
   - `YOUTUBE_CLIENT_ID`: Your Google OAuth2 Client ID.
   - `YOUTUBE_CLIENT_SECRET`: Your Google OAuth2 Client Secret.
   - `YOUTUBE_REFRESH_TOKEN`: Your Google OAuth2 Refresh Token.
   - `YOUTUBE_PRIVACY_STATUS`: `private` (default) or `unlisted` or `public`.

---

## 2. Triggering Video Generation Manually

1. Go to the **Actions** tab in your repository.
2. Under **Workflows**, click **Generate Horror Video**.
3. Click the **Run workflow** dropdown on the right:
   - Enter your **Topic** (e.g. *"At exactly 3:00 AM every night, a dead woman's phone number calls..."*).
   - Select **Target Duration** (e.g. `330`).
   - Select **Voice** (`AUTO`, `MALE_FENRIR`, `FEMALE_KORE`).
   - Select **Visual Mode** (`HYBRID`, `IMAGE_FIRST`, `VIDEO_HEAVY`).
   - Select **Execution Mode** (`BALANCED` or `TEST`).
4. Click **Run workflow**.

---

## 3. Worker Artifacts

After completion, the workflow publishes a downloadable zip artifact named `horror-video-output` containing:
- `output/<JOB_ID>/final.mp4`: Master 1080p 16:9 H.264/AAC video file.
- `jobs/<JOB_ID>/thumbnail/thumbnail.png`: High-CTR horror thumbnail.
- `jobs/<JOB_ID>/metadata.json`: SEO title, description, tags, hashtags.
- `jobs/<JOB_ID>/status.json`: Stage breakdown and completion timestamps.
- `jobs/<JOB_ID>/logs.txt`: Full sanitised execution audit logs.
