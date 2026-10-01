import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { VoiceProvider } from '../interfaces.js';
import { Logger } from '../../core/logger.js';

export class EdgeTTSVoiceProvider implements VoiceProvider {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }

  async generateVoice(
    text: string,
    voiceOption: string,
    outputPath: string
  ): Promise<{ audioPath: string; durationSeconds: number }> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Select voice according to voiceOption
    let voiceName = 'en-US-ChristopherNeural'; // Deep, eerie horror narration
    if (voiceOption.includes('FEMALE') || voiceOption.includes('KORE')) {
      voiceName = 'en-US-JennyNeural';
    } else if (voiceOption.includes('GUY')) {
      voiceName = 'en-US-GuyNeural';
    } else if (voiceOption.includes('BRITISH') || voiceOption.includes('UK')) {
      voiceName = 'en-GB-RyanNeural';
    }

    const tempTextFile = path.join(dir, `tts_input_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    const tempMp3File = path.join(dir, `tts_temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp3`);
    fs.writeFileSync(tempTextFile, text, 'utf8');

    this.logger.info('VOICE', `Synthesizing with Edge-TTS (${voiceName}, pitch: -10Hz, rate: -5%)...`);

    try {
      // Execute Python edge-tts CLI module
      const cmd = `python -m edge_tts -f "${tempTextFile}" -v "${voiceName}" --rate=-5% --pitch=-10Hz --write-media "${tempMp3File}"`;
      execSync(cmd, { stdio: 'pipe' });

      // Transcode MP3 to WAV 48kHz for pristine audio mixing
      const transcodeCmd = `ffmpeg -y -i "${tempMp3File}" -ar 48000 -ac 2 -c:a pcm_s16le "${outputPath}"`;
      execSync(transcodeCmd, { stdio: 'pipe' });

      // Probe duration with ffprobe
      const probeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`;
      const durationSeconds = parseFloat(execSync(probeCmd, { encoding: 'utf8' }).trim()) || 0;

      this.logger.info('VOICE', `Voiceover generated: ${durationSeconds.toFixed(2)}s -> ${path.basename(outputPath)}`);
      return { audioPath: outputPath, durationSeconds };
    } catch (err: any) {
      this.logger.error('VOICE', `Edge-TTS error: ${err.message}`);
      throw new Error(`Edge-TTS voice generation failed: ${err.message}`);
    } finally {
      if (fs.existsSync(tempTextFile)) fs.unlinkSync(tempTextFile);
      if (fs.existsSync(tempMp3File)) fs.unlinkSync(tempMp3File);
    }
  }
}
