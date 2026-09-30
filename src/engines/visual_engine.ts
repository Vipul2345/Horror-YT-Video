import fs from 'fs';
import path from 'path';
import { ImageProvider, VideoProvider } from '../providers/interfaces.js';
import { MasterTimeline, StoryStructure } from '../types/index.js';
import { MotionEngine } from './motion_engine.js';
import { JobManager } from '../core/job.js';

export class VisualEngine {
  private motionEngine: MotionEngine;

  constructor(
    private imageProvider: ImageProvider,
    private videoProvider: VideoProvider,
    private job: JobManager
  ) {
    this.motionEngine = new MotionEngine(job.logger);
  }

  async run(timeline: MasterTimeline, visualMode: string, story?: StoryStructure): Promise<string[]> {
    const renderedClips: string[] = [];
    const totalScenes = timeline.scenes.length;

    // 1. Generate Canonical Reference Assets (Rule 7)
    const refDir = path.join(this.job.dirs.visualsDir, 'references');
    if (!fs.existsSync(refDir)) fs.mkdirSync(refDir, { recursive: true });

    const characterRefMap = new Map<string, string>();
    const locationRefMap = new Map<string, string>();

    if (story) {
      this.job.logger.info('VISUALS', 'Generating canonical reference images for characters and locations...');

      // Characters
      for (const char of story.characters || []) {
        const charRefPath = path.join(refDir, `ref_${char.character_id}.png`);
        try {
          this.job.logger.info('VISUALS', `Generating canonical character reference: ${char.name} (${char.character_id})`);
          await this.imageProvider.generateImage(char.visual_description, charRefPath);
          characterRefMap.set(char.character_id, charRefPath);
        } catch (e: any) {
          this.job.logger.warn('VISUALS', `Could not generate reference for character ${char.character_id}: ${e.message}`);
        }
      }

      // Locations
      for (const loc of story.locations || []) {
        const locRefPath = path.join(refDir, `ref_${loc.location_id}.png`);
        try {
          this.job.logger.info('VISUALS', `Generating canonical location reference: ${loc.name} (${loc.location_id})`);
          await this.imageProvider.generateImage(loc.visual_description, locRefPath);
          locationRefMap.set(loc.location_id, locRefPath);
        } catch (e: any) {
          this.job.logger.warn('VISUALS', `Could not generate reference for location ${loc.location_id}: ${e.message}`);
        }
      }
    }

    this.job.status.update({
      current_step: 'VISUALS',
      total_scenes: totalScenes,
      message: `Rendering ${totalScenes} visual scenes (Mode: ${visualMode})...`
    });

    for (let i = 0; i < totalScenes; i++) {
      const scene = timeline.scenes[i];
      const duration = scene.estimated_duration_seconds || 4.0;
      const isVideoCandidate = scene.visual_type === 'VIDEO' && visualMode !== 'IMAGE_FIRST';

      this.job.status.update({
        current_scene: i + 1,
        message: `Rendering scene ${i + 1}/${totalScenes} (${isVideoCandidate ? 'Google Veo 3.1' : 'Cinematic Still + Motion Engine'})`
      });

      let clipPath: string | null = null;

      // Find matching reference image for starting frame or context
      const firstCharId = scene.character_ids?.[0];
      const primaryRef = (firstCharId && characterRefMap.get(firstCharId)) || (scene.location_id && locationRefMap.get(scene.location_id));

      // 2. Attempt Veo 3.1 Video Generation if candidate
      if (isVideoCandidate) {
        const videoOutputPath = path.join(this.job.dirs.visualsDir, `${scene.scene_id}.mp4`);
        try {
          this.job.logger.info('VISUALS', `Scene ${scene.scene_id} [${i + 1}/${totalScenes}]: Generating Veo 3.1 video clip...`);
          clipPath = await this.videoProvider.generateVideo(
            scene.visual_prompt,
            duration,
            videoOutputPath,
            primaryRef
          );
        } catch (err: any) {
          this.job.logger.warn(
            'VISUALS',
            `Veo 3.1 generation unavailable for ${scene.scene_id} (${err.message}). Activating Image-First fallback.`
          );
          clipPath = null;
        }
      }

      // 3. Image + Motion Engine (Default or Fallback)
      if (!clipPath) {
        const imageOutputPath = path.join(this.job.dirs.visualsDir, `${scene.scene_id}.png`);
        const animVideoPath = path.join(this.job.dirs.visualsDir, `${scene.scene_id}_anim.mp4`);

        this.job.logger.info('VISUALS', `Scene ${scene.scene_id} [${i + 1}/${totalScenes}]: Generating atmospheric still image...`);
        await this.imageProvider.generateImage(scene.visual_prompt, imageOutputPath);

        this.job.logger.info('VISUALS', `Scene ${scene.scene_id}: Animating image into 1080p clip (${duration}s, motion: ${scene.motion_type})...`);
        clipPath = this.motionEngine.animateImage(
          imageOutputPath,
          duration,
          scene.motion_type,
          animVideoPath
        );
      }

      scene.rendered_asset_path = clipPath;
      renderedClips.push(clipPath);
    }

    this.job.saveJson('timeline.json', timeline);
    this.job.logger.info('VISUALS', `All ${renderedClips.length} visual clips generated and verified.`);
    return renderedClips;
  }
}
