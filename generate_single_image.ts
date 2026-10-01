import dotenv from 'dotenv';
import { OpenRouterImageProvider } from './src/providers/openrouter/image.js';

dotenv.config();

async function run() {
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  const model = process.env.OPENROUTER_IMAGE_MODEL || 'inclusionai/ming-image-0.1-design';
  console.log(`Starting image generation test...`);
  console.log(`Model: ${model}`);
  console.log(`Key: ${apiKey.slice(0, 12)}...`);

  const provider = new OpenRouterImageProvider(apiKey, model);
  const prompt = "Cinematic horror movie still, eerie abandoned psychiatric hospital corridor at midnight, flickering red emergency lamp, puddle on cracked floor, 35mm grain, photorealistic 8k";
  const outputPath = "./output/test_preview_image.png";

  try {
    const res = await provider.generateImage(prompt, outputPath);
    console.log(`✓ SUCCESS! Image generated and saved to: ${res}`);
  } catch (err: any) {
    console.error(`✗ GENERATION FAILED: ${err.message}`);
  }
}

run();
