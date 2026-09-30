import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { JobManager } from '../core/job.js';
import { config } from '../config/index.js';

export class RenderEngine {
  constructor(private job: JobManager) {}

  public render(
    visualClips: string[],
    masterAudioPath: string,
    captionsPath: string,
    burnCaptions: boolean
  ): string {
    this.job.status.update({
      current_step: 'RENDERING',
      message: 'Assembling final 1080p 16:9 master MP4 with FFmpeg...'
    });

    const finalRenderPath = path.join(this.job.dirs.renderDir, 'final.mp4');

    // 1. Create FFmpeg video concat demuxer file
    const concatListPath = path.join(this.job.dirs.renderDir, 'concat_clips.txt');
    const concatContent = visualClips
      .map(clip => `file '${path.resolve(clip).replace(/\\/g, '/')}'`)
      .join('\n');
    fs.writeFileSync(concatListPath, concatContent, 'utf8');

    // 2. Prepare filter graph for subtitle burn-in
    let videoFilter = 'format=yuv420p';
    if (burnCaptions && fs.existsSync(captionsPath)) {
      // Escape paths for FFmpeg filter on Windows
      const safeAssPath = path.resolve(captionsPath).replace(/\\/g, '/').replace(/:/g, '\\:');
      videoFilter = `subtitles='${safeAssPath}',format=yuv420p`;
    }

    const safeConcatList = path.resolve(concatListPath).replace(/\\/g, '/');
    const safeAudioPath = path.resolve(masterAudioPath).replace(/\\/g, '/');

    this.job.logger.info('RENDER', 'Executing master FFmpeg render pass (1920x1080 30FPS H.264 / AAC)...');

    const renderCmd = `ffmpeg -y -f concat -safe 0 -i "${safeConcatList}" -i "${safeAudioPath}" -vf "${videoFilter}" -c:v libx264 -preset medium -crf 19 -r 30 -c:a aac -b:a 192k -shortest -movflags +faststart "${finalRenderPath}"`;

    try {
      execSync(renderCmd, { stdio: 'pipe' });
    } catch (err: any) {
      this.job.logger.warn('RENDER', `Direct subtitle burn failed (${err.message}). Rendering without burned subtitles...`);
      const fallbackCmd = `ffmpeg -y -f concat -safe 0 -i "${safeConcatList}" -i "${safeAudioPath}" -c:v libx264 -preset fast -crf 20 -r 30 -c:a aac -b:a 192k -shortest "${finalRenderPath}"`;
      execSync(fallbackCmd, { stdio: 'pipe' });
    }

    // 3. Clean up temporary concat list
    if (fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);

    // 4. Save into configured output directory (Rule 36)
    const jobOutputDir = path.join(config.outputDirectory, this.job.jobId);
    if (!fs.existsSync(jobOutputDir)) fs.mkdirSync(jobOutputDir, { recursive: true });
    const outputFinalPath = path.join(jobOutputDir, 'final.mp4');
    fs.copyFileSync(finalRenderPath, outputFinalPath);

    this.job.logger.info('RENDER', `Master video render complete! Saved to:\n- Workspace: ${finalRenderPath}\n- Output: ${outputFinalPath}`);
    return finalRenderPath;
  }
}
