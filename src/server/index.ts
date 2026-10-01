import http from 'http';
import fs from 'fs';
import path from 'path';
import { VideoPipeline } from '../core/pipeline.js';
import { GenerationInput } from '../types/index.js';
import { config } from '../config/index.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const JOBS_DIR = path.resolve(process.cwd(), 'jobs');
const OUTPUT_DIR = path.resolve(process.cwd(), 'output');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ass': 'text/plain',
  '.txt': 'text/plain'
};

function serveStaticFile(filePath: string, res: http.ServerResponse): boolean {
  if (!fs.existsSync(filePath)) return false;

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath)) return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': fs.statSync(filePath).size,
    'Access-Control-Allow-Origin': '*'
  });

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  // Enable CORS for local testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  // 1. API: POST /api/generate
  if (req.method === 'POST' && pathname === '/api/generate') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload: Partial<GenerationInput> = JSON.parse(body);
        if (!payload.topic) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Topic is required.' }));
          return;
        }

        const jobId = payload.job_id || `JOB-${Date.now()}`;
        const input: GenerationInput = {
          job_id: jobId,
          topic: payload.topic,
          duration: payload.duration || 330,
          voice: payload.voice || 'SINISTER_WHISPER',
          visual_mode: (payload.visual_mode as any) || 'IMAGE_MOTION',
          quality_mode: (payload.quality_mode as any) || 'BALANCED',
          music: payload.music !== false,
          sfx: payload.sfx !== false,
          captions: payload.captions !== false,
          youtube: payload.youtube === true,
          image_model: payload.image_model || config.openrouterImageModel,
          story_model: payload.story_model || config.storyModel,
          voice_engine: payload.voice_engine || config.voiceEngine,
          openrouter_key: payload.openrouter_key,
          gemini_key: payload.gemini_key,
          created_at: new Date().toISOString()
        };

        // Initialize status file immediately so frontend polling succeeds without delay
        const jobDir = path.join(JOBS_DIR, jobId);
        if (!fs.existsSync(jobDir)) fs.mkdirSync(jobDir, { recursive: true });
        const initialStatus = {
          job_id: jobId,
          status: 'RUNNING',
          current_step: 'INIT',
          progress: 5,
          message: 'Job received by local worker. Initializing pipeline...',
          created_at: input.created_at,
          updated_at: new Date().toISOString()
        };
        fs.writeFileSync(path.join(jobDir, 'status.json'), JSON.stringify(initialStatus, null, 2), 'utf8');

        // Respond to client immediately
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          job_id: jobId,
          status: 'RUNNING',
          message: 'Pipeline started asynchronously.'
        }));

        // Execute pipeline asynchronously
        setImmediate(async () => {
          try {
            console.log(`\n================================================`);
            console.log(`[SERVER] Launching Pipeline for Job: ${jobId}`);
            console.log(`Topic: "${input.topic}" | Visual: ${input.visual_mode} | Voice: ${input.voice_engine}`);
            console.log(`================================================\n`);

            const pipeline = new VideoPipeline(input);
            const result = await pipeline.execute();
            console.log(`[SERVER] Pipeline Job ${jobId} finished with status: ${result.status}`);
          } catch (e: any) {
            console.error(`[SERVER] Pipeline Job ${jobId} failed:`, e);
          }
        });
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Invalid JSON payload: ${err.message}` }));
      }
    });
    return;
  }

  // 2. API: GET /api/models
  if (req.method === 'GET' && pathname === '/api/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      current_config: {
        story_model: config.storyModel,
        image_model: config.openrouterImageModel,
        voice_engine: config.voiceEngine,
        cost_mode: config.costMode
      },
      recommended_free_image_models: [
        { id: 'inclusionai/ming-image-0.1-design', name: 'Ming Image 0.1 Design (Free on OpenRouter)' },
        { id: 'inclusionai/ming-image-0.1-design-layer', name: 'Ming Image 0.1 Design Layer (Free)' },
        { id: 'bytedance-seed/seedream-5-0-lite', name: 'Seedream 5.0 Lite (Free)' },
        { id: 'black-forest-labs/flux.2-klein-4b', name: 'FLUX.2 Klein 4B (Free)' }
      ]
    }));
    return;
  }

  // 3. Serve /jobs/* (e.g. /jobs/JOB-123/status.json or /jobs/JOB-123/render/final.mp4)
  if (pathname.startsWith('/jobs/')) {
    const relPath = pathname.slice('/jobs/'.length);
    const filePath = path.join(JOBS_DIR, relPath);
    if (serveStaticFile(filePath, res)) return;
  }

  // 4. Serve /output/* (e.g. /output/test_demo_video.mp4)
  if (pathname.startsWith('/output/')) {
    const relPath = pathname.slice('/output/'.length);
    const filePath = path.join(OUTPUT_DIR, relPath);
    if (serveStaticFile(filePath, res)) return;
  }

  // 5. Serve static files from public/
  const publicFilePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (serveStaticFile(publicFilePath, res)) return;

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🌙 NIGHTFALL AI LOCAL SERVER RUNNING`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Serving Web UI, Local API, Jobs & Outputs`);
  console.log(`====================================================`);
});
