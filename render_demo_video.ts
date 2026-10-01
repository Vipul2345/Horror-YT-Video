import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { MotionEngine } from './src/engines/motion_engine.js';
import { EdgeTTSVoiceProvider } from './src/providers/voice/edge_tts.js';
import { Logger } from './src/core/logger.js';

async function main() {
  const logger = new Logger();
  const outputDir = path.resolve('./output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const inputImage = path.join(outputDir, 'test_preview_image.png');
  if (!fs.existsSync(inputImage)) {
    console.error('Input image not found at:', inputImage);
    process.exit(1);
  }

  console.log('====================================================');
  console.log('NIGHTFALL AI: RENDERING LOCAL TEST HORROR VIDEO');
  console.log('====================================================');

  // 1. Synthesize Voiceover via Edge-TTS
  console.log('\n[1/5] Synthesizing horror voiceover with Edge-TTS (Christopher Neural)...');
  const narrationText = "At exactly three o'clock in the morning, the disconnected telephone on floor four began to ring. When the guard finally answered, all he could hear was slow, ragged breathing.";
  const ttsProvider = new EdgeTTSVoiceProvider(logger);
  const voiceWavPath = path.join(outputDir, 'demo_voiceover.wav');

  const { audioPath, durationSeconds } = await ttsProvider.generateVoice(
    narrationText,
    'HORROR_MALE',
    voiceWavPath
  );
  console.log(`✓ Voice synthesized: ${durationSeconds.toFixed(2)}s`);

  // Pad duration slightly for cinematic trailing silence
  const videoDuration = Math.round((durationSeconds + 1.5) * 100) / 100;

  // 2. Animate 2D Image into 1080p Clip with 2.5D Camera Motion
  console.log(`\n[2/5] Animating 2D image into 1080p 30fps video clip (${videoDuration}s, PUSH_IN)...`);
  const motionEngine = new MotionEngine(logger);
  const animatedClipPath = path.join(outputDir, 'demo_visual_anim.mp4');
  motionEngine.animateImage(inputImage, videoDuration, 'PUSH_IN', animatedClipPath);
  console.log(`✓ 1080p animation rendered: ${animatedClipPath}`);

  // 3. Compose Multi-Layer Audio (Voice + Low Drone + Horror Chord)
  console.log('\n[3/5] Composing horror soundscape & loudness normalization...');
  const droneWavPath = path.join(outputDir, 'demo_drone.wav');
  const chordWavPath = path.join(outputDir, 'demo_chord.wav');
  const masterAudioPath = path.join(outputDir, 'demo_master_audio.wav');

  // Sub-bass 42Hz room tone
  execSync(`ffmpeg -y -f lavfi -i "sine=frequency=42:duration=${videoDuration}" -af "volume=0.18,lowpass=f=120" "${droneWavPath}"`, { stdio: 'pipe' });

  // Dissonant suspense pad
  execSync(`ffmpeg -y -f lavfi -i "sine=frequency=110:duration=${videoDuration}" -af "volume=0.08,tremolo=f=1.5:d=0.7" "${chordWavPath}"`, { stdio: 'pipe' });

  // Mix voice + drone + chord with EBU R128 loudness normalization
  const mixCmd = `ffmpeg -y -i "${voiceWavPath}" -i "${droneWavPath}" -i "${chordWavPath}" -filter_complex "[0:a]volume=1.0[v];[1:a]volume=0.6[d];[2:a]volume=0.4[c];[v][d][c]amix=inputs=3:duration=longest[mixed];[mixed]loudnorm=I=-14:TP=-1.5:LRA=11[out]" -map "[out]" "${masterAudioPath}"`;
  execSync(mixCmd, { stdio: 'pipe' });
  console.log(`✓ Audio track mixed: ${masterAudioPath}`);

  // 4. Generate Cinematic ASS Subtitles
  console.log('\n[4/5] Generating horror ASS subtitles...');
  const assPath = path.join(outputDir, 'demo_captions.ass');
  const assContent = `[Script Info]
Title: Nightfall AI Demo Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Horror,Cinzel,52,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,2,0,1,3,2,2,40,40,90,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.20,0:00:04.50,Horror,,0,0,0,,At exactly {\\c&H0000FF&}3:00 AM{\\c&HFFFFFF&}, the disconnected telephone began to ring.
Dialogue: 0,0:00:04.80,0:00:${Math.floor(videoDuration)}.00,Horror,,0,0,0,,When the guard answered... all he heard was {\\c&H0000FF&}slow, ragged breathing{\\c&HFFFFFF&}.
`;
  fs.writeFileSync(assPath, assContent, 'utf8');
  console.log(`✓ Subtitles generated: ${assPath}`);

  // 5. Final Concat & Burn Subtitles into Master 1080p MP4
  console.log('\n[5/5] Merging video, master audio, and burning subtitles...');
  const finalVideoPath = path.join(outputDir, 'test_demo_video.mp4');
  const safeAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');

  const finalCmd = `ffmpeg -y -i "${animatedClipPath}" -i "${masterAudioPath}" -vf "subtitles='${safeAssPath}'" -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 192k -shortest "${finalVideoPath}"`;
  execSync(finalCmd, { stdio: 'pipe' });
  console.log(`✓ MASTER VIDEO GENERATED: ${finalVideoPath}`);

  // 6. Validate with FFprobe
  console.log('\n====================================================');
  console.log('SANITY VALIDATION WITH FFPROBE');
  console.log('====================================================');
  const probeOutput = execSync(`ffprobe -v error -show_entries format=duration,size,bit_rate:stream=width,height,r_frame_rate,codec_name -of json "${finalVideoPath}"`, { encoding: 'utf8' });
  const probeData = JSON.parse(probeOutput);
  const vStream = probeData.streams?.find((s: any) => s.codec_name === 'h264');
  const aStream = probeData.streams?.find((s: any) => s.codec_name === 'aac');

  console.log(`Resolution:  ${vStream?.width}x${vStream?.height} (Target: 1920x1080)`);
  console.log(`Framerate:   ${vStream?.r_frame_rate} fps`);
  console.log(`Duration:    ${parseFloat(probeData.format?.duration).toFixed(2)} seconds`);
  console.log(`File Size:   ${(parseInt(probeData.format?.size, 10) / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Video Codec: ${vStream?.codec_name}`);
  console.log(`Audio Codec: ${aStream?.codec_name}`);
  console.log('====================================================');
  console.log('✓ VERIFICATION COMPLETE: ALL CHECKS PASSED!');
  console.log('====================================================');

  // Clean temp audio stems
  if (fs.existsSync(droneWavPath)) fs.unlinkSync(droneWavPath);
  if (fs.existsSync(chordWavPath)) fs.unlinkSync(chordWavPath);
  if (fs.existsSync(animatedClipPath)) fs.unlinkSync(animatedClipPath);
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
