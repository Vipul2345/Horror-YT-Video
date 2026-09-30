# Horror Video Generation Platform: Architecture & System Design

## 1. Overview
The **AI Horror YouTube Video Automation Platform** is a fully automated, unattended production pipeline that turns a simple topic prompt (e.g. *"An abandoned hospital where the dead keep calling patients"*) into a finished 5–6 minute cinematic long-form YouTube horror video (1080p 16:9, H.264/AAC MP4) complete with voiceover, hybrid visuals, motion graphics, audio mix, cinematic animated subtitles, thumbnail, and automated YouTube upload.

---

## 2. Security Architecture & Zero-Secret Static Frontend
- **GitHub Pages Frontend**: Pure static HTML5/CSS3/ES6 running in the browser.
- **Credential Isolation**: No secrets, tokens, or private keys are ever bundled or exposed in frontend code.
- **Trigger Strategy**:
  1. **Direct GitHub Actions Dispatch**: In authenticated manual mode or local workflow dispatch.
  2. **Session-only PAT (Optional Direct Dispatch)**: Stored purely in transient browser memory (`sessionStorage`), communicating directly with `api.github.com` without intermediary servers.
  3. **Webhook Proxy Support**: Configurable endpoint for external serverless proxies (Cloudflare Workers, Vercel, GCP Cloud Functions) if deployed.
  4. **Local Windows Runner**: Direct CLI execution (`npm run generate -- --topic="..."`) using local `.env`.

---

## 3. Pipeline Stages & Data Contracts

Each generation task creates an isolated workspace directory under `jobs/<JOB-ID>/`:

```
jobs/JOB-20260930-ABC123/
  ├── input.json                  # Request parameters (topic, duration, voice, modes)
  ├── story.json                  # Structured story, hook, characters, locations, narrative arc
  ├── characters.json             # Canonical character definitions & prompt guidelines
  ├── locations.json              # Canonical location definitions & architectural lighting
  ├── scene_plan.json             # Master scene plan with hybrid visual decisions (video vs image)
  ├── narration.json              # Script broken into timed narration beats
  ├── timeline.json               # Master synchronized timeline
  ├── voice/
  │   └── voiceover.wav           # Generated TTS audio
  ├── visuals/
  │   ├── scene_001.mp4           # Video clips or animated image renders
  │   └── scene_002.png
  ├── audio/
  │   ├── music.wav               # Dynamic horror score
  │   ├── ambience.wav            # Low-frequency tension, room tone, weather
  │   └── sfx/                    # Timed sound effects cues
  ├── captions/
  │   └── captions.ass            # Cinematic ASS animated subtitles
  ├── thumbnail/
  │   ├── thumbnail.png           # 1280x720 high-CTR horror thumbnail
  │   └── thumbnail_prompt.txt
  ├── render/
  │   └── final.mp4               # Final 1080p master MP4
  ├── metadata.json               # Title, description, tags, hashtags, category
  ├── status.json                 # Real-time state machine tracking
  └── logs.txt                    # Detailed stage-by-stage audit log
```

---

## 4. Models & Providers

| Role | Default Provider | Verified Model | Fallback |
| :--- | :--- | :--- | :--- |
| **Story Engine** | Google Gemini | `gemini-3.8-flash` | `gemini-3.5-flash-lite` |
| **Voice / TTS** | Google Gemini | `gemini-3.1-flash-tts-preview` | Edge-TTS / Mock TTS |
| **Images** | Google Gemini | `gemini-3.1-flash-image` (Nano Banana 2) | Mock generator |
| **Video** | Google Gemini | `gemini-omni-1.1-flash` | FFmpeg 2.5D Image Animation |
| **Motion FX** | Local FFmpeg | Deterministic zoom/pan/grain filters | Standard Ken Burns |
| **Publishing** | YouTube Data API | Google OAuth2 v3 API | Stored final MP4 artifact |

---

## 5. Cost Control & Safety Limits
- `MAX_VEO_SECONDS`: Maximum seconds of generative video per job (Default: 40s).
- `MAX_VEO_SCENES`: Maximum AI video clips generated per job (Default: 5).
- `MAX_TOTAL_SCENES`: Hard cap on total visual beats (Default: 45).
- Modes:
  - `TEST`: 100% mock assets, zero billable API requests.
  - `BALANCED`: Hybrid mode reserving video for 3–5 climax scenes and high-fidelity animated stills for atmosphere.
  - `QUALITY`: Expanded video scenes up to strict budget cap.
