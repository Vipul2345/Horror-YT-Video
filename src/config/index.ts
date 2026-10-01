import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface AppConfig {
  geminiApiKey: string;
  openrouterApiKey: string;
  openrouterImageModel: string;
  imageProvider: string;
  voiceEngine: 'edge-tts' | 'gemini';
  storyModel: string;
  voiceModel: string;
  imageModel: string;
  videoModel: string;
  youtubeClientId: string;
  youtubeClientSecret: string;
  youtubeRefreshToken: string;
  youtubePrivacyStatus: 'private' | 'unlisted' | 'public';
  costMode: 'TEST' | 'BALANCED' | 'QUALITY';
  maxVeoSeconds: number;
  maxVeoScenes: number;
  maxTotalCostUsd: number;
  maxTotalScenes: number;
  targetDurationSeconds: number;
  outputDirectory: string;
  jobsDirectory: string;
}

export const config: AppConfig = {
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openrouterImageModel: process.env.OPENROUTER_IMAGE_MODEL || 'inclusionai/ming-image-0.1-design',
  imageProvider: process.env.IMAGE_PROVIDER || 'openrouter',
  voiceEngine: (process.env.VOICE_ENGINE as 'edge-tts' | 'gemini') || 'edge-tts',
  storyModel: process.env.STORY_MODEL || 'gemini-3.5-flash-lite',
  voiceModel: process.env.VOICE_MODEL || 'gemini-3.1-flash-tts-preview',
  imageModel: process.env.IMAGE_MODEL || 'gemini-3.1-flash-image',
  videoModel: process.env.VIDEO_MODEL || 'veo-3.1-fast-generate-preview',
  youtubeClientId: process.env.YOUTUBE_CLIENT_ID || '',
  youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
  youtubeRefreshToken: process.env.YOUTUBE_REFRESH_TOKEN || '',
  youtubePrivacyStatus: (process.env.YOUTUBE_PRIVACY_STATUS as 'private' | 'unlisted' | 'public') || 'private',
  costMode: (process.env.COST_MODE as 'TEST' | 'BALANCED' | 'QUALITY') || 'TEST',
  maxVeoSeconds: parseInt(process.env.MAX_VEO_SECONDS || '40', 10),
  maxVeoScenes: parseInt(process.env.MAX_VEO_SCENES || '5', 10),
  maxTotalCostUsd: parseFloat(process.env.MAX_TOTAL_COST_USD || '10.0'),
  maxTotalScenes: parseInt(process.env.MAX_TOTAL_SCENES || '45', 10),
  targetDurationSeconds: parseInt(process.env.TARGET_DURATION_SECONDS || '330', 10),
  outputDirectory: path.resolve(process.cwd(), process.env.OUTPUT_DIRECTORY || './output'),
  jobsDirectory: path.resolve(process.cwd(), process.env.JOBS_DIRECTORY || './jobs')
};

export function validateApiKeys(costMode: 'TEST' | 'BALANCED' | 'QUALITY') {
  if (costMode !== 'TEST') {
    if (!config.geminiApiKey) {
      throw new Error(
        'Missing GEMINI_API_KEY for non-TEST generation. Please add GEMINI_API_KEY in your .env file or set COST_MODE=TEST.'
      );
    }
  }
}
