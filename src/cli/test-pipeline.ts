import { VideoPipeline } from '../core/pipeline.js';
import { GenerationInput } from '../types/index.js';

async function runTestPipeline() {
  console.log('====================================================');
  console.log('NIGHTFALL AI - END-TO-END PIPELINE VERIFICATION TEST');
  console.log('====================================================');

  const testInput: GenerationInput = {
    job_id: `JOB-TEST-${Date.now().toString(36).toUpperCase()}`,
    topic: "At exactly 3:00 AM every night, a dead woman's phone number calls a security guard inside an abandoned psychiatric hospital.",
    duration: 330,
    voice: "AUTO",
    visual_mode: "HYBRID",
    quality_mode: "TEST",
    music: true,
    sfx: true,
    captions: true,
    youtube: true,
    created_at: new Date().toISOString()
  };

  const pipeline = new VideoPipeline(testInput);
  const result = await pipeline.execute();

  console.log('\n====================================================');
  console.log('TEST PIPELINE EXECUTION SUMMARY:');
  console.log(`Status:       ${result.status}`);
  console.log(`Step:         ${result.current_step}`);
  console.log(`Message:      ${result.message}`);
  console.log(`Video Path:   ${result.video_path}`);
  console.log(`YouTube Link: ${result.youtube_url}`);
  console.log('====================================================\n');

  if (result.status === 'COMPLETED') {
    console.log('✓ All stages succeeded! Test video generated and verified by FFprobe.');
    process.exit(0);
  } else {
    console.error(`❌ Pipeline failed: ${result.error}`);
    process.exit(1);
  }
}

runTestPipeline().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
