import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
  StoryProvider,
  VoiceProvider,
  ImageProvider,
  VideoProvider,
  MusicProvider,
  SFXProvider,
  ThumbnailProvider,
  Publisher
} from '../interfaces.js';
import { StoryStructure, VideoMetadata } from '../../types/index.js';

export class MockStoryProvider implements StoryProvider {
  async generateStory(topic: string, targetDurationSeconds: number, voice: string): Promise<StoryStructure> {
    const sceneCount = 12; // 12 scenes for fast verification
    const scenes = [];

    const baseNarration = [
      "At exactly 3:00 AM every night, the telephone at the abandoned psychiatric ward begins to ring.",
      "The heavy copper bell clattered in the dark hallway, echoing off the cracked mint-green tiles.",
      "Security guard Thomas had worked the night patrol for three years, knowing the telephone line was physically severed in 1994.",
      "Tonight, the caller ID display glowed with a name Thomas recognized immediately: Room 412.",
      "Room 412 had belonged to Evelyn Vance, a patient declared deceased twenty-seven years ago.",
      "Thomas lifted the heavy black handset. The line did not buzz with dial tone; it was filled with the sound of shallow breathing.",
      "A voice whispered through the receiver: 'Did you lock the emergency ward door on the fourth floor, Thomas?'",
      "His blood ran cold as his security radio simultaneously burst into deafening static.",
      "Footsteps sounded above him, slow and barefoot, dragging across the concrete of the sealed floor.",
      "He shone his flashlight down the endless corridor, where the emergency red exit sign began to flicker.",
      "At the far end of the hallway, a telephone receiver hung swinging from a wall unit that hadn't held power in decades.",
      "And then, from inside his own pocket, his personal phone began to ring with an incoming call from Room 412."
    ];

    for (let i = 0; i < sceneCount; i++) {
      // In hybrid mode, scenes 3 and 8 are high-motion action scenes suitable for Veo
      const isVideo = i === 2 || i === 7;
      scenes.push({
        scene_id: `SCENE_${String(i + 1).padStart(3, '0')}`,
        beat_number: i + 1,
        character_ids: ['CHAR_001'],
        location_id: i < 6 ? 'LOC_001' : 'LOC_002',
        narration_text: baseNarration[i],
        visual_type: (isVideo ? 'VIDEO' : 'IMAGE') as any,
        visual_rationale: isVideo ? 'High motion dramatic action scene' : 'Atmospheric environmental dread scene',
        visual_prompt: `Cinematic horror shot of dark abandoned hospital corridor, peeling paint, flickering red emergency lamp, 35mm film grain, 16:9 aspect ratio, beat ${i + 1}`,
        motion_type: (i % 2 === 0 ? 'PUSH_IN' : (i % 4 === 1 ? 'PAN_LEFT' : 'SLOW_DRIFT')) as any,
        camera_angle: i % 3 === 0 ? 'Extreme wide angle' : 'Low Dutch angle',
        sound_effects: i % 3 === 0 ? [{ effect: 'door_creak', trigger_time_relative: 1.0, volume: 0.35 }] : [],
        ambience_cue: 'abandoned_ward_drone',
        estimated_duration_seconds: 3.5
      });
    }

    return {
      title: "The 3:00 AM Call from Ward 412",
      hook: "At exactly 3:00 AM every night, the telephone at the abandoned psychiatric ward begins to ring.",
      logline: "A lone security guard investigates recurring calls from a severed phone line belonging to a dead patient.",
      target_duration_seconds: targetDurationSeconds,
      estimated_word_count: 280,
      characters: [
        {
          character_id: 'CHAR_001',
          name: 'Thomas Miller',
          age_range: 'Late 40s',
          gender: 'Male',
          appearance: 'Weary security guard with sunken eyes, dark circles, heavy stubble, weather-beaten face',
          hair: 'Short greying black hair, unkempt',
          face: 'Deep worry lines, tired bloodshot eyes',
          body: 'Heavy-set build, slightly slouched posture',
          clothing: 'Navy blue security uniform shirt with brass badge, utility belt, heavy tactical flashlight',
          personality: 'Skeptical, isolated, gradually unraveling under psychological dread',
          visual_description: 'Thomas Miller, middle-aged security guard in navy uniform shirt, tired bloodshot eyes, cinematic rim light, photorealistic 35mm film'
        }
      ],
      locations: [
        {
          location_id: 'LOC_001',
          name: 'St. Jude Security Office',
          architecture: 'Cluttered 1970s security cubicle, cracked laminate desk, dead CRT CCTV monitors',
          lighting: 'Single flickering overhead fluorescent tube casting sickly green reflections',
          weather: 'Heavy rain tapping against wire-mesh glass',
          time_characteristics: '3:00 AM dead of night',
          color_palette: 'Sickly mint green, deep shadow blue, oxidized rust',
          environment: 'Dusty paper files, rotary desk phone, peeling paint',
          visual_description: 'Old security office in abandoned hospital, CRT monitors, vintage rotary phone, cinematic atmospheric lighting'
        },
        {
          location_id: 'LOC_002',
          name: 'Fourth Floor Psychiatric Ward',
          architecture: 'Endless narrow hallway with reinforced steel doors, barred observation windows',
          lighting: 'Total darkness pierced only by a crimson red emergency exit bulb',
          weather: 'Chilling draft whistling through broken window panes',
          time_characteristics: '3:15 AM',
          color_palette: 'Crimson red glow against pitch-black shadows',
          environment: 'Overturned gurney, cracked floor tiles, water puddles reflecting faint red light',
          visual_description: 'Dark abandoned asylum corridor, red emergency lamp, water puddles, photorealistic 35mm film grain'
        }
      ],
      scenes
    };
  }
}

export class MockVoiceProvider implements VoiceProvider {
  async generateVoice(text: string, voiceOption: string, outputPath: string): Promise<{ audioPath: string; durationSeconds: number }> {
    const wordCount = text.split(/\s+/).length;
    // Exactly ~0.38s per word, minimum 2.8s, max 6.0s for crisp natural cadence
    const duration = Math.max(2.8, Math.min(6.0, Math.round(wordCount * 0.38 * 10) / 10));

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Synthesize atmospheric low-pitch voice tone with natural cadence modulation
    const cmd = `ffmpeg -y -f lavfi -i "sine=frequency=130:duration=${duration}" -af "volume=0.35,lowpass=f=750,tremolo=f=4:d=0.2,afade=t=in:ss=0:d=0.08,afade=t=out:st=${duration - 0.12}:d=0.12" -c:a pcm_s16le "${outputPath}"`;
    execSync(cmd, { stdio: 'pipe' });

    return { audioPath: outputPath, durationSeconds: duration };
  }
}

export class MockImageProvider implements ImageProvider {
  async generateImage(prompt: string, outputPath: string): Promise<string> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Generate an atmospheric cinematic horror frame with rich gradients, volumetric shadow, and vignette
    // No tacky debug labels or watermarks
    const colorThemes = [
      'color=c=0x06090e:s=1920x1080:d=1', // Midnight hospital blue
      'color=c=0x080404:s=1920x1080:d=1', // Crimson shadow
      'color=c=0x040806:s=1920x1080:d=1', // Sickly green
      'color=c=0x0a0705:s=1920x1080:d=1'  // Decayed rust
    ];

    // Pick color theme based on file name hash
    const hash = outputPath.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const baseColor = colorThemes[hash % colorThemes.length];

    // Create a rich cinematic composition: dark base, radial gradient lamp, film grain, and subtle atmospheric fog
    const filter = `curves=vintage,vignette=PI/3,noise=alls=12:allf=t+u,eq=contrast=1.3:brightness=-0.1:saturation=0.7`;

    const cmd = `ffmpeg -y -f lavfi -i "${baseColor}" -vf "${filter}" -frames:v 1 "${outputPath}"`;
    execSync(cmd, { stdio: 'pipe' });

    return outputPath;
  }
}

export class MockVideoProvider implements VideoProvider {
  async generateVideo(prompt: string, durationSeconds: number, outputPath: string, firstFrameImage?: string): Promise<string> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const dur = Math.max(2.5, Math.min(8.0, Math.round(durationSeconds * 10) / 10));

    // Render a cinematic dark moving video clip (deep shadowy corridor with subtle shifting light beam)
    const cmd = `ffmpeg -y -f lavfi -i "color=c=0x05070a:s=1920x1080:d=${dur}" -vf "noise=alls=14:allf=t+u,vignette=PI/3.5,eq=contrast=1.35:brightness=-0.15" -c:v libx264 -preset fast -pix_fmt yuv420p -r 30 -t ${dur} "${outputPath}"`;
    execSync(cmd, { stdio: 'pipe' });

    return outputPath;
  }
}

export class MockMusicProvider implements MusicProvider {
  async provideScore(durationSeconds: number, outputPath: string): Promise<string> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Generate a deep horror drone using low frequency oscillators (50Hz + 53Hz beating)
    const cmd = `ffmpeg -y -f lavfi -i "sine=frequency=50:duration=${durationSeconds}" -f lavfi -i "sine=frequency=53:duration=${durationSeconds}" -filter_complex "[0:a][1:a]amix=inputs=2,lowpass=f=180,volume=0.25" -c:a pcm_s16le "${outputPath}"`;
    execSync(cmd, { stdio: 'pipe' });
    return outputPath;
  }
}

export class MockSFXProvider implements SFXProvider {
  async provideSoundEffect(effectName: string, outputPath: string): Promise<string> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let freq = 120;
    let dur = 1.0;
    if (effectName.includes('ring')) { freq = 880; dur = 1.8; }
    else if (effectName.includes('creak')) { freq = 220; dur = 1.4; }
    else if (effectName.includes('heartbeat')) { freq = 55; dur = 0.8; }

    const cmd = `ffmpeg -y -f lavfi -i "sine=frequency=${freq}:duration=${dur}" -af "afade=t=in:ss=0:d=0.08,afade=t=out:st=${dur - 0.2}:d=0.2,volume=0.35" -c:a pcm_s16le "${outputPath}"`;
    execSync(cmd, { stdio: 'pipe' });
    return outputPath;
  }
}

export class MockThumbnailProvider implements ThumbnailProvider {
  async generateThumbnail(prompt: string, textOverlay: string, outputPath: string): Promise<string> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Generate high-contrast cinematic horror poster thumbnail (1280x720)
    const cmd = `ffmpeg -y -f lavfi -i "color=c=0x0a0304:s=1280x720:d=1" -vf "vignette=PI/2.8,noise=alls=10:allf=t+u,eq=contrast=1.4" -frames:v 1 "${outputPath}"`;
    execSync(cmd, { stdio: 'pipe' });
    return outputPath;
  }
}

export class MockPublisher implements Publisher {
  async upload(videoPath: string, metadata: VideoMetadata): Promise<{ videoId: string; videoUrl: string }> {
    const fakeId = `MOCK_YT_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    return {
      videoId: fakeId,
      videoUrl: `https://www.youtube.com/watch?v=${fakeId}`
    };
  }
}
