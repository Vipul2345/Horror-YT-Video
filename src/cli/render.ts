import fs from 'fs';
import path from 'path';
import { RenderEngine } from '../engines/render_engine.js';
import { JobManager } from '../core/job.js';
import { MasterTimeline } from '../types/index.js';

async function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error('Usage: npm run render <JOB_ID>');
    process.exit(1);
  }

  const jobDir = path.resolve(process.cwd(), 'jobs', jobId);
  if (!fs.existsSync(jobDir)) {
    console.error(`Job directory not found: ${jobDir}`);
    process.exit(1);
  }

  const input = JSON.parse(fs.readFileSync(path.join(jobDir, 'input.json'), 'utf8'));
  const timeline: MasterTimeline = JSON.parse(fs.readFileSync(path.join(jobDir, 'timeline.json'), 'utf8'));

  const job = new JobManager(input);
  const renderEngine = new RenderEngine(job);

  const visualClips = timeline.scenes.map(s => s.rendered_asset_path || path.join(job.dirs.visualsDir, `${s.scene_id}_anim.mp4`));
  const masterAudioPath = path.join(job.dirs.audioDir, 'master_audio.wav');
  const captionsPath = path.join(job.dirs.captionsDir, 'captions.ass');

  const finalVideo = renderEngine.render(visualClips, masterAudioPath, captionsPath, input.captions !== false);
  console.log(`✓ Render completed: ${finalVideo}`);
}

main().catch(console.error);
