import fs from 'fs';
import { execSync } from 'child_process';
import { JobManager } from '../core/job.js';

export interface ValidationResult {
  valid: boolean;
  duration: number;
  width: number;
  height: number;
  fps: number;
  hasVideoStream: boolean;
  hasAudioStream: boolean;
  errors: string[];
}

export class ValidationEngine {
  constructor(private job: JobManager) {}

  public validate(videoPath: string, expectedDurationSeconds: number): ValidationResult {
    this.job.status.update({
      current_step: 'QA',
      message: 'Running rigorous FFprobe video quality and stream validation...'
    });

    const errors: string[] = [];

    if (!fs.existsSync(videoPath)) {
      errors.push(`Final video file does not exist at ${videoPath}`);
      return this.failResult(errors);
    }

    const fileSize = fs.statSync(videoPath).size;
    if (fileSize < 100 * 1024) { // Less than 100KB is definitely corrupt or empty
      errors.push(`Video file size is unreasonably small (${fileSize} bytes)`);
    }

    // Inspect format and streams via ffprobe
    let probeData: any = null;
    try {
      const probeCmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
      const output = execSync(probeCmd, { encoding: 'utf8' });
      probeData = JSON.parse(output);
    } catch (err: any) {
      errors.push(`FFprobe failed to inspect video file: ${err.message}`);
      return this.failResult(errors);
    }

    const videoStream = probeData.streams?.find((s: any) => s.codec_type === 'video');
    const audioStream = probeData.streams?.find((s: any) => s.codec_type === 'audio');

    if (!videoStream) errors.push('No video stream found in rendered MP4.');
    if (!audioStream) errors.push('No audio stream found in rendered MP4.');

    const duration = parseFloat(probeData.format?.duration || '0');
    const width = videoStream?.width || 0;
    const height = videoStream?.height || 0;
    
    // FPS evaluation
    let fps = 0;
    if (videoStream?.r_frame_rate) {
      const parts = videoStream.r_frame_rate.split('/');
      fps = parts.length === 2 ? Math.round(parseInt(parts[0], 10) / parseInt(parts[1], 10)) : parseInt(parts[0], 10);
    }

    // Validate resolution
    if (width !== 1920 || height !== 1080) {
      this.job.logger.warn('QA', `Resolution check: ${width}x${height} (Expected 1920x1080)`);
    }

    // Validate audio duration sync
    const audioDuration = parseFloat(audioStream?.duration || probeData.format?.duration || '0');
    const durationDelta = Math.abs(duration - audioDuration);
    if (durationDelta > 1.5) {
      errors.push(`Video and audio streams are out of sync by ${durationDelta.toFixed(2)}s`);
    }

    const valid = errors.length === 0;

    if (valid) {
      this.job.logger.info(
        'QA',
        `✓ Video validation passed: ${width}x${height} @ ${fps}fps, duration: ${duration.toFixed(2)}s, streams intact.`
      );
    } else {
      this.job.logger.error('QA', `Validation failed with errors: ${errors.join(', ')}`);
    }

    return {
      valid,
      duration,
      width,
      height,
      fps,
      hasVideoStream: !!videoStream,
      hasAudioStream: !!audioStream,
      errors
    };
  }

  private failResult(errors: string[]): ValidationResult {
    return {
      valid: false,
      duration: 0,
      width: 0,
      height: 0,
      fps: 0,
      hasVideoStream: false,
      hasAudioStream: false,
      errors
    };
  }
}
