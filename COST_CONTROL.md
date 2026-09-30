# Cost Control & Budget Architecture

Nightfall AI implements strict cost management to prevent unintended API charges, particularly with Google Veo 3.1 video generation.

---

## 1. Cost Modes

The platform supports three distinct modes via the `COST_MODE` setting or `--quality` CLI flag:

### `TEST` Mode ($0.00 Cost)
- **API Calls**: 0 external billable calls.
- **Visuals**: Deterministic mock horror frames animated via local FFmpeg.
- **Voice**: Synthetic pitch-modulated cadence audio matching exact sentence durations.
- **Music/SFX**: Local synthetic horror drone and sound effects generated via FFmpeg.
- **Verification**: Complete FFprobe QA verification of a real 1080p MP4 file.
- **Use Case**: CI/CD testing, local UI verification, pipeline health checks.

### `BALANCED` Mode (Recommended Production)
- **Hybrid Visual Engine**: Allocates Veo 3.1 video clips only for 2–4 dramatic climax/reveal scenes where motion is essential to the dread.
- **Gemini 3.1 Flash Image**: Used for establishing shots, claustrophobic corridors, and portraits.
- **FFmpeg Motion Engine**: Transforms all stills into cinematic 1080p clips with Ken Burns camera movement, vignette, and film grain.
- **Hard Cost Limits**: Respects `MAX_VEO_SECONDS` and `MAX_VEO_SCENES`.

### `QUALITY` Mode
- **Higher Veo Allocation**: Allows up to `MAX_VEO_SCENES` (default: 5 scenes, ~40 seconds total video).
- **Safety Ceiling**: Protected by `MAX_TOTAL_COST_USD`.

---

## 2. Configurable Safety Limits

Set these environment variables in your `.env` or GitHub Secrets:

```env
# Maximum total Veo video duration in seconds per job (Default: 40)
MAX_VEO_SECONDS=40

# Maximum number of Veo generated scenes per job (Default: 5)
MAX_VEO_SCENES=5

# Maximum allowable total spend on video generation per job (Default: $10.00)
MAX_TOTAL_COST_USD=10.0

# Hard cap on total visual beats across the story (Default: 45)
MAX_TOTAL_SCENES=45
```

---

## 3. Automatic Graceful Fallback (Rule 52)

If:
1. `MAX_VEO_SECONDS` is reached, OR
2. `MAX_VEO_SCENES` is reached, OR
3. `MAX_TOTAL_COST_USD` is reached, OR
4. Veo API returns quota or regional restriction errors,

The pipeline **never crashes or aborts**. Instead:
- It logs the budget trigger safely.
- It seamlessly routes the scene to `Gemini 3.1 Flash Image` + `MotionEngine`.
- The final video renders completely and passes QA without missing scenes.
