export interface Character {
  id: string;
  name: string;
  personality: string;
  visualDescription: string;
  greeting?: string;
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
  systemInstruction?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  emotion?: string;
}
