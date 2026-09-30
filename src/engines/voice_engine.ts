import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { VoiceProvider } from '../providers/interfaces.js';
import { StoryStructure, MasterTimeline, NarrationSegment, ScenePlanItem } from '../types/index.js';
import { JobManager } from '../core/job.js';

export class VoiceEngine {
  constructor(private provider: VoiceProvider, private job: JobManager) {}

  async run(story: StoryStructure, voiceOption: string): Promise<MasterTimeline> {
    this.job.status.update({
      current_step: 'VOICE',
      message: 'Synthesizing voiceover and calculating master timeline...'
    });

    const segments: NarrationSegment[] = [];
    const updatedScenes: ScenePlanItem[] = [];
    const audioChunkPaths: string[] = [];

    let currentTime = 0;

    for (let i = 0; i < story.scenes.length; i++) {
      const scene = story.scenes[i];
      const chunkFileName = `${scene.scene_id}.wav`;
      const chunkPath = path.join(this.job.dirs.voiceDir, chunkFileName);

      this.job.logger.info('VOICE', `Generating narration audio for ${scene.scene_id} (${i + 1}/${story.scenes.length})...`);
      const { audioPath, durationSeconds } = await this.provider.generateVoice(
        scene.narration_text,
        voiceOption,
        chunkPath
      );

      const startTime = Math.round(currentTime * 100) / 100;
      const endTime = Math.round((currentTime + durationSeconds) * 100) / 100;

      segments.push({
        segment_id: `SEG_${String(i + 1).padStart(3, '0')}`,
        scene_id: scene.scene_id,
        start_time: startTime,
        end_time: endTime,
        duration: durationSeconds,
        text: scene.narration_text
      });

      updatedScenes.push({
        ...scene,
        start_time: startTime,
        end_time: endTime,
        estimated_duration_seconds: durationSeconds
      });

      audioChunkPaths.push(audioPath);
      currentTime += durationSeconds;
    }

    // Concatenate all voice chunks into the master voiceover.wav
    const masterVoicePath = path.join(this.job.dirs.voiceDir, 'voiceover.wav');
    const concatListPath = path.join(this.job.dirs.voiceDir, 'concat_list.txt');
    const concatContent = audioChunkPaths
      .map(p => `file '${path.resolve(p).replace(/\\/g, '/')}'`)
      .join('\n');
    fs.writeFileSync(concatListPath, concatContent, 'utf8');

    const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:a pcm_s16le "${masterVoicePath}"`;
    execSync(concatCmd, { stdio: 'pipe' });

    // Clean up temporary concat list
    if (fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);

    // Collect SFX timeline cues
    const sfxCues: Array<{ time: number; effect: string; volume: number }> = [];
    updatedScenes.forEach(sc => {
      sc.sound_effects?.forEach(sfx => {
        sfxCues.push({
          time: Math.round(((sc.start_time || 0) + sfx.trigger_time_relative) * 100) / 100,
          effect: sfx.effect,
          volume: sfx.volume
        });
      });
    });

    const timeline: MasterTimeline = {
      job_id: this.job.jobId,
      total_duration_seconds: Math.round(currentTime * 100) / 100,
      audio_duration_seconds: Math.round(currentTime * 100) / 100,
      narration_segments: segments,
      scenes: updatedScenes,
      sfx_cues: sfxCues
    };

    // Save narration.json and timeline.json (Rule 9)
    this.job.saveJson('narration.json', segments);
    this.job.saveJson('timeline.json', timeline);

    this.job.logger.info(
      'VOICE',
      `Master voiceover complete: ${timeline.total_duration_seconds.toFixed(2)}s across ${segments.length} segments.`
    );

    return timeline;
  }
}
