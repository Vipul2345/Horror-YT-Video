# API Credentials & Environment Setup

This document lists all configuration keys supported by Nightfall AI.

---

## Environment Variables Reference

| Variable | Description | Default | Required for |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google AI Studio API Key | *(empty)* | `BALANCED` & `QUALITY` modes |
| `STORY_MODEL` | Text generation model for narrative | `gemini-3.8-flash` | Story generation |
| `VIDEO_MODEL` | Video generation model | `veo-3.1-fast-generate-preview` | Video scenes |
| `IMAGE_MODEL` | Image generation model | `gemini-3.1-flash-image` | Stills & references |
| `VOICE_MODEL` | Text-to-speech voice model | `gemini-3.1-flash-tts-preview` | Voiceover narration |
| `COST_MODE` | Pipeline cost mode (`TEST`, `BALANCED`, `QUALITY`) | `TEST` | Budget behavior |
| `MAX_VEO_SECONDS` | Max Veo video seconds per run | `40` | Budget cap |
| `MAX_VEO_SCENES` | Max Veo video clips per run | `5` | Budget cap |
| `MAX_TOTAL_COST_USD` | Max allowable dollar spend per run | `10.0` | Budget cap |
| `YOUTUBE_CLIENT_ID` | Google OAuth2 Client ID | *(empty)* | Automated YouTube publishing |
| `YOUTUBE_CLIENT_SECRET` | Google OAuth2 Client Secret | *(empty)* | Automated YouTube publishing |
| `YOUTUBE_REFRESH_TOKEN` | Google OAuth2 Refresh Token | *(empty)* | Automated YouTube publishing |
| `YOUTUBE_PRIVACY_STATUS` | Upload privacy (`private`, `unlisted`, `public`) | `private` | Automated YouTube publishing |
| `OUTPUT_DIRECTORY` | Local destination for finished MP4s | `./output` | Final rendering |
| `JOBS_DIRECTORY` | Runtime workspace directory | `./jobs` | Isolated job storage |

---

## Security Best Practices
- Never commit `.env` or any file containing private keys into Git.
- In GitHub, configure secrets under **Settings > Secrets and variables > Actions**.
- The static frontend on GitHub Pages never contains or requires private API keys.
