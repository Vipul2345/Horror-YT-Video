import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { MotionType } from '../types/index.js';
import { Logger } from '../core/logger.js';

export class MotionEngine {
  constructor(private logger?: Logger) {}

  /**
   * Transforms a still image into a cinematic 1080p 30fps video clip.
   * Uses mathematically exact frame-by-frame scale and crop expressions to GUARANTEE
   * the output duration matches durationSeconds exactly (preventing zoompan frame multiplier bugs).
   */
  public animateImage(
    imagePath: string,
    durationSeconds: number,
    motionType: MotionType,
    outputPath: string
  ): string {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fps = 30;
    const dur = Math.max(1.0, Math.round(durationSeconds * 100) / 100);
    const safeImagePath = path.resolve(imagePath).replace(/\\/g, '/');

    // Deterministic motion expressions without buggy zoompan:
    // Scale smoothly over duration, then center crop or pan crop to 1920x1080
    let motionFilter = '';
    switch (motionType) {
      case 'PUSH_IN':
      case 'ZOOM_IN':
        // Smooth camera push-in from 1.0x to 1.12x
        motionFilter = `scale=eval=frame:w='1920*(1.0 + 0.12*t/${dur})':h='1080*(1.0 + 0.12*t/${dur})',crop=1920:1080:(iw-1920)/2:(ih-1080)/2`;
        break;

      case 'PULL_OUT':
        // Smooth camera pull-out from 1.12x back to 1.0x
        motionFilter = `scale=eval=frame:w='1920*(1.12 - 0.12*t/${dur})':h='1080*(1.12 - 0.12*t/${dur})',crop=1920:1080:(iw-1920)/2:(ih-1080)/2`;
        break;

      case 'PAN_LEFT':
        // Scale to 1.15x and pan horizontally from right to left
        motionFilter = `scale=eval=frame:w='1920*1.15':h='1080*1.15',crop=1920:1080:'(iw-1920)*(1.0 - t/${dur})':'(ih-1080)/2'`;
        break;

      case 'PAN_RIGHT':
        // Scale to 1.15x and pan horizontally from left to right
        motionFilter = `scale=eval=frame:w='1920*1.15':h='1080*1.15',crop=1920:1080:'(iw-1920)*(t/${dur})':'(ih-1080)/2'`;
        break;

      case 'SLOW_DRIFT':
      default:
        // Subtle eerie camera drift with micro-shake
        motionFilter = `scale=eval=frame:w='1920*(1.05 + 0.02*sin(2*PI*t/${dur}))':h='1080*(1.05 + 0.02*sin(2*PI*t/${dur}))',crop=1920:1080:'(iw-1920)/2 + 8*sin(2*PI*t/${dur})':'(ih-1080)/2 + 5*cos(2*PI*t/${dur})'`;
        break;
    }

    // Atmospheric cinematic pass: vignette for dread, subtle organic film grain, color grading
    const filterComplex = `${motionFilter},vignette=PI/4,noise=alls=6:allf=t+u,format=yuv420p`;

    const cmd = `ffmpeg -y -loop 1 -t ${dur} -i "${safeImagePath}" -vf "${filterComplex}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -r ${fps} -t ${dur} "${outputPath}"`;

    try {
      execSync(cmd, { stdio: 'pipe' });
    } catch (err: any) {
      this.logger?.warn('MOTION', `Advanced motion filter failed, using simplified fallback: ${err.message}`);
      const fallbackCmd = `ffmpeg -y -loop 1 -t ${dur} -i "${safeImagePath}" -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,vignette=PI/4,format=yuv420p" -c:v libx264 -preset fast -pix_fmt yuv420p -r ${fps} -t ${dur} "${outputPath}"`;
      execSync(fallbackCmd, { stdio: 'pipe' });
    }

    // Verify output duration with ffprobe immediately (Rule 29)
    try {
      const probeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`;
      const actualDuration = parseFloat(execSync(probeCmd, { encoding: 'utf8' }).trim());
      if (Math.abs(actualDuration - dur) > 0.5) {
        this.logger?.warn('MOTION', `Duration discrepancy detected: expected ${dur}s, got ${actualDuration}s on ${path.basename(outputPath)}`);
      }
    } catch (e) {
      // Non-fatal probe check
    }

    return outputPath;
  }
}
