import { VideoPipeline } from '../core/pipeline.js';
import { GenerationInput } from '../types/index.js';
import { config } from '../config/index.js';

function parseArgs(): GenerationInput {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      parsed[key] = value || 'true';
    }
  });

  const topic = parsed['topic'] || "At exactly 3:00 AM every night, a dead woman's phone number calls a security guard inside an abandoned psychiatric hospital.";
  const duration = parseInt(parsed['duration'] || String(config.targetDurationSeconds), 10);
  const voice = parsed['voice'] || 'AUTO';
  const visualMode = parsed['visual_mode'] || 'HYBRID';
  const qualityMode = (parsed['quality'] || config.costMode || 'BALANCED') as any;

  return {
    job_id: parsed['job_id'] || `JOB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    topic,
    duration,
    voice,
    visual_mode: visualMode,
    quality_mode: qualityMode,
    music: parsed['music'] !== 'false',
    sfx: parsed['sfx'] !== 'false',
    captions: parsed['captions'] !== 'false',
    youtube: parsed['youtube'] === 'true',
    created_at: new Date().toISOString()
  };
}

async function main() {
  const input = parseArgs();
  console.log(`Starting generation for topic: "${input.topic}" (Mode: ${input.quality_mode})`);
  const pipeline = new VideoPipeline(input);
  const res = await pipeline.execute();

  if (res.status === 'COMPLETED') {
    console.log(`✓ Video successfully produced at: ${res.video_path}`);
  } else {
    console.error(`Generation failed: ${res.error}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal CLI error:', err);
  process.exit(1);
});
