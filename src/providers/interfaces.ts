import { StoryStructure, VideoMetadata } from '../types/index.js';

export interface StoryProvider {
  generateStory(topic: string, targetDurationSeconds: number, voice: string): Promise<StoryStructure>;
}

export interface VoiceProvider {
  generateVoice(text: string, voiceOption: string, outputPath: string): Promise<{ audioPath: string; durationSeconds: number }>;
}

export interface ImageProvider {
  generateImage(prompt: string, outputPath: string): Promise<string>;
}

export interface VideoProvider {
  generateVideo(prompt: string, durationSeconds: number, outputPath: string, firstFrameImage?: string): Promise<string>;
}

export interface MusicProvider {
  provideScore(durationSeconds: number, outputPath: string): Promise<string>;
}

export interface SFXProvider {
  provideSoundEffect(effectName: string, outputPath: string): Promise<string>;
}

export interface ThumbnailProvider {
  generateThumbnail(prompt: string, textOverlay: string, outputPath: string): Promise<string>;
}

export interface Publisher {
  upload(videoPath: string, metadata: VideoMetadata): Promise<{ videoId: string; videoUrl: string }>;
}
