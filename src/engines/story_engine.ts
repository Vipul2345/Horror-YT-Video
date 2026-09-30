import { StoryProvider } from '../providers/interfaces.js';
import { StoryStructure } from '../types/index.js';
import { JobManager } from '../core/job.js';

export class StoryEngine {
  constructor(private provider: StoryProvider, private job: JobManager) {}

  async run(topic: string, targetDurationSeconds: number, voice: string): Promise<StoryStructure> {
    this.job.status.update({
      current_step: 'STORY',
      status: 'RUNNING',
      message: 'Generating narrative arc with Gemini 3.8 Flash...'
    });

    const story = await this.provider.generateStory(topic, targetDurationSeconds, voice);

    // Save individual artifacts according to architectural contracts (Rule 9)
    this.job.saveJson('story.json', story);
    this.job.saveJson('characters.json', story.characters);
    this.job.saveJson('locations.json', story.locations);
    this.job.saveJson('scene_plan.json', story.scenes);

    this.job.logger.info(
      'STORY',
      `Narrative created: "${story.title}" with ${story.characters.length} characters, ${story.locations.length} locations, and ${story.scenes.length} scenes.`
    );

    this.job.status.update({
      current_step: 'SCENES',
      total_scenes: story.scenes.length,
      message: `Scene plan ready (${story.scenes.length} visual beats)`
    });

    return story;
  }
}
