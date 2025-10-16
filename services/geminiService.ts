import { GoogleGenAI, Chat, GenerateContentResponse, Type } from '@google/genai';
import type { Character, Message } from '../types';

let aiInstance: GoogleGenAI | null = null;

export const initializeAI = (apiKey: string) => {
  if (!apiKey) {
    console.error("Attempted to initialize AI without an API key.");
    aiInstance = null;
    return;
  }
  aiInstance = new GoogleGenAI({ apiKey });
};

export const isAIInitialized = (): boolean => {
    return !!aiInstance;
};

export const getAI = (): GoogleGenAI => {
  if (!aiInstance) {
    throw new Error("AI Service not initialized. Please provide an API key in settings.");
  }
  return aiInstance;
};

export const generateImage = async (prompt: string, aspectRatio: '1:1' | '16:9' | '3:4' | '4:3' | '9:16' = '1:1'): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: aspectRatio,
        },
    });
    
    const generatedImage = response.generatedImages?.[0];
    if (generatedImage?.image?.imageBytes) {
      const base64ImageBytes: string = generatedImage.image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    }

    throw new Error('No image was generated from response.');
  } catch (error) {
    console.error('Error in generateImage:', error);
    throw error;
  }
};

export const getAIResponse = async (chat: Chat, userInput: string): Promise<{ dialogue: string; emotion: string, indicatorValue: number | null }> => {
  try {
    const response: GenerateContentResponse = await chat.sendMessage({ message: userInput });
    
    // The response is expected to be a JSON string, so we parse it.
    // The Gemini API can sometimes wrap it in markdown backticks.
    let jsonText = response.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.substring(7);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.substring(0, jsonText.length - 3);
    }

    const parsedResponse = JSON.parse(jsonText);

    if (typeof parsedResponse.dialogue === 'string' && typeof parsedResponse.emotion === 'string') {
      const indicatorValue = typeof parsedResponse.indicatorValue === 'number' ? parsedResponse.indicatorValue : null;
      return { ...parsedResponse, indicatorValue };
    }
    
    throw new Error('Invalid JSON structure in AI response.');
  } catch (error) {
    console.error('Error in getAIResponse:', error);
    // Fallback response
    return { dialogue: "I'm sorry, I had trouble forming a response.", emotion: 'sad', indicatorValue: null };
  }
};

export const generateGreeting = async (character: Pick<Character, 'personality'>, userName: string, userPersonality: string): Promise<string> => {
  const ai = getAI();
  try {
    const systemInstruction = `You are roleplaying a character with this personality: ${character.personality}. 
    You are greeting a user named ${userName}, whose personality is: ${userPersonality || 'not specified'}.
    Generate a short, friendly, in-character greeting directed at the user.
    Do not add any quotation marks or extra formatting. Just provide the line of dialogue.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate a greeting for ${userName}.`,
        config: {
            systemInstruction,
        }
    });
    
    return response.text.trim();
  } catch (error) {
    console.error('Error generating greeting:', error);
    return `Hello ${userName}, it's nice to meet you.`; // Fallback greeting
  }
};

export const generateImpersonatedResponses = async (
  character: Character, 
  messages: Message[], 
  userName: string, 
  userPersonality: string
): Promise<string[]> => {
  const ai = getAI();
  const history = messages.slice(-6).map(m => `${m.sender === 'ai' ? character.name : userName}: ${m.text}`).join('\n');
  const systemInstruction = `You are an AI assistant helping a user roleplay. Your task is to impersonate the user and suggest two different responses for them to say next.
The user's name is "${userName}" and their personality is: ${userPersonality || 'not specified'}.
They are talking to "${character.name}" whose personality is: ${character.personality}.
The last message was from ${character.name}.
Based on the recent chat history, generate two distinct, creative, and in-character responses from ${userName}'s perspective.
The responses should be concise and sound like natural dialogue.

Recent Chat History:
${history}

Your response must be a valid JSON array containing exactly two strings. Example: ["That sounds interesting!", "I'm not so sure about that."]"`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Generate two responses.',
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });

    const jsonText = response.text.trim();
    const parsedResponse = JSON.parse(jsonText);
    if (Array.isArray(parsedResponse) && parsedResponse.length >= 2 && parsedResponse.every(item => typeof item === 'string')) {
      return parsedResponse.slice(0, 2);
    }
    throw new Error('Invalid JSON structure for impersonation.');
  } catch (error) {
    console.error('Error generating impersonated responses:', error);
    return ["Let's try something else.", "What should I say?"]; // Fallback
  }
};