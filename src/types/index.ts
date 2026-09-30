export type VisualType = 'VIDEO' | 'IMAGE' | 'STOCK_VIDEO' | 'HYBRID';
export type MotionType = 'PUSH_IN' | 'PULL_OUT' | 'PAN_LEFT' | 'PAN_RIGHT' | 'ZOOM_IN' | 'SLOW_DRIFT' | 'STATIC';
export type CostMode = 'TEST' | 'BALANCED' | 'QUALITY';
export type VoiceOption = 'AUTO' | 'MALE_FENRIR' | 'FEMALE_KORE';

export interface GenerationInput {
  job_id: string;
  topic: string;
  duration: number; // e.g. 330
  voice: string;
  visual_mode: string;
  quality_mode: CostMode;
  music: boolean;
  sfx: boolean;
  captions: boolean;
  youtube: boolean;
  created_at: string;
}

export interface CharacterDefinition {
  character_id: string;
  name: string;
  age_range: string;
  gender: string;
  appearance: string;
  hair: string;
  face: string;
  body: string;
  clothing: string;
  personality: string;
  visual_description: string;
}

export interface LocationDefinition {
  location_id: string;
  name: string;
  architecture: string;
  lighting: string;
  weather: string;
  time_characteristics: string;
  color_palette: string;
  environment: string;
  visual_description: string;
}

export interface SoundEffectCue {
  effect: string;
  trigger_time_relative: number; // in seconds relative to scene start
  volume: number; // 0.0 to 1.0
}

export interface ScenePlanItem {
  scene_id: string;
  beat_number: number;
  character_ids: string[];
  location_id: string;
  narration_text: string;
  visual_type: VisualType;
  visual_rationale: string;
  visual_prompt: string;
  motion_type: MotionType;
  camera_angle: string;
  sound_effects: SoundEffectCue[];
  ambience_cue: string;
  estimated_duration_seconds: number;
  start_time?: number;
  end_time?: number;
  rendered_asset_path?: string;
}

export interface StoryStructure {
  title: string;
  hook: string;
  logline: string;
  target_duration_seconds: number;
  estimated_word_count: number;
  characters: CharacterDefinition[];
  locations: LocationDefinition[];
  scenes: ScenePlanItem[];
}

export interface NarrationSegment {
  segment_id: string;
  scene_id: string;
  start_time: number;
  end_time: number;
  duration: number;
  text: string;
}

export interface MasterTimeline {
  job_id: string;
  total_duration_seconds: number;
  audio_duration_seconds: number;
  narration_segments: NarrationSegment[];
  scenes: ScenePlanItem[];
  sfx_cues: Array<{
    time: number;
    effect: string;
    volume: number;
  }>;
}

export interface VideoMetadata {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  category_id: string;
  privacy_status: 'private' | 'unlisted' | 'public';
}

export interface JobStatus {
  job_id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  current_step: string;
  progress: number;
  current_scene: number;
  total_scenes: number;
  message: string;
  video_path: string | null;
  youtube_url: string | null;
  video_id: string | null;
  error: string | null;
  estimated_cost: number;
  actual_cost: number;
  updated_at: string;
}
