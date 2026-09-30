import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { VoiceProvider } from '../interfaces.js';
import { config } from '../../config/index.js';
import { Logger } from '../../core/logger.js';

export class GeminiVoiceProvider implements VoiceProvider {
  private client: GoogleGenAI;
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
    this.client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }

  async generateVoice(text: string, voiceOption: string, outputPath: string): Promise<{ audioPath: string; durationSeconds: number }> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Map voiceOption
    let voiceName = 'Fenrir'; // Default atmospheric deep male
    if (voiceOption.includes('FEMALE') || voiceOption.includes('KORE')) {
      voiceName = 'Kore';
    } else if (voiceOption.includes('AUTO')) {
      voiceName = 'Fenrir';
    }

    this.logger.info('VOICE', `Generating voiceover using ${config.voiceModel} (Voice: ${voiceName})`);

    let retries = 3;
    let lastError: any = null;

    while (retries > 0) {
      try {
        const response: any = await this.client.interactions.create({
          model: config.voiceModel,
          input: `Speak with chilling suspense, measured dread, and cinematic horror narration pace:\n\n${text}`,
          response_format: { type: 'audio' },
          generation_config: {
            speech_config: [{ voice: voiceName }]
          }
        });

        if (!response.output_audio || !response.output_audio.data) {
          throw new Error('No audio returned in model response.');
        }

        const pcmBuffer = Buffer.from(response.output_audio.data, 'base64');
        const rawPcmPath = outputPath.replace(/\.wav$/i, '.raw');
        fs.writeFileSync(rawPcmPath, pcmBuffer);

        // Convert raw 24kHz 16-bit PCM to standard WAV using FFmpeg
        const cmd = `ffmpeg -y -f s16le -ar 24000 -ac 1 -i "${rawPcmPath}" -c:a pcm_s16le "${outputPath}"`;
        execSync(cmd, { stdio: 'pipe' });

        if (fs.existsSync(rawPcmPath)) fs.unlinkSync(rawPcmPath);

        // Measure actual audio duration using ffprobe
        const probeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`;
        const durationSeconds = parseFloat(execSync(probeCmd, { encoding: 'utf8' }).trim()) || 0;

        this.logger.info('VOICE', `Voiceover generated successfully: ${durationSeconds.toFixed(2)}s`);
        return { audioPath: outputPath, durationSeconds };
      } catch (err: any) {
        lastError = err;
        retries--;
        this.logger.warn('VOICE', `Gemini TTS failed: ${err.message}. Retries left: ${retries}`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    throw new Error(`Failed to generate voiceover: ${lastError?.message}`);
  }
}
