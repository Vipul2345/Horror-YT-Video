import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { ImageProvider } from '../interfaces.js';
import { config } from '../../config/index.js';
import { Logger } from '../../core/logger.js';

export class GeminiImageProvider implements ImageProvider {
  private client: GoogleGenAI;
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
    this.client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }

  async generateImage(prompt: string, outputPath: string): Promise<string> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.logger.info('IMAGE', `Generating image with ${config.imageModel}: "${prompt.slice(0, 60)}..."`);

    let retries = 3;
    let currentPrompt = prompt;
    let lastError: any = null;

    while (retries > 0) {
      try {
        const response: any = await this.client.interactions.create({
          model: config.imageModel,
          input: currentPrompt,
          response_format: {
            type: 'image',
            aspect_ratio: '16:9',
            image_size: '2K'
          }
        });

        if (!response.output_image || !response.output_image.data) {
          throw new Error('No image bytes in model response.');
        }

        const buffer = Buffer.from(response.output_image.data, 'base64');
        fs.writeFileSync(outputPath, buffer);

        this.logger.info('IMAGE', `Image generated successfully: ${path.basename(outputPath)} (${(buffer.length / 1024).toFixed(1)} KB)`);
        return outputPath;
      } catch (err: any) {
        lastError = err;
        retries--;
        this.logger.warn('IMAGE', `Image generation attempt failed: ${err.message}. Retries left: ${retries}`);
        // Simplify prompt on retry if needed (Rule 30)
        currentPrompt = `Cinematic photorealistic horror shot, 35mm film grain, 16:9: ${prompt.slice(0, 150)}`;
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    throw new Error(`Failed to generate image after retries: ${lastError?.message}`);
  }
}
