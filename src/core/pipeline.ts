import { GenerationInput, JobStatus } from '../types/index.js';
import { JobManager } from './job.js';
import { StoryEngine } from '../engines/story_engine.js';
import { VoiceEngine } from '../engines/voice_engine.js';
import { VisualEngine } from '../engines/visual_engine.js';
import { AudioEngine } from '../engines/audio_engine.js';
import { CaptionEngine } from '../engines/caption_engine.js';
import { RenderEngine } from '../engines/render_engine.js';
import { ValidationEngine } from '../engines/validation_engine.js';
import { MetadataEngine } from '../engines/metadata_engine.js';
import { ModelResolver } from './model_resolver.js';

import {
  MockStoryProvider,
  MockVoiceProvider,
  MockImageProvider,
  MockVideoProvider,
  MockMusicProvider,
  MockSFXProvider,
  MockThumbnailProvider,
  MockPublisher
} from '../providers/mock/index.js';

import { GeminiStoryProvider } from '../providers/gemini/story.js';
import { GeminiVoiceProvider } from '../providers/gemini/voice.js';
import { GeminiImageProvider } from '../providers/gemini/image.js';
import { EdgeTTSVoiceProvider } from '../providers/voice/edge_tts.js';
import { OpenRouterImageProvider } from '../providers/openrouter/image.js';
import { VeoVideoProvider } from '../providers/veo/index.js';
import { YouTubePublisher } from '../providers/youtube/index.js';
import { config, validateApiKeys } from '../config/index.js';

export class VideoPipeline {
  private job: JobManager;

  constructor(input: GenerationInput) {
    this.job = new JobManager(input);
  }

  public async execute(): Promise<JobStatus> {
    const input = this.job.input;
    const isTestMode = input.quality_mode === 'TEST' || config.costMode === 'TEST';

    this.job.logger.info(
      'PIPELINE',
      `Starting Nightfall AI Pipeline for Job ${this.job.jobId} (Mode: ${input.quality_mode}, Visual: ${input.visual_mode})`
    );

    try {
      if (!isTestMode) {
        validateApiKeys(input.quality_mode);
        // Programmatically resolve and verify models from Google API
        const resolved = await ModelResolver.resolve(input.gemini_key || config.geminiApiKey, this.job.logger);
        config.storyModel = input.story_model || resolved.storyModel;
        config.videoModel = resolved.videoModel;
        config.imageModel = input.image_model || resolved.imageModel;
        this.job.logger.info('PIPELINE', `Active models: Story=${config.storyModel}, Video=${config.videoModel}, Image=${config.imageModel}`);
      }

      // 1. Select Providers based on Cost Mode and User Selection
      const openrouterKey = input.openrouter_key || config.openrouterApiKey;
      const selectedImageModel = input.image_model || config.openrouterImageModel;
      const selectedVoiceEngine = input.voice_engine || config.voiceEngine;

      const storyProvider = isTestMode ? new MockStoryProvider() : new GeminiStoryProvider(this.job.logger);
      const voiceProvider = isTestMode
        ? new MockVoiceProvider()
        : selectedVoiceEngine === 'edge-tts'
        ? new EdgeTTSVoiceProvider(this.job.logger)
        : new GeminiVoiceProvider(this.job.logger);

      const imageProvider = isTestMode
        ? new MockImageProvider()
        : openrouterKey && config.imageProvider === 'openrouter'
        ? new OpenRouterImageProvider(openrouterKey, selectedImageModel, this.job.logger)
        : new GeminiImageProvider(this.job.logger);

      const videoProvider = isTestMode ? new MockVideoProvider() : new VeoVideoProvider(this.job.logger);
      const musicProvider = new MockMusicProvider(); // Royalty-free atmospheric score
      const sfxProvider = new MockSFXProvider();
      const thumbnailProvider = new MockThumbnailProvider();
      const publisher = isTestMode ? new MockPublisher() : new YouTubePublisher(this.job.logger);

      // 2. Story Generation Stage
      const storyEngine = new StoryEngine(storyProvider, this.job);
      const story = await storyEngine.run(input.topic, input.duration, input.voice);

      // 3. Voiceover & Master Timeline
      const voiceEngine = new VoiceEngine(voiceProvider, this.job);
      const timeline = await voiceEngine.run(story, input.voice);

      // 4. Hybrid Visuals Generation (with canonical references)
      const visualEngine = new VisualEngine(imageProvider, videoProvider, this.job);
      const visualClips = await visualEngine.run(timeline, input.visual_mode, story);

      // 5. Soundscape & Audio Mix
      const audioEngine = new AudioEngine(musicProvider, sfxProvider, this.job);
      const masterAudioPath = await audioEngine.run(timeline, input.music, input.sfx);

      // 6. Cinematic Captions
      const captionEngine = new CaptionEngine(this.job);
      const captionsPath = captionEngine.run(timeline);

      // 7. Master Render Assembly
      const renderEngine = new RenderEngine(this.job);
      const finalVideoPath = renderEngine.render(visualClips, masterAudioPath, captionsPath, input.captions);

      // 8. QA & Validation
      const validationEngine = new ValidationEngine(this.job);
      const qaResult = validationEngine.validate(finalVideoPath, timeline.total_duration_seconds);

      if (!qaResult.valid) {
        throw new Error(`Video QA failed: ${qaResult.errors.join('; ')}`);
      }

      // 9. Metadata & Thumbnail
      const metadataEngine = new MetadataEngine(thumbnailProvider, this.job);
      const { metadata } = await metadataEngine.run(story);

      // 10. YouTube Publishing (if enabled)
      let youtubeUrl: string | null = null;
      let videoId: string | null = null;

      if (input.youtube) {
        this.job.status.update({
          current_step: 'YOUTUBE',
          message: 'Publishing to YouTube...'
        });
        try {
          const uploadRes = await publisher.upload(finalVideoPath, metadata);
          youtubeUrl = uploadRes.videoUrl;
          videoId = uploadRes.videoId;
        } catch (uploadErr: any) {
          this.job.logger.warn('YOUTUBE', `YouTube upload skipped or failed: ${uploadErr.message}`);
        }
      }

      // 11. Pipeline Completed Successfully!
      this.job.status.update({
        status: 'COMPLETED',
        current_step: 'COMPLETED',
        progress: 100,
        message: 'Master video generation complete and verified!',
        video_path: finalVideoPath,
        youtube_url: youtubeUrl,
        video_id: videoId,
        error: null
      });

      this.job.logger.info('PIPELINE', `✓ JOB ${this.job.jobId} COMPLETED SUCCESSFULLY! Final video: ${finalVideoPath}`);
      return this.job.status.get();
    } catch (err: any) {
      this.job.logger.error('PIPELINE', `Pipeline execution failed`, err);
      this.job.status.update({
        status: 'FAILED',
        error: err.message || 'Unknown pipeline failure',
        message: `Pipeline halted: ${err.message}`
      });
      return this.job.status.get();
    }
  }
}
