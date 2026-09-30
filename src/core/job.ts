import fs from 'fs';
import path from 'path';
import { GenerationInput } from '../types/index.js';
import { Logger } from './logger.js';
import { StatusTracker } from './status.js';
import { config } from '../config/index.js';

export interface JobDirectories {
  rootDir: string;
  voiceDir: string;
  visualsDir: string;
  audioDir: string;
  sfxDir: string;
  captionsDir: string;
  renderDir: string;
  thumbnailDir: string;
}

export class JobManager {
  public readonly jobId: string;
  public readonly dirs: JobDirectories;
  public readonly logger: Logger;
  public readonly status: StatusTracker;
  public readonly input: GenerationInput;

  constructor(input: GenerationInput) {
    this.jobId = input.job_id || `JOB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    this.input = { ...input, job_id: this.jobId };

    const rootDir = path.join(config.jobsDirectory, this.jobId);
    this.dirs = {
      rootDir,
      voiceDir: path.join(rootDir, 'voice'),
      visualsDir: path.join(rootDir, 'visuals'),
      audioDir: path.join(rootDir, 'audio'),
      sfxDir: path.join(rootDir, 'audio', 'sfx'),
      captionsDir: path.join(rootDir, 'captions'),
      renderDir: path.join(rootDir, 'render'),
      thumbnailDir: path.join(rootDir, 'thumbnail')
    };

    this.initDirectories();
    this.logger = new Logger(this.dirs.rootDir);
    this.status = new StatusTracker(this.dirs.rootDir, this.jobId);

    // Save input.json
    this.saveJson('input.json', this.input);
    this.logger.info('INIT', `Job ${this.jobId} initialized successfully at ${rootDir}`);
  }

  private initDirectories() {
    Object.values(this.dirs).forEach(dirPath => {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  public saveJson(fileName: string, data: any) {
    const filePath = path.join(this.dirs.rootDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  public loadJson<T = any>(fileName: string): T | null {
    const filePath = path.join(this.dirs.rootDir, fileName);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  }
}
