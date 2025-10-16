import type { Character } from './types';

export const DEFAULT_CHARACTER: Omit<Character, 'sprites' | 'emotions'> = {
  id: 'default-aiko',
  name: 'Aiko',
  personality: 'A cheerful and energetic high school student who is always optimistic. She loves video games and bubble tea. She can be a bit clumsy sometimes.',
  visualDescription: 'A teenage girl with long, vibrant pink hair tied in twin tails, and sparkling emerald green eyes. She wears a stylish modern school uniform with a short pleated skirt.',
  indicator: {
    name: 'Affection',
    value: 50
  }
};

export const DEFAULT_AI_EMOTIONS: string[] = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'blush', 'thinking', 'wink'];

export const DEFAULT_SCENE_PROMPT = "A peaceful classroom in a Japanese high school during sunset, with warm light streaming through the windows.";
