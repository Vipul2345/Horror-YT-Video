# Provider Architecture & Pluggability

Nightfall AI decouples every external API behind strict interfaces defined in `src/providers/interfaces.ts`. This ensures no single model or vendor is hardcoded, allowing drop-in upgrades as new AI models emerge.

---

## 1. Provider Interfaces

### `StoryProvider`
```typescript
interface StoryProvider {
  generateStory(topic: string, targetDurationSeconds: number, voice: string): Promise<StoryStructure>;
}
```
- **Gemini Implementation**: `GeminiStoryProvider` (`src/providers/gemini/story.ts`)
- **Mock Implementation**: `MockStoryProvider` (`src/providers/mock/index.ts`)

### `VoiceProvider`
```typescript
interface VoiceProvider {
  generateVoice(text: string, voiceOption: string, outputPath: string): Promise<{ audioPath: string; durationSeconds: number }>;
}
```
- **Gemini Implementation**: `GeminiVoiceProvider` (`src/providers/gemini/voice.ts`)
- **Mock Implementation**: `MockVoiceProvider` (`src/providers/mock/index.ts`)

### `VideoProvider`
```typescript
interface VideoProvider {
  generateVideo(prompt: string, durationSeconds: number, outputPath: string, firstFrameImage?: string): Promise<string>;
}
```
- **Veo 3.1 Implementation**: `VeoVideoProvider` (`src/providers/veo/index.ts`)
- **Mock Implementation**: `MockVideoProvider` (`src/providers/mock/index.ts`)

### `ImageProvider`
```typescript
interface ImageProvider {
  generateImage(prompt: string, outputPath: string): Promise<string>;
}
```
- **Gemini 3.1 Flash Image Implementation**: `GeminiImageProvider` (`src/providers/gemini/image.ts`)
- **Mock Implementation**: `MockImageProvider` (`src/providers/mock/index.ts`)

### `Publisher`
```typescript
interface Publisher {
  upload(videoPath: string, metadata: VideoMetadata): Promise<{ videoId: string; videoUrl: string }>;
}
```
- **YouTube Implementation**: `YouTubePublisher` (`src/providers/youtube/index.ts`)
- **Instagram / Facebook Adapters**: `InstagramPublisher`, `FacebookPublisher` (`src/providers/meta/index.ts`)
- **Mock Implementation**: `MockPublisher` (`src/providers/mock/index.ts`)

---

## 2. Dynamic Model Resolution (`ModelResolver`)

The `ModelResolver` (`src/core/model_resolver.ts`) verifies available model identifiers directly against the Google GenAI API endpoint at runtime, ensuring obsolete or unauthorized model IDs are never requested.
