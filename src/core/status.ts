import fs from 'fs';
import path from 'path';
import { JobStatus } from '../types/index.js';

export class StatusTracker {
  private statusFilePath: string;
  private currentStatus: JobStatus;

  constructor(jobDir: string, jobId: string) {
    this.statusFilePath = path.join(jobDir, 'status.json');
    this.currentStatus = {
      job_id: jobId,
      status: 'PENDING',
      current_step: 'INIT',
      progress: 0,
      current_scene: 0,
      total_scenes: 0,
      message: 'Job initialized',
      video_path: null,
      youtube_url: null,
      video_id: null,
      error: null,
      estimated_cost: 0,
      actual_cost: 0,
      updated_at: new Date().toISOString()
    };
    this.persist();
  }

  public update(partial: Partial<JobStatus>) {
    this.currentStatus = {
      ...this.currentStatus,
      ...partial,
      updated_at: new Date().toISOString()
    };
    this.persist();
  }

  public get(): JobStatus {
    return { ...this.currentStatus };
  }

  private persist() {
    try {
      fs.writeFileSync(this.statusFilePath, JSON.stringify(this.currentStatus, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write status.json:', err);
    }
  }
}
