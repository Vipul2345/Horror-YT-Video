import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { StoryProvider } from '../interfaces.js';
import { StoryStructure } from '../../types/index.js';
import { config } from '../../config/index.js';
import { Logger } from '../../core/logger.js';

export class GeminiStoryProvider implements StoryProvider {
  private client: GoogleGenAI;
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
    this.client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }

  async generateStory(topic: string, targetDurationSeconds: number, voice: string): Promise<StoryStructure> {
    const promptPath = path.resolve(process.cwd(), 'prompts', 'story_v1.txt');
    const systemPrompt = fs.existsSync(promptPath)
      ? fs.readFileSync(promptPath, 'utf8')
      : 'You are a master horror storyteller. Generate a cinematic long-form horror story.';

    const userPrompt = `
Topic: "${topic}"
Target Duration: ${targetDurationSeconds} seconds (5 to 6 minutes)
Voice Style: ${voice}
Generate a structured horror story in JSON format with canonical characters, canonical locations, and timed scene breakdown.
`;

    this.logger.info('STORY', `Requesting story from ${config.storyModel} for topic: "${topic.slice(0, 50)}..."`);

    let retries = 3;
    let lastError: any = null;

    while (retries > 0) {
      try {
        let outputText = '';
        try {
          const res = await this.client.models.generateContent({
            model: config.storyModel,
            contents: `${systemPrompt}\n\n${userPrompt}`,
            config: {
              responseMimeType: 'application/json'
            }
          });
          outputText = res.text || '';
        } catch (innerErr) {
          // Fallback to interactions API
          const response: any = await this.client.interactions.create({
            model: config.storyModel,
            input: `${systemPrompt}\n\n${userPrompt}`,
            response_format: { type: 'json' }
          });
          outputText = response.output_text || '';
        }

        if (!outputText) {
          throw new Error('Empty response from story model.');
        }

        const parsed = this.parseAndValidate(outputText);

        // Story length check (Rule 11)
        const wordCount = parsed.scenes.reduce((acc, s) => acc + s.narration_text.split(/\s+/).length, 0);
        const estDuration = Math.round(wordCount * 0.42); // ~140 wpm
        parsed.estimated_word_count = wordCount;
        parsed.target_duration_seconds = targetDurationSeconds;

        this.logger.info('STORY', `Story generated successfully: "${parsed.title}" (${wordCount} words, est. ${estDuration}s, ${parsed.scenes.length} scenes)`);
        return parsed;
      } catch (err: any) {
        lastError = err;
        retries--;
        this.logger.warn('STORY', `Story generation attempt failed: ${err.message}. Retries remaining: ${retries}`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    throw new Error(`Failed to generate story after 3 attempts: ${lastError?.message}`);
  }

  private parseAndValidate(jsonText: string): StoryStructure {
    // Strip markdown code fences if present
    const cleaned = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    const data = JSON.parse(cleaned);

    if (!data.title || !Array.isArray(data.scenes) || data.scenes.length === 0) {
      throw new Error('Malformed story JSON: missing title or scenes array.');
    }

    return data as StoryStructure;
  }
}
