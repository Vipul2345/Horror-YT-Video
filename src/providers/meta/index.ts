import { Publisher } from '../interfaces.js';
import { VideoMetadata } from '../../types/index.js';
import { Logger } from '../../core/logger.js';

export class InstagramPublisher implements Publisher {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }

  async upload(videoPath: string, metadata: VideoMetadata): Promise<{ videoId: string; videoUrl: string }> {
    this.logger.warn(
      'INSTAGRAM',
      'Instagram publishing requires Meta Graph API with an Instagram Business/Creator account connected to a Facebook Page, instagram_content_publish permission, app review, and publicly accessible HTTPS video hosting. Instagram publisher is not enabled in V1.'
    );
    throw new Error(
      'Instagram publishing is disabled: Meta Graph API content_publishing permissions and public CDN video hosting are not configured.'
    );
  }
}

export class FacebookPublisher implements Publisher {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }

  async upload(videoPath: string, metadata: VideoMetadata): Promise<{ videoId: string; videoUrl: string }> {
    this.logger.warn(
      'FACEBOOK',
      'Facebook publishing requires Facebook Graph API with pages_manage_posts and pages_read_engagement permissions and an active Page Access Token. Facebook publisher is not enabled in V1.'
    );
    throw new Error(
      'Facebook publishing is disabled: Facebook Page Access Token and pages_manage_posts permissions are not configured.'
    );
  }
}
