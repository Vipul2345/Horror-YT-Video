import { GoogleGenAI } from '@google/genai';
import { Logger } from './logger.js';

export interface ResolvedModels {
  storyModel: string;
  voiceModel: string;
  imageModel: string;
  videoModel: string;
}

export class ModelResolver {
  private static cachedModels: ResolvedModels | null = null;

  public static async resolve(apiKey: string, logger?: Logger): Promise<ResolvedModels> {
    if (this.cachedModels) return this.cachedModels;

    const defaults: ResolvedModels = {
      storyModel: process.env.STORY_MODEL || 'gemini-3.8-flash',
      voiceModel: process.env.VOICE_MODEL || 'gemini-3.1-flash-tts-preview',
      imageModel: process.env.IMAGE_MODEL || 'gemini-3.1-flash-image',
      videoModel: process.env.VIDEO_MODEL || 'veo-3.1-fast-generate-preview'
    };

    if (!apiKey) {
      this.cachedModels = defaults;
      return defaults;
    }

    try {
      logger?.info('MODELS', 'Connecting to Google GenAI API to query available models...');
      const client = new GoogleGenAI({ apiKey });
      const modelsPager: any = await (client as any).models.list();
      
      const availableIds: string[] = [];
      for await (const m of modelsPager) {
        if (m.name) {
          // Normalize names like "models/gemini-3.8-flash" to "gemini-3.8-flash"
          availableIds.push(m.name.replace(/^models\//, ''));
        }
      }

      logger?.info('MODELS', `Discovered ${availableIds.length} available models from Google API.`);

      // 1. Resolve Story Model
      let storyModel = defaults.storyModel;
      const storyCandidates = [
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
        'gemini-flash-latest',
        'gemini-3.8-flash',
        'gemini-2.5-flash'
      ];
      if (!availableIds.includes(storyModel)) {
        const match = storyCandidates.find(f => availableIds.includes(f));
        if (match) {
          logger?.info('MODELS', `Default story model ${defaults.storyModel} not found. Resolved active model: ${match}`);
          storyModel = match;
        }
      }

      // 2. Resolve Video Model (Veo 3.1)
      let videoModel = defaults.videoModel;
      const veoPreferences = [
        'veo-3.1-fast-generate-preview',
        'veo-3.1-lite-generate-preview',
        'veo-3.1-generate-preview'
      ];
      if (!availableIds.includes(videoModel)) {
        const match = veoPreferences.find(v => availableIds.includes(v));
        if (match) {
          logger?.info('MODELS', `Resolved Veo model: ${match}`);
          videoModel = match;
        }
      }

      this.cachedModels = {
        storyModel,
        voiceModel: defaults.voiceModel,
        imageModel: defaults.imageModel,
        videoModel
      };

      return this.cachedModels;
    } catch (err: any) {
      logger?.warn('MODELS', `Model query failed (${err.message}). Using configured defaults.`);
      this.cachedModels = defaults;
      return defaults;
    }
  }
}
