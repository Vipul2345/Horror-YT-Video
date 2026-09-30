import fs from 'fs';
import { google } from 'googleapis';
import { Publisher } from '../interfaces.js';
import { VideoMetadata } from '../../types/index.js';
import { config } from '../../config/index.js';
import { Logger } from '../../core/logger.js';

export class YouTubePublisher implements Publisher {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }

  async upload(videoPath: string, metadata: VideoMetadata): Promise<{ videoId: string; videoUrl: string }> {
    if (!config.youtubeClientId || !config.youtubeClientSecret || !config.youtubeRefreshToken) {
      throw new Error(
        'Missing YouTube OAuth credentials (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN). Cannot publish to YouTube.'
      );
    }

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found at ${videoPath}`);
    }

    this.logger.info('YOUTUBE', `Initializing YouTube OAuth client for upload: "${metadata.title}"`);

    const oauth2Client = new google.auth.OAuth2(
      config.youtubeClientId,
      config.youtubeClientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: config.youtubeRefreshToken
    });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });

    const fileSize = fs.statSync(videoPath).size;
    this.logger.info('YOUTUBE', `Starting upload of ${(fileSize / (1024 * 1024)).toFixed(2)} MB to YouTube...`);

    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          categoryId: metadata.category_id || '24', // Entertainment
          defaultLanguage: 'en'
        },
        status: {
          privacyStatus: metadata.privacy_status || config.youtubePrivacyStatus || 'private',
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fs.createReadStream(videoPath)
      }
    });

    const videoId = res.data.id;
    if (!videoId) {
      throw new Error('YouTube upload completed but returned no video ID.');
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    this.logger.info('YOUTUBE', `✓ Video successfully uploaded to YouTube! Video ID: ${videoId}, URL: ${videoUrl}`);

    return { videoId, videoUrl };
  }
}
