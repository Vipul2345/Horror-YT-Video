import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { VideoProvider } from '../interfaces.js';
import { config } from '../../config/index.js';
import { Logger } from '../../core/logger.js';

export interface VeoCostTracker {
  usedScenes: number;
  usedSeconds: number;
  totalCostUsd: number;
}

export class VeoVideoProvider implements VideoProvider {
  private client: GoogleGenAI;
  private logger: Logger;
  private costTracker: VeoCostTracker = {
    usedScenes: 0,
    usedSeconds: 0,
    totalCostUsd: 0
  };

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
    this.client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }

  /**
   * Generates a video clip using Google Veo 3.1 API.
   * Models supported:
   * - veo-3.1-fast-generate-preview (Preferred)
   * - veo-3.1-lite-generate-preview (Low-cost fallback)
   * - veo-3.1-generate-preview (Quality)
   */
  async generateVideo(
    prompt: string,
    durationSeconds: number,
    outputPath: string,
    firstFrameImage?: string
  ): Promise<string> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const clipSeconds = Math.max(3, Math.min(8, Math.round(durationSeconds)));
    const targetModel = config.videoModel || 'veo-3.1-fast-generate-preview';

    // Pricing calculation per official Google Cloud / AI Studio rates
    let pricePerSecond = 0.12; // veo-3.1-fast-generate-preview 1080p default
    if (targetModel.includes('lite')) {
      pricePerSecond = 0.08;
    } else if (targetModel === 'veo-3.1-generate-preview') {
      pricePerSecond = 0.40;
    }

    const estimatedClipCost = clipSeconds * pricePerSecond;

    // Hard safety budget checks (Rules 5, 20, 50)
    if (this.costTracker.usedScenes >= config.maxVeoScenes) {
      this.logger.warn('VEO', `Veo scene budget reached (${this.costTracker.usedScenes}/${config.maxVeoScenes} scenes). Falling back to image animation.`);
      throw new Error('VEO_MAX_SCENES_REACHED');
    }

    if ((this.costTracker.usedSeconds + clipSeconds) > config.maxVeoSeconds) {
      this.logger.warn('VEO', `Veo seconds budget reached (${this.costTracker.usedSeconds}s + ${clipSeconds}s > ${config.maxVeoSeconds}s limit). Falling back to image animation.`);
      throw new Error('VEO_MAX_SECONDS_REACHED');
    }

    if ((this.costTracker.totalCostUsd + estimatedClipCost) > config.maxTotalCostUsd) {
      this.logger.warn('VEO', `Veo total cost budget limit reached ($${this.costTracker.totalCostUsd.toFixed(2)} + $${estimatedClipCost.toFixed(2)} > $${config.maxTotalCostUsd.toFixed(2)}). Falling back to image animation.`);
      throw new Error('VEO_MAX_COST_REACHED');
    }

    this.logger.info(
      'VEO',
      `Submitting Veo 3.1 job to ${targetModel} (${clipSeconds}s, est. cost: $${estimatedClipCost.toFixed(2)})...`
    );

    let retries = 2;
    let lastError: any = null;

    while (retries > 0) {
      try {
        const videoConfig: any = {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '16:9'
        };

        const generateParams: any = {
          model: targetModel,
          prompt,
          config: videoConfig
        };

        if (firstFrameImage && fs.existsSync(firstFrameImage)) {
          const imgBuffer = fs.readFileSync(firstFrameImage);
          generateParams.image = {
            imageBytes: imgBuffer.toString('base64'),
            mimeType: 'image/png'
          };
        }

        // Start long-running Veo 3.1 operation
        let operation: any = await (this.client as any).models.generateVideos(generateParams);

        // Poll operation status until complete
        const pollStartTime = Date.now();
        const maxWaitMs = 180000; // 3 minutes timeout

        while (!operation.done) {
          if (Date.now() - pollStartTime > maxWaitMs) {
            throw new Error(`Veo 3.1 operation timed out after ${maxWaitMs / 1000}s`);
          }
          this.logger.info('VEO', `Waiting for Veo 3.1 rendering to complete...`);
          await new Promise(r => setTimeout(r, 10000));
          operation = await (this.client as any).operations.getVideosOperation({ operation });
        }

        if (operation.error) {
          throw new Error(`Veo operation returned error: ${JSON.stringify(operation.error)}`);
        }

        const videoFile = operation.response?.generatedVideos?.[0]?.video;
        if (!videoFile) {
          throw new Error('No video object returned in Veo operation response.');
        }

        // Download generated video
        await (this.client as any).files.download({
          file: videoFile,
          downloadPath: outputPath
        });

        // Update cost tracking
        this.costTracker.usedScenes++;
        this.costTracker.usedSeconds += clipSeconds;
        this.costTracker.totalCostUsd += estimatedClipCost;

        this.logger.info(
          'VEO',
          `✓ Veo 3.1 clip completed: ${path.basename(outputPath)} (${clipSeconds}s). Total Veo spend: $${this.costTracker.totalCostUsd.toFixed(2)}`
        );

        return outputPath;
      } catch (err: any) {
        lastError = err;
        retries--;
        this.logger.warn('VEO', `Veo 3.1 generation error: ${err.message}. Retries left: ${retries}`);
        await new Promise(r => setTimeout(r, 4000));
      }
    }

    throw new Error(`Veo 3.1 generation failed: ${lastError?.message}`);
  }

  public getCostTracker(): VeoCostTracker {
    return { ...this.costTracker };
  }
}
