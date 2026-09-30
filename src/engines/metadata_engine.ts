import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { ThumbnailProvider } from '../providers/interfaces.js';
import { StoryStructure, VideoMetadata } from '../types/index.js';
import { JobManager } from '../core/job.js';
import { config } from '../config/index.js';

export class MetadataEngine {
  constructor(
    private thumbnailProvider: ThumbnailProvider,
    private job: JobManager
  ) {}

  async run(story: StoryStructure): Promise<{ metadata: VideoMetadata; thumbnailPath: string }> {
    this.job.status.update({
      current_step: 'YOUTUBE',
      message: 'Generating high-CTR thumbnail and optimized YouTube metadata...'
    });

    // 1. Generate YouTube Metadata
    const metadata = await this.generateMetadata(story);
    this.job.saveJson('metadata.json', metadata);

    // 2. Generate Thumbnail
    const thumbnailPath = path.join(this.job.dirs.thumbnailDir, 'thumbnail.png');
    const overlayText = story.title.length > 25 ? 'DON\'T ANSWER IT' : story.title.toUpperCase();
    const thumbnailPrompt = `Horror movie poster thumbnail of ${story.characters[0]?.name || 'a security guard'} terrified in ${story.locations[0]?.name || 'an abandoned hospital'}, dramatic crimson rim lighting, high contrast, 8k resolution, 16:9 aspect ratio`;

    this.job.logger.info('METADATA', `Generating thumbnail image...`);
    await this.thumbnailProvider.generateThumbnail(thumbnailPrompt, overlayText, thumbnailPath);

    return { metadata, thumbnailPath };
  }

  private async generateMetadata(story: StoryStructure): Promise<VideoMetadata> {
    if (config.costMode !== 'TEST' && config.geminiApiKey) {
      try {
        const client = new GoogleGenAI({ apiKey: config.geminiApiKey });
        const prompt = `Generate YouTube metadata for this horror story:
Title: ${story.title}
Logline: ${story.logline}
Hook: ${story.hook}

Return valid JSON with:
{
  "title": "Chilling title under 70 chars",
  "description": "Engaging 400 word horror description with timestamps",
  "tags": ["scary stories", "horror", "creepypasta", ...],
  "hashtags": ["#HorrorStories", "#Scary", "#Horror"],
  "category_id": "24"
}`;
        const res: any = await client.interactions.create({
          model: config.storyModel,
          input: prompt,
          response_format: { type: 'json' }
        });
        const parsed = JSON.parse(res.output_text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim());
        return {
          title: parsed.title || story.title,
          description: parsed.description || `${story.hook}\n\n${story.logline}\n\nOriginal horror story produced by Nightfall AI.`,
          tags: parsed.tags || ['horror stories', 'scary narration', 'creepy tales', 'abandoned hospital'],
          hashtags: parsed.hashtags || ['#HorrorStories', '#ScaryTale', '#Horror'],
          category_id: parsed.category_id || '24',
          privacy_status: config.youtubePrivacyStatus
        };
      } catch (err: any) {
        this.job.logger.warn('METADATA', `Gemini metadata generation failed: ${err.message}. Using structured fallback.`);
      }
    }

    // Default structured metadata
    return {
      title: `${story.title} | True Horror Story Narration`,
      description: `${story.hook}\n\n${story.logline}\n\nTimestamps:\n0:00 - The Mystery Begins\n1:30 - Strange Discoveries\n3:45 - The Confrontation\n5:00 - The Final Twist\n\nOriginal audio drama created with Nightfall AI.\nSubscribe for nightly chilling horror stories.`,
      tags: [
        'horror stories',
        'scary stories',
        'creepy stories',
        'horror narration',
        'abandoned hospital horror',
        'creepypasta',
        'nightfall ai'
      ],
      hashtags: ['#HorrorStories', '#CreepyTales', '#Scary'],
      category_id: '24',
      privacy_status: config.youtubePrivacyStatus
    };
  }
}
