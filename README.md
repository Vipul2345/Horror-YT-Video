# Nightfall AI — Autonomous Horror YouTube Video Generation Platform

Nightfall AI is an end-to-end, unattended video automation platform that transforms a text topic into a complete 5–6 minute cinematic long-form YouTube horror video (1080p 16:9, H.264/AAC MP4) complete with voiceover narration, canonical character and location consistency, hybrid visual generation (Google Veo 3.1 + animated stills), horror sound design, cinematic animated subtitles, custom thumbnail, and automated YouTube publishing.

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: v20+ (tested on v22.12)
- **FFmpeg & FFprobe**: Version 6.0+ (tested on 9.0 with libass and libx264)
- **Git**: Installed and configured

### 2. Installation
```bash
git clone https://github.com/Vipul2345/Horror-YT-Video.git
cd Horror-YT-Video
npm install
npm run build
```

### 3. Verify End-to-End Pipeline ($0 Zero-Cost Test Mode)
Run a complete local dry-run with mock assets, testing all 11 stages of the pipeline and rendering a real 1080p MP4 with FFprobe QA validation:
```bash
npm run test-pipeline
```

### 4. Run Generation
```bash
# Using local CLI
npm run generate -- --topic="At exactly 3:00 AM every night, a dead woman's phone number calls a security guard inside an abandoned psychiatric hospital." --quality=BALANCED

# Or start the static web interface for GitHub Pages
npm run serve
```

---

## 🏗 Architecture & Key Highlights

- **Static Zero-Secret Frontend**: Hosted via GitHub Pages with no exposed API keys or private tokens. Supports session-only PAT dispatch or manual GitHub Actions triggers.
- **Narrative & Pacing Engine**: Uses Google Gemini to generate structured narratives, enforce target 300–360 second duration, and guarantee canonical character and location continuity.
- **Master Narration Timeline**: Voiceover timing serves as the single source of truth; every visual beat, subtitle card, and SFX cue aligns to spoken audio.
- **Hybrid Visuals with Google Veo 3.1**: Dynamically selects between Veo 3.1 video generation for high-impact action scenes and Gemini 3.1 Flash Image + deterministic FFmpeg motion for atmosphere.
- **Hard Cost Throttles**: Strictly enforces `MAX_VEO_SECONDS`, `MAX_VEO_SCENES`, and `MAX_TOTAL_COST_USD` to protect against unexpected API spend.
- **Canonical Reference Assets**: Generates canonical reference images for recurring characters and locations before rendering scenes to maintain visual coherence.
- **Deterministic 2.5D Motion Engine**: Uses exact mathematical scale/crop expressions in FFmpeg to eliminate zoompan runaway frame bugs.
- **Cinematic Subtitles**: Auto-generates Advanced SubStation Alpha (`.ass`) animated subtitles with suspenseful word highlights and burns them cleanly into the master render.
- **Automated Validation**: Automated FFprobe verification checks resolution, duration sync, stream integrity, and frame count before reporting success.

---

## 📂 Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): System architecture, data flow, and directory structure.
- [SETUP_WINDOWS.md](SETUP_WINDOWS.md): Local Windows installation and FFmpeg setup.
- [GOOGLE_API_SETUP.md](GOOGLE_API_SETUP.md): Google AI Studio API setup and consumer AI Pro vs developer API distinction.
- [API_SETUP.md](API_SETUP.md): Comprehensive API configuration.
- [YOUTUBE_SETUP.md](YOUTUBE_SETUP.md): Google Cloud OAuth 2.0 setup for YouTube Data API v3.
- [COST_CONTROL.md](COST_CONTROL.md): Cost modes, Veo budget controls, and safety limits.
- [GITHUB_PAGES_SETUP.md](GITHUB_PAGES_SETUP.md): GitHub Pages frontend deployment and secure triggering.
- [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md): CI/CD worker setup and GitHub Secrets.
- [PROVIDERS.md](PROVIDERS.md): Provider interfaces and pluggable abstractions.
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md): Common errors, FFmpeg tips, and recovery strategies.

---

## 📜 License
MIT License. Created by [Vipul Anand](https://github.com/Vipul2345).
