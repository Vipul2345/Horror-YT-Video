# Google API Setup & Subscription Notice

## 1. Important Distinction: Consumer Google AI Pro vs. Developer API

> [!WARNING]
> **Consumer Subscription Notice**:
> The 18-month Google AI Pro subscription (e.g. obtained via Jio) provides access to consumer Google products like **Gemini Advanced** at [gemini.google.com](https://gemini.google.com).
>
> It does **NOT** provide unlimited developer API credits or programmatic access for automated backend scripts. Automated scripts require an API key from **Google AI Studio** or **Google Cloud Vertex AI**.

---

## 2. Obtaining Your Gemini Developer API Key

1. Navigate to **Google AI Studio**: [https://aistudio.google.com](https://aistudio.google.com).
2. Sign in with your Google account.
3. Click **Get API key** in the left navigation sidebar.
4. Click **Create API key** (you can create a key in a new or existing Google Cloud project).
5. Copy the generated key and add it to your `.env` file:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```

---

## 3. Official Supported Models (Veo 3.1 & Gemini)

| Capability | Recommended Production Model | Fallback / Alternative | Notes |
| :--- | :--- | :--- | :--- |
| **Video Generation** | `veo-3.1-fast-generate-preview` | `veo-3.1-lite-generate-preview` | **No free tier**. Charged per second. |
| **Story / Script** | `gemini-3.8-flash` | `gemini-2.5-flash` / `gemini-1.5-pro` | Free tier available in AI Studio. |
| **Image Generation** | `gemini-3.1-flash-image` | `gemini-3-pro-image` | High-fidelity 16:9 images. |
| **Speech / TTS** | Google Cloud TTS / Edge-TTS | `gemini-3.1-flash-tts-preview` (Preview) | Edge-TTS neural voices supported. |

---

## 4. Veo 3.1 Cost Rates & Safety Budgets

Veo 3.1 video generation is a paid service billed per second of generated video:

- **Veo 3.1 Standard** (`veo-3.1-generate-preview`): **\$0.40 / sec**
- **Veo 3.1 Fast** (`veo-3.1-fast-generate-preview`): **\$0.10 / sec** (720p), **\$0.12 / sec** (1080p)
- **Veo 3.1 Lite** (`veo-3.1-lite-generate-preview`): **\$0.05 / sec** (720p), **\$0.08 / sec** (1080p)

### Hard Budget Enforcements in Code:
To prevent unexpected charges, the platform enforces hard safety limits in `src/providers/veo/index.ts`:
- `MAX_VEO_SECONDS`: Maximum seconds of video generated per job (Default: `40`).
- `MAX_VEO_SCENES`: Maximum AI video clips allowed per job (Default: `5`).
- `MAX_TOTAL_COST_USD`: Maximum dollar spend limit per job (Default: `10.0`).

If any budget cap is reached, the pipeline **automatically switches to the Image + Motion Engine fallback**, ensuring the video completes without failing or incurring excess charges.
