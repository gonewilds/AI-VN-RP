export type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'blush' | 'thinking' | 'wink';

export interface Character {
  id: string;
  name: string;
  personality: string;
  visualDescription: string;
  sprites: Record<Emotion, string>;
  sceneImageUrl?: string; // Character-specific background scene
  systemInstruction?: string; // Custom system instruction for the AI
  transform?: {
    x: number;
    y: number;
    scale: number;
  };
}

export interface Message {
  sender: 'user' | 'ai' | 'system';
  text: string;
  emotion?: Emotion;
}
