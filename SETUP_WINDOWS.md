# Windows Setup Guide

This guide walks you through setting up and running the AI Horror YouTube Video Automation Platform locally on Windows 10/11.

---

## 1. Prerequisites

### A. Node.js (v20 or v22)
Ensure Node.js is installed:
```powershell
node -v
npm -v
```
If not installed, download from [nodejs.org](https://nodejs.org).

### B. FFmpeg with libass
FFmpeg and FFprobe must be in your system PATH.
Verify your installation:
```powershell
ffmpeg -version
ffprobe -version
```
Ensure the build includes `--enable-libass` and `--enable-libx264` (recommended: Gyan.dev essentials or full build from [gyan.dev/ffmpeg/builds](https://www.gyan.dev/ffmpeg/builds/)).

### C. Git
Verify Git:
```powershell
git --version
```

---

## 2. Repository Configuration

1. Clone and enter the repository:
```powershell
git clone https://github.com/Vipul2345/Horror-YT-Video.git
cd Horror-YT-Video
```

2. Install dependencies:
```powershell
npm install
```

3. Create your local `.env`:
```powershell
Copy-Item .env.example .env
```

---

## 3. Verify Local Pipeline in $0 Test Mode

Run the complete pipeline using mock assets:
```powershell
npm run test-pipeline
```
This tests:
- Job directory isolation (`jobs/JOB-.../`)
- Story parsing and scene planning
- Drift-free voiceover timing
- FFmpeg 2.5D camera motion (zoom, pan, push/pull)
- Multi-track horror audio mix with EBU R128 loudness normalization
- Synchronized ASS animated subtitles
- Deterministic 1080p 16:9 H.264 rendering
- FFprobe automated QA validation

Check the output file at:
```powershell
output\JOB-TEST-...\final.mp4
```

---

## 4. Launch the Local Web UI
```powershell
npm run serve
```
Open your browser to `http://localhost:3000` to interact with the static frontend.
