import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Chat, Type } from '@google/genai';
import type { Character, Message } from './types';
import { DEFAULT_SCENE_PROMPT, DEFAULT_AI_EMOTIONS } from './constants';
import ChatInterface from './components/ChatInterface';
import CharacterCreator from './components/CharacterCreator';
import LoadingOverlay from './components/LoadingOverlay';
import CharacterListPage from './components/CharacterListPage';
import SettingsModal from './components/SettingsModal';
import ChatSettingsModal from './components/ChatSettingsModal';
import { generateImage, getAIResponse, generateGreeting, initializeAI, isAIInitialized, getAI } from './services/geminiService';
import { getAllCharacters, saveCharacter, deleteCharacterDB, getSetting, setSetting } from './services/dbService';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [userName, setUserName] = useState<string>('User');
  const [userPersonality, setUserPersonality] = useState<string>('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [sceneImageUrl, setSceneImageUrl] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('Initializing App...');
  const [showCreator, setShowCreator] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showChatSettings, setShowChatSettings] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<'characterList' | 'chat'>('characterList');

  const chatRef = useRef<Chat | null>(null);
  const appContainerRef = useRef<HTMLDivElement>(null);

  const generateCharacterAssets = useCallback(async (charData: Omit<Character, 'sprites' | 'id' | 'emotions' | 'indicator'>): Promise<{ sprites: Record<string, string>, emotions: string[] }> => {
    setLoadingMessage(`Creating character: ${charData.name}...`);
    
    const spriteUrls: Record<string, string> = {};

    for (const emotion of DEFAULT_AI_EMOTIONS) {
      setLoadingMessage(`Generating ${emotion} expression...`);
      const prompt = `anime character sprite, full body portrait of ${charData.name}, ${charData.visualDescription}, expressing a ${emotion} emotion. The character should be on a simple, non-distracting background. digital art, high quality, vibrant colors, clean line art.`;
      const url = await generateImage(prompt, '3:4');
      spriteUrls[emotion] = url;
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return { sprites: spriteUrls, emotions: DEFAULT_AI_EMOTIONS };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingMessage('Loading settings...');
        const storedApiKey = await getSetting<string>('apiKey');
        
        if (storedApiKey) {
          setApiKey(storedApiKey);
          initializeAI(storedApiKey);
          
          const storedUserName = await getSetting<string>('userName') || 'User';
          setUserName(storedUserName);
          
          const storedUserPersonality = await getSetting<string>('userPersonality') || '';
          setUserPersonality(storedUserPersonality);
          
          setLoadingMessage('Loading characters...');
          const storedCharacters = await getAllCharacters();

          // Data migration logic for older character models
          const charactersToUpdate: Character[] = [];
          const migratedCharacters = storedCharacters.map(char => {
            let needsUpdate = false;
            const newChar = { ...char };

            if (!newChar.emotions || !Array.isArray(newChar.emotions) || newChar.emotions.length === 0) {
              newChar.emotions = Object.keys(newChar.sprites || {});
              if (newChar.emotions.length === 0) {
                  newChar.emotions = ['neutral']; // Final fallback
              }
              needsUpdate = true;
            }

            if (!newChar.indicator) {
              newChar.indicator = { name: 'Affection', value: 50 };
              needsUpdate = true;
            }
            
            if (needsUpdate) {
                charactersToUpdate.push(newChar);
            }

            return newChar;
          });
          
          if (charactersToUpdate.length > 0) {
            setLoadingMessage('Upgrading character data...');
            await Promise.all(charactersToUpdate.map(saveCharacter));
          }

          setCharacters(migratedCharacters);

        } else {
          // No API key, prompt user to enter one.
          setShowSettings(true);
          setLoadingMessage('Please enter your API Key to begin.');
        }

      } catch (error) {
        console.error("Failed to load data from database:", error);
        setLoadingMessage('Error loading data. Please refresh.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Effect to handle viewport height changes, especially for mobile keyboards
  useEffect(() => {
    const handleResize = () => {
      if (appContainerRef.current) {
        appContainerRef.current.style.height = `${window.innerHeight}px`;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial height

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  const getDefaultSystemInstruction = (char: Character, currentUserName: string, currentUserPersonality: string): string => {
    return `You are an AI character in a visual novel. Your name is ${char.name}. Your personality is described as: ${char.personality}. 
    You are talking to a user named ${currentUserName} whose personality is: ${currentUserPersonality || 'not specified'}. You must always stay in character.
    You have an indicator called "${char.indicator.name}" which is currently at ${char.indicator.value} (out of 100). Your interactions should influence this value. A positive interaction may increase it, a negative one may decrease it. The value must stay between 0 and 100.
    When you respond, you must determine your current emotion based on the conversation.
    Your response must be in a valid JSON format with three keys: "dialogue" for what you say, "emotion" for how you feel, and "indicatorValue" for the new value of "${char.indicator.name}".
    The possible emotions are only: ${char.emotions.join(', ')}.
    Example: {"dialogue": "Hello there, ${currentUserName}!", "emotion": "happy", "indicatorValue": ${Math.min(100, char.indicator.value + 1)}}`;
  };

  const initializeChat = useCallback((char: Character, currentUserName: string, currentUserPersonality: string) => {
    if (!isAIInitialized()) {
      console.error("AI not initialized. Cannot start chat.");
      alert("API Key is not configured correctly. Please check settings.");
      return;
    }
    const ai = getAI();

    const systemInstruction = char.systemInstruction || getDefaultSystemInstruction(char, currentUserName, currentUserPersonality);

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
            indicatorValue: { type: Type.NUMBER },
          },
        },
      },
    });
  }, []);
  
  const handleBackToCharacterList = useCallback(() => {
    setCurrentCharacter(null);
    setSceneImageUrl('');
    setMessages([]);
    chatRef.current = null;
    setCurrentPage('characterList');
  }, []);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (currentPage === 'chat' && e.state?.page !== 'chat') {
        handleBackToCharacterList();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [currentPage, handleBackToCharacterList]);

  const handleSendMessage = async (userInput: string) => {
    if (!userInput.trim() || !chatRef.current || isLoading || !currentCharacter) return;

    const userMessage: Message = { sender: 'user', text: userInput };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setLoadingMessage('Thinking...');

    try {
      const { dialogue, emotion, indicatorValue } = await getAIResponse(chatRef.current, userInput);
      const aiMessage: Message = { sender: 'ai', text: dialogue, emotion: emotion || currentCharacter.emotions[0] || 'neutral' };
      setMessages(prev => [...prev, aiMessage]);

      if (indicatorValue !== null && currentCharacter) {
        const newIndicatorValue = Math.max(0, Math.min(100, indicatorValue));
        const updatedCharacter = { ...currentCharacter, indicator: { ...currentCharacter.indicator, value: newIndicatorValue } };
        setCurrentCharacter(updatedCharacter);
        await saveCharacter(updatedCharacter);
        setCharacters(chars => chars.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
      }

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
        if (!isAIInitialized()) {
            alert('API Key is not set. Please set it in the settings.');
            setIsLoading(false);
            return;
        }
        const { sprites: generatedSprites, emotions: generatedEmotions } = await generateCharacterAssets(data);
        finalCharacter = { ...data, id: editingCharacter?.id || Date.now().toString(), sprites: generatedSprites, emotions: generatedEmotions };
      }

      await saveCharacter(finalCharacter);
      
      const updatedCharacters = editingCharacter
        ? characters.map(c => c.id === editingCharacter.id ? finalCharacter : c)
        : [...characters, finalCharacter];
      
      setCharacters(updatedCharacters);
    } catch (error) {
      console.error("Error saving character:", error);
      alert(`Error saving character: ${error instanceof Error ? error.message : String(error)}`);
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
      window.history.pushState({ page: 'chat' }, '', '#chat');
    } catch (error) {
      console.error("Error selecting character:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    const characterToDelete = characters.find(c => c.id === characterId);
    if (characterToDelete && window.confirm(`Are you sure you want to delete ${characterToDelete.name}? This cannot be undone.`)) {
      await deleteCharacterDB(characterId);
      const updatedCharacters = characters.filter(c => c.id !== characterId);
      setCharacters(updatedCharacters);
    }
  };

  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setShowCreator(true);
  };
  
  const handleCloseCreator = () => {
    setShowCreator(false);
    setEditingCharacter(null);
  };

  const handleSaveSettings = async (newUserName: string, newUserPersonality: string, newApiKey: string) => {
    setIsLoading(true);
    setLoadingMessage('Saving settings...');
    try {
      await setSetting('apiKey', newApiKey);
      await setSetting('userName', newUserName);
      await setSetting('userPersonality', newUserPersonality);

      setApiKey(newApiKey);
      setUserName(newUserName);
      setUserPersonality(newUserPersonality);
      
      initializeAI(newApiKey);

      // If this is the first time setting the key, load characters
      if (characters.length === 0) {
          const storedCharacters = await getAllCharacters();
          setCharacters(storedCharacters);
      }

      setShowSettings(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('Could not save settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChatSettings = async (newInstruction: string) => {
    if (!currentCharacter) return;

    if (!window.confirm("Saving new instructions will reset the current chat to apply them. Continue?")) {
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Applying new settings...');

    const updatedCharacter = { ...currentCharacter, systemInstruction: newInstruction.trim() ? newInstruction.trim() : undefined };

    try {
      await saveCharacter(updatedCharacter);

      setCurrentCharacter(updatedCharacter);
      setCharacters(chars => chars.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));

      initializeChat(updatedCharacter, userName, userPersonality);

      setLoadingMessage('Character is thinking of a new greeting...');
      const greeting = await generateGreeting(updatedCharacter, userName, userPersonality);
      setMessages([{ sender: 'ai', text: greeting, emotion: 'happy' }]);

      setShowChatSettings(false);
    } catch (error) {
      console.error("Error saving chat settings:", error);
      alert("Failed to save settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetSceneFromUpload = (dataUrl: string) => {
    setSceneImageUrl(dataUrl);
    setMessages(prev => [...prev, { sender: 'system', text: 'Scene updated from uploaded image.' }]);
  };

  const handleSaveTransform = async (characterId: string, transform: { x: number; y: number; scale: number; }) => {
    const characterToUpdate = characters.find(c => c.id === characterId);
    if (characterToUpdate) {
      const updatedCharacter = { ...characterToUpdate, transform };
      
      // Update state
      const updatedCharacters = characters.map(c => c.id === characterId ? updatedCharacter : c);
      setCharacters(updatedCharacters);
      if (currentCharacter?.id === characterId) {
        setCurrentCharacter(updatedCharacter);
      }

      // Save to DB
      await saveCharacter(updatedCharacter);
    }
  };

  const handleUpdateIndicator = async (newValue: number) => {
    if (!currentCharacter) return;
    const newIndicatorValue = Math.max(0, Math.min(100, newValue));
    const updatedCharacter = { ...currentCharacter, indicator: { ...currentCharacter.indicator, value: newIndicatorValue } };
    
    setCurrentCharacter(updatedCharacter);
    await saveCharacter(updatedCharacter);
    setCharacters(chars => chars.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
    
    setMessages(prev => [...prev, { sender: 'system', text: `${updatedCharacter.indicator.name} has been set to ${newIndicatorValue}.` }]);
    
    // Re-initialize chat with new indicator value in context
    initializeChat(updatedCharacter, userName, userPersonality);
  };
  
  const handleImportCharacters = async (importedData: any) => {
    setIsLoading(true);
    setLoadingMessage('Importing characters...');
    try {
      if (!Array.isArray(importedData)) {
        throw new Error("Import file is not a valid character array.");
      }
      
      const charactersToImport: Character[] = importedData.filter(c => c && c.id && c.name && c.sprites);
      if (charactersToImport.length === 0) {
        throw new Error("No valid character data found in file.");
      }

      const existingCharacters = await getAllCharacters();
      const existingIds = new Set(existingCharacters.map(c => c.id));
      
      const promises = charactersToImport.map(char => {
        let charToSave = { ...char };
        // Ensure indicator exists
        if (!charToSave.indicator) {
            charToSave.indicator = { name: 'Affection', value: 50 };
        }
        // Ensure emotions array exists
        if (!charToSave.emotions || charToSave.emotions.length === 0) {
            charToSave.emotions = Object.keys(charToSave.sprites);
        }

        if (existingIds.has(charToSave.id)) {
          // If ID exists, update the existing character
          return saveCharacter(charToSave);
        } else {
          // Otherwise, save as a new character
          return saveCharacter(charToSave);
        }
      });
      
      await Promise.all(promises);
      
      const allLatestCharacters = await getAllCharacters();
      setCharacters(allLatestCharacters);

      alert(`Successfully imported/updated ${charactersToImport.length} character(s).`);
    } catch (error) {
      console.error("Failed to import characters:", error);
      alert(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={appContainerRef} className="w-screen bg-black flex justify-center items-center overflow-hidden">
      <div className="relative w-full h-full max-w-2xl lg:max-w-4xl aspect-[9/16] sm:aspect-auto bg-gray-900">
        {isLoading && <LoadingOverlay message={loadingMessage} />}
        {showSettings && <SettingsModal currentName={userName} currentPersonality={userPersonality} currentApiKey={apiKey} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />}
        {showChatSettings && currentCharacter && (
          <ChatSettingsModal
            characterName={currentCharacter.name}
            currentInstruction={currentCharacter.systemInstruction || ''}
            defaultInstruction={getDefaultSystemInstruction(currentCharacter, userName, userPersonality)}
            onSave={handleSaveChatSettings}
            onClose={() => setShowChatSettings(false)}
          />
        )}
        
        {showCreator && (
          <CharacterCreator
            onSave={handleSaveCharacter}
            onClose={handleCloseCreator}
            characterToEdit={editingCharacter}
          />
        )}
        
        {!isLoading && !showSettings && apiKey && currentPage === 'characterList' && (
          <CharacterListPage
            characters={characters}
            onSelectCharacter={handleSelectCharacter}
            onCreateNew={() => setShowCreator(true)}
            onEditCharacter={handleEditCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onShowSettings={() => setShowSettings(true)}
            onImportCharacters={handleImportCharacters}
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
            onBack={() => window.history.back()}
            onShowSettings={() => setShowChatSettings(true)}
            onSaveTransform={handleSaveTransform}
            onUpdateIndicator={handleUpdateIndicator}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default App;
