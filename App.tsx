import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Chat, Type } from '@google/genai';
import type { Character, Message } from './types';
import { DEFAULT_SCENE_PROMPT, ALL_EMOTIONS } from './constants';
import ChatInterface from './components/ChatInterface';
import CharacterCreator from './components/CharacterCreator';
import LoadingOverlay from './components/LoadingOverlay';
import CharacterListPage from './components/CharacterListPage';
import UserInfoModal from './components/UserInfoModal';
import { generateImage, getAIResponse, generateGreeting } from './services/geminiService';

const App: React.FC = () => {
  const [userName, setUserName] = useState<string>('User');
  const [userPersonality, setUserPersonality] = useState<string>('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [sceneImageUrl, setSceneImageUrl] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading...');
  const [showCreator, setShowCreator] = useState<boolean>(false);
  const [showUserInfo, setShowUserInfo] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<'characterList' | 'chat'>('characterList');

  const chatRef = useRef<Chat | null>(null);
  
  const generateCharacterAssets = useCallback(async (charData: Omit<Character, 'sprites' | 'id'>): Promise<Omit<Character, 'id'>> => {
    setLoadingMessage(`Creating character: ${charData.name}...`);
    
    const spriteUrls: Partial<Record<typeof ALL_EMOTIONS[number], string>> = {};

    for (const emotion of ALL_EMOTIONS) {
      setLoadingMessage(`Generating ${emotion} expression...`);
      const prompt = `anime character sprite, full body portrait of ${charData.name}, ${charData.visualDescription}, expressing a ${emotion} emotion. The character should be on a simple, non-distracting background. digital art, high quality, vibrant colors, clean line art.`;
      const url = await generateImage(prompt, '3:4');
      spriteUrls[emotion] = url;
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return { ...charData, sprites: spriteUrls as Record<typeof ALL_EMOTIONS[number], string> };
  }, []);

  useEffect(() => {
    setIsLoading(true);
    try {
      const storedCharacters = localStorage.getItem('vn-characters');
      if (storedCharacters) setCharacters(JSON.parse(storedCharacters));
      
      const storedUserName = localStorage.getItem('vn-userName');
      if (storedUserName) setUserName(storedUserName);
      
      const storedUserPersonality = localStorage.getItem('vn-userPersonality');
      if (storedUserPersonality) setUserPersonality(storedUserPersonality);

    } catch (error) {
      console.error("Failed to load data from storage:", error);
      localStorage.clear(); 
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const initializeChat = useCallback((char: Character, currentUserName: string, currentUserPersonality: string) => {
    if (!process.env.API_KEY) {
      console.error("API_KEY not found.");
      return;
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = `You are an AI character in a visual novel. Your name is ${char.name}. Your personality is described as: ${char.personality}. 
    You are talking to a user named ${currentUserName} whose personality is: ${currentUserPersonality || 'not specified'}. You must always stay in character. When you respond, you must determine your current emotion based on the conversation.
    Your response must be in a valid JSON format with two keys: "dialogue" for what you say, and "emotion" for how you feel. 
    The possible emotions are only: ${ALL_EMOTIONS.join(', ')}. Example: {"dialogue": "Hello there, ${currentUserName}!", "emotion": "happy"}`;

    chatRef.current = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dialogue: { type: Type.STRING },
            emotion: { type: Type.STRING },
          },
        },
      },
    });
  }, []);

  const handleSendMessage = async (userInput: string) => {
    if (!userInput.trim() || !chatRef.current || isLoading) return;

    const userMessage: Message = { sender: 'user', text: userInput };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setLoadingMessage('Thinking...');

    try {
      const { dialogue, emotion } = await getAIResponse(chatRef.current, userInput);
      const aiMessage: Message = { sender: 'ai', text: dialogue, emotion: emotion as typeof ALL_EMOTIONS[number] || 'neutral' };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage: Message = { sender: 'system', text: 'Sorry, I encountered an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateScene = async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;
    setMessages(prev => [...prev, { sender: 'system', text: `Generating new scene: ${prompt}` }]);
    setIsLoading(true);
    setLoadingMessage('Generating new scene...');
    try {
      const url = await generateImage(`beautiful anime background scenery, ${prompt}, vibrant colors, detailed environment, digital painting.`, '16:9');
      setSceneImageUrl(url);
    } catch (error) {
      console.error("Error generating scene:", error);
      setMessages(prev => [...prev, { sender: 'system', text: 'Failed to generate the scene.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCharacter = async (data: Omit<Character, 'id' | 'sprites'>, sprites?: Record<string, string>) => {
    setShowCreator(false);
    setEditingCharacter(null);
    setIsLoading(true);

    try {
      let finalCharacter: Character;
      if (sprites) { // Uploaded or edited sprites
        finalCharacter = { ...data, id: editingCharacter?.id || Date.now().toString(), sprites };
      } else { // AI generation needed
        const assets = await generateCharacterAssets(data);
        finalCharacter = { ...assets, id: editingCharacter?.id || Date.now().toString() };
      }

      const updatedCharacters = editingCharacter
        ? characters.map(c => c.id === editingCharacter.id ? finalCharacter : c)
        : [...characters, finalCharacter];
      
      setCharacters(updatedCharacters);
      localStorage.setItem('vn-characters', JSON.stringify(updatedCharacters));
    } catch (error) {
      console.error("Error saving character:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSelectCharacter = async (character: Character) => {
    setIsLoading(true);
    setLoadingMessage('Loading character...');
    try {
      setCurrentCharacter(character);
      initializeChat(character, userName, userPersonality);
      
      if (character.sceneImageUrl) {
        setSceneImageUrl(character.sceneImageUrl);
      } else {
        setLoadingMessage('Generating scene...');
        const sceneUrl = await generateImage(DEFAULT_SCENE_PROMPT, '16:9');
        setSceneImageUrl(sceneUrl);
      }

      setLoadingMessage('Character is thinking of a greeting...');
      const greeting = await generateGreeting(character, userName, userPersonality);
      
      setMessages([{ sender: 'ai', text: greeting, emotion: 'happy' }]);
      setCurrentPage('chat');
    } catch (error) {
      console.error("Error selecting character:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCharacter = (characterId: string) => {
    const characterToDelete = characters.find(c => c.id === characterId);
    if (characterToDelete && window.confirm(`Are you sure you want to delete ${characterToDelete.name}? This cannot be undone.`)) {
      const updatedCharacters = characters.filter(c => c.id !== characterId);
      setCharacters(updatedCharacters);
      localStorage.setItem('vn-characters', JSON.stringify(updatedCharacters));
    }
  };

  const handleBackToCharacterList = () => {
    setCurrentCharacter(null);
    setSceneImageUrl('');
    setMessages([]);
    chatRef.current = null;
    setCurrentPage('characterList');
  };

  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setShowCreator(true);
  };
  
  const handleCloseCreator = () => {
    setShowCreator(false);
    setEditingCharacter(null);
  };

  const handleSaveUserInfo = (newUserName: string, newUserPersonality: string) => {
    setUserName(newUserName);
    setUserPersonality(newUserPersonality);
    localStorage.setItem('vn-userName', newUserName);
    localStorage.setItem('vn-userPersonality', newUserPersonality);
    setShowUserInfo(false);
  };

  const handleSetSceneFromUpload = (dataUrl: string) => {
    setSceneImageUrl(dataUrl);
    setMessages(prev => [...prev, { sender: 'system', text: 'Scene updated from uploaded image.' }]);
  };
  
  return (
    <div className="w-screen h-screen bg-black flex justify-center items-center overflow-hidden">
      <div className="relative w-full h-full max-w-2xl lg:max-w-4xl aspect-[9/16] sm:aspect-auto bg-gray-900">
        {isLoading && <LoadingOverlay message={loadingMessage} />}
        {showUserInfo && <UserInfoModal currentName={userName} currentPersonality={userPersonality} onSave={handleSaveUserInfo} onClose={() => setShowUserInfo(false)} />}
        {showCreator && (
          <CharacterCreator
            onSave={handleSaveCharacter}
            onClose={handleCloseCreator}
            characterToEdit={editingCharacter}
          />
        )}
        
        {currentPage === 'characterList' && !isLoading && (
          <CharacterListPage
            characters={characters}
            onSelectCharacter={handleSelectCharacter}
            onCreateNew={() => setShowCreator(true)}
            onEditCharacter={handleEditCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onShowUserInfo={() => setShowUserInfo(true)}
          />
        )}
        
        {currentPage === 'chat' && currentCharacter && sceneImageUrl && (
          <ChatInterface
            character={currentCharacter}
            sceneImageUrl={sceneImageUrl}
            messages={messages}
            onSendMessage={handleSendMessage}
            onGenerateScene={handleGenerateScene}
            onUploadScene={handleSetSceneFromUpload}
            onBack={handleBackToCharacterList}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default App;
