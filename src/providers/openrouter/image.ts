import fs from 'fs';
import path from 'path';
import { ImageProvider } from '../interfaces.js';
import { Logger } from '../../core/logger.js';

export class OpenRouterImageProvider implements ImageProvider {
  private logger: Logger;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'inclusionai/ming-image-0.1-design', logger?: Logger) {
    this.logger = logger || new Logger();
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateImage(prompt: string, outputPath: string): Promise<string> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.logger.info('IMAGE', `Generating 2D image via OpenRouter (${this.model}): "${prompt.slice(0, 60)}..."`);

    let retries = 2;
    let lastError: any = null;

    // Check if model should default to /images endpoint or chat/completions
    const isDedicatedImageModel = !this.model.includes('gemini') && !this.model.includes('auto');

    while (retries >= 0) {
      try {
        let imageBuffer: Buffer | null = null;

        if (isDedicatedImageModel) {
          // Attempt official /api/v1/images endpoint first
          try {
            imageBuffer = await this.callImagesEndpoint(prompt);
          } catch (imgEndpointErr: any) {
            this.logger.warn('IMAGE', `/api/v1/images endpoint error (${imgEndpointErr.message}). Trying chat/completions fallback...`);
            imageBuffer = await this.callChatCompletionsEndpoint(prompt);
          }
        } else {
          // Attempt chat/completions endpoint first
          try {
            imageBuffer = await this.callChatCompletionsEndpoint(prompt);
          } catch (chatErr: any) {
            if (chatErr.message.includes('/api/v1/images')) {
              this.logger.info('IMAGE', `Switching to /api/v1/images based on OpenRouter instruction.`);
              imageBuffer = await this.callImagesEndpoint(prompt);
            } else {
              throw chatErr;
            }
          }
        }

        if (!imageBuffer) {
          throw new Error('No image buffer returned from OpenRouter.');
        }

        fs.writeFileSync(outputPath, imageBuffer);
        this.logger.info(
          'IMAGE',
          `Image generated successfully via OpenRouter: ${path.basename(outputPath)} (${(imageBuffer.length / 1024).toFixed(1)} KB)`
        );
        return outputPath;
      } catch (err: any) {
        lastError = err;
        retries--;
        this.logger.warn('IMAGE', `OpenRouter attempt failed: ${err.message}. Retries left: ${retries}`);
        if (retries >= 0) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }

    throw new Error(`Failed to generate image via OpenRouter (${this.model}): ${lastError?.message}`);
  }

  private async callImagesEndpoint(prompt: string): Promise<Buffer> {
    const response = await fetch('https://openrouter.ai/api/v1/images', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/Vipul2345/Horror-YT-Video',
        'X-Title': 'Nightfall AI Horror Generator'
      },
      body: JSON.stringify({
        model: this.model,
        prompt: `Cinematic 16:9 horror scene: ${prompt}`
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter /images HTTP ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const item = data?.data?.[0];

    if (!item) {
      throw new Error('No image item returned in data array from /api/v1/images.');
    }

    if (item.b64_json) {
      return Buffer.from(item.b64_json, 'base64');
    }

    if (item.url) {
      const imgRes = await fetch(item.url);
      if (!imgRes.ok) throw new Error(`Failed to download image from ${item.url}`);
      const arrayBuf = await imgRes.arrayBuffer();
      return Buffer.from(arrayBuf);
    }

    throw new Error(`Unexpected item structure from /api/v1/images: ${JSON.stringify(item).slice(0, 100)}`);
  }

  private async callChatCompletionsEndpoint(prompt: string): Promise<Buffer> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/Vipul2345/Horror-YT-Video',
        'X-Title': 'Nightfall AI Horror Generator'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: `Generate a photorealistic 16:9 cinematic horror image: ${prompt}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter chat/completions HTTP ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response content from OpenRouter image generation.');
    }

    // Check for base64 data URI: data:image/png;base64,...
    const base64Match = content.match(/data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)/);
    if (base64Match) {
      return Buffer.from(base64Match[1], 'base64');
    } else if (content.startsWith('data:image')) {
      const parts = content.split('base64,');
      if (parts[1]) return Buffer.from(parts[1].trim(), 'base64');
    } else if (/^[A-Za-z0-9+/=]{100,}$/.test(content.trim())) {
      return Buffer.from(content.trim(), 'base64');
    } else {
      const urlMatch = content.match(/https?:\/\/[^\s"')]+/);
      if (urlMatch) {
        const imgRes = await fetch(urlMatch[0]);
        if (imgRes.ok) {
          const arrayBuf = await imgRes.arrayBuffer();
          return Buffer.from(arrayBuf);
        }
      }
    }

    throw new Error(`Could not parse image data from model response. Preview: ${content.slice(0, 100)}`);
  }
}
