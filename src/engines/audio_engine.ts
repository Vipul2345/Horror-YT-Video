import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { MusicProvider, SFXProvider } from '../providers/interfaces.js';
import { MasterTimeline } from '../types/index.js';
import { JobManager } from '../core/job.js';

export class AudioEngine {
  constructor(
    private musicProvider: MusicProvider,
    private sfxProvider: SFXProvider,
    private job: JobManager
  ) {}

  async run(timeline: MasterTimeline, enableMusic: boolean, enableSfx: boolean): Promise<string> {
    this.job.status.update({
      current_step: 'AUDIO_MIX',
      message: 'Composing horror score, room ambience, and SFX layer...'
    });

    const totalDuration = timeline.total_duration_seconds;
    const voiceoverPath = path.join(this.job.dirs.voiceDir, 'voiceover.wav');
    const masterAudioPath = path.join(this.job.dirs.audioDir, 'master_audio.wav');

    // 1. Generate Music
    const musicPath = path.join(this.job.dirs.audioDir, 'music.wav');
    if (enableMusic) {
      this.job.logger.info('AUDIO', `Generating background horror score (${totalDuration}s)...`);
      await this.musicProvider.provideScore(totalDuration, musicPath);
    }

    // 2. Generate Ambience Drone
    const ambiencePath = path.join(this.job.dirs.audioDir, 'ambience.wav');
    this.job.logger.info('AUDIO', `Synthesizing low-frequency horror ambience drone...`);
    const ambCmd = `ffmpeg -y -f lavfi -i "sine=frequency=42:duration=${totalDuration}" -af "volume=0.12,lowpass=f=150" -c:a pcm_s16le "${ambiencePath}"`;
    execSync(ambCmd, { stdio: 'pipe' });

    // 3. Generate and Time SFX Cues
    const sfxInputs: Array<{ path: string; delayMs: number; volume: number }> = [];
    if (enableSfx && timeline.sfx_cues.length > 0) {
      this.job.logger.info('AUDIO', `Processing ${timeline.sfx_cues.length} sound effect cues...`);
      for (let i = 0; i < timeline.sfx_cues.length; i++) {
        const cue = timeline.sfx_cues[i];
        const cueFileName = `sfx_${String(i + 1).padStart(3, '0')}_${cue.effect}.wav`;
        const cuePath = path.join(this.job.dirs.sfxDir, cueFileName);

        await this.sfxProvider.provideSoundEffect(cue.effect, cuePath);
        sfxInputs.push({
          path: cuePath,
          delayMs: Math.max(0, Math.round(cue.time * 1000)),
          volume: cue.volume || 0.3
        });
      }
    }

    // Save sfx_timeline.json (Rule 26)
    this.job.saveJson('sfx_timeline.json', timeline.sfx_cues);

    // 4. Construct Multi-Stream Audio Mix Filter with FFmpeg
    // Inputs:
    // [0] = voiceover.wav
    // [1] = ambience.wav
    // [2] = music.wav (if enabled)
    // [3..N] = SFX cues
    const inputArgs: string[] = [
      `-i "${path.resolve(voiceoverPath).replace(/\\/g, '/')}"`,
      `-i "${path.resolve(ambiencePath).replace(/\\/g, '/')}"`
    ];

    let filterChains: string[] = [
      `[0:a]volume=1.0[voice]`,
      `[1:a]volume=0.15[amb]`
    ];
    let mixInputs = ['[voice]', '[amb]'];

    if (enableMusic && fs.existsSync(musicPath)) {
      inputArgs.push(`-i "${path.resolve(musicPath).replace(/\\/g, '/')}"`);
      const musicIdx = inputArgs.length - 1;
      // Sidechain ducking or volume envelope for background score
      filterChains.push(`[${musicIdx}:a]volume=0.20,afade=t=in:ss=0:d=3.0,afade=t=out:st=${Math.max(0, totalDuration - 3)}:d=3.0[music]`);
      mixInputs.push('[music]');
    }

    sfxInputs.forEach((sfx, idx) => {
      inputArgs.push(`-i "${path.resolve(sfx.path).replace(/\\/g, '/')}"`);
      const sfxIdx = inputArgs.length - 1;
      const sfxLabel = `[sfx${idx}]`;
      filterChains.push(`[${sfxIdx}:a]adelay=${sfx.delayMs}|${sfx.delayMs},volume=${sfx.volume}${sfxLabel}`);
      mixInputs.push(sfxLabel);
    });

    filterChains.push(
      `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=2,loudnorm=I=-16:TP=-1.5:LRA=11[outa]`
    );

    const fullCmd = `ffmpeg -y ${inputArgs.join(' ')} -filter_complex "${filterChains.join(';')}" -map "[outa]" -c:a pcm_s16le "${masterAudioPath}"`;

    this.job.logger.info('AUDIO', 'Mixing master soundtrack with EBU R128 loudness normalization...');
    execSync(fullCmd, { stdio: 'pipe' });

    this.job.logger.info('AUDIO', `Master audio mix produced at: ${masterAudioPath}`);
    return masterAudioPath;
  }
}
