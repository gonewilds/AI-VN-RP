import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
// FIX: Imported the Character type to resolve 'Cannot find name' error.
import type { Character } from '../types';

// Singleton instance of GoogleGenAI
let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiInstance) {
     if (!process.env.API_KEY) {
      throw new Error("API_KEY not found in environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

export const generateImage = async (prompt: string, aspectRatio: '1:1' | '16:9' | '3:4' = '1:1'): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio,
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    throw new Error('No image was generated.');
  } catch (error) {
    console.error('Error in generateImage:', error);
    throw error;
  }
};

export const getAIResponse = async (chat: Chat, userInput: string): Promise<{ dialogue: string; emotion: string }> => {
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
      return parsedResponse;
    }
    
    throw new Error('Invalid JSON structure in AI response.');
  } catch (error) {
    console.error('Error in getAIResponse:', error);
    // Fallback response
    return { dialogue: "I'm sorry, I had trouble forming a response.", emotion: 'sad' };
  }
};

export const generateGreeting = async (character: Pick<Character, 'personality'>, userName: string, userPersonality: string): Promise<string> => {
  const ai = getAI();
  try {
    const systemInstruction = `You are roleplaying a character with this personality: ${character.personality}. 
    You are greeting a user named ${userName}, whose personality is: ${userPersonality || 'not specified'}.
    Generate a short, friendly, in-character greeting directed at the user.
    Do not add any quotation marks or extra formatting. Just provide the line of dialogue.`;
    
    // FIX: Removed deprecated `GenerateContentRequest` type and simplified the `contents` property to align with Gemini API best practices.
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
