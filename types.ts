export interface Character {
  id: string;
  name: string;
  personality: string;
  visualDescription: string;
  emotions: string[];
  sprites: Record<string, string>;
  sceneImageUrl?: string; // Character-specific background scene
  transform?: {
    x: number;
    y: number;
    scale: number;
  };
  indicator: {
    name: string;
    value: number;
  };
}

export interface Message {
  sender: 'user' | 'ai' | 'system';
  text: string;
  emotion?: string;
}