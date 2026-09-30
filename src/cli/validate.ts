import path from 'path';
import { ValidationEngine } from '../engines/validation_engine.js';
import { JobManager } from '../core/job.js';

async function main() {
  const videoPath = process.argv[2];
  if (!videoPath) {
    console.error('Usage: npm run validate <path/to/video.mp4>');
    process.exit(1);
  }

  const dummyInput = {
    job_id: 'JOB-VALIDATE',
    topic: 'Validation',
    duration: 330,
    voice: 'AUTO',
    visual_mode: 'HYBRID',
    quality_mode: 'TEST' as any,
    music: true,
    sfx: true,
    captions: true,
    youtube: false,
    created_at: new Date().toISOString()
  };

  const job = new JobManager(dummyInput);
  const validator = new ValidationEngine(job);
  const res = validator.validate(path.resolve(videoPath), 330);

  console.log('\nValidation Result:');
  console.log(JSON.stringify(res, null, 2));

  if (!res.valid) {
    process.exit(1);
  }
}

main().catch(console.error);
