import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Chat, Type, Content } from '@google/genai';
import type { Character, Message } from './types';
import { DEFAULT_SCENE_URL, DEFAULT_AI_EMOTIONS } from './constants';
import ChatInterface from './components/ChatInterface';
import CharacterCreator from './components/CharacterCreator';
import LoadingOverlay from './components/LoadingOverlay';
import CharacterListPage from './components/CharacterListPage';
import SettingsModal from './components/SettingsModal';
import ChatSettingsModal from './components/ChatSettingsModal';
import { getAIResponse, initializeAI, isAIInitialized, getAI, generateImpersonatedResponses } from './services/geminiService';
import { getAllCharacters, saveCharacter, deleteCharacterDB, getSetting, setSetting, getChatHistory, saveChatHistory, deleteChatHistory } from './services/dbService';

const convertMessagesToHistory = (messages: Message[]): Content[] => {
  return messages
    .filter(msg => msg.sender === 'user' || msg.sender === 'ai')
    .map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));
};

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
  const [chatBoxHeight, setChatBoxHeight] = useState<number>(160); // Default height in pixels

  const chatRef = useRef<Chat | null>(null);
  const appContainerRef = useRef<HTMLDivElement>(null);

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

          const storedChatBoxHeight = await getSetting<number>('chatBoxHeight') || 160;
          setChatBoxHeight(storedChatBoxHeight);
          
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
  
  const getDefaultSystemInstruction = (): string => {
    return `You are an AI character in a visual novel. Your name is {{character.name}}. Your personality is described as: {{character.personality}}. 
    You are talking to a user named {{user.name}} whose personality is: {{user.personality}}. You must always stay in character.
    You have an indicator called "{{character.indicator.name}}" which is currently at {{character.indicator.value}} (out of 100). Your interactions should influence this value. A positive interaction may increase it, a negative one may decrease it. The value must stay between 0 and 100.
    When you respond, you must determine your current emotion based on the conversation.
    Actions or expressions should be described between asterisks, like *smiles*.
    Your response must be in a valid JSON format with three keys: "dialogue" for what you say, "emotion" for how you feel, and "indicatorValue" for the new value of "{{character.indicator.name}}".
    The possible emotions are only: {{character.emotions}}.
    Example: {"dialogue": "Hello there, *waves happily* it's great to see you, {{user.name}}!", "emotion": "happy", "indicatorValue": 51}`;
  };

  const initializeChat = useCallback((char: Character, history: Message[]) => {
    if (!isAIInitialized()) {
      console.error("AI not initialized. Cannot start chat.");
      alert("API Key is not configured correctly. Please check settings.");
      return;
    }
    const ai = getAI();
    let systemInstruction = char.systemInstruction || getDefaultSystemInstruction();
    
    // Replace placeholders
    systemInstruction = systemInstruction
        .replace(/{{character.name}}/g, char.name)
        .replace(/{{character.personality}}/g, char.personality)
        .replace(/{{character.indicator.name}}/g, char.indicator.name)
        .replace(/{{character.indicator.value}}/g, String(char.indicator.value))
        .replace(/{{character.emotions}}/g, char.emotions.join(', '))
        .replace(/{{user.name}}/g, userName)
        .replace(/{{user.personality}}/g, userPersonality || 'not specified');

    const geminiHistory = convertMessagesToHistory(history);

    chatRef.current = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: geminiHistory,
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
          required: ['dialogue', 'emotion', 'indicatorValue']
        },
      },
    });
  }, [userName, userPersonality]);
  
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

  const handleSendMessage = async (userInput: string, isRegeneration = false) => {
    if (!userInput.trim() || !chatRef.current || isLoading || !currentCharacter) return;

    let messagesForAI = [...messages];
    if (!isRegeneration) {
        const userMessage: Message = { id: `${Date.now()}-user`, sender: 'user', text: userInput };
        messagesForAI = [...messages, userMessage];
        setMessages(messagesForAI);
        await saveChatHistory(currentCharacter.id, messagesForAI);
    }
    
    setIsLoading(true);
    setLoadingMessage(isRegeneration ? 'Regenerating...' : 'Thinking...');

    try {
      const { dialogue, emotion, indicatorValue } = await getAIResponse(chatRef.current, userInput);
      const aiMessage: Message = { id: `${Date.now()}-ai`, sender: 'ai', text: dialogue, emotion: emotion || currentCharacter.emotions[0] || 'neutral' };
      
      const finalMessages = [...messagesForAI, aiMessage];
      setMessages(finalMessages);
      await saveChatHistory(currentCharacter.id, finalMessages);

      if (indicatorValue !== null && currentCharacter) {
        const newIndicatorValue = Math.max(0, Math.min(100, indicatorValue));
        const updatedCharacter = { ...currentCharacter, indicator: { ...currentCharacter.indicator, value: newIndicatorValue } };
        setCurrentCharacter(updatedCharacter);
        await saveCharacter(updatedCharacter);
        setCharacters(chars => chars.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
      }

    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage: Message = { id: `${Date.now()}-system`, sender: 'system', text: 'Sorry, I encountered an error. Please try again.' };
      const finalMessages = [...messagesForAI, errorMessage];
      setMessages(finalMessages);
      await saveChatHistory(currentCharacter.id, finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (isLoading || !currentCharacter) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.sender !== 'ai') return;

    const messagesWithoutLastAI = messages.slice(0, -1);
    const lastUserMessage = messagesWithoutLastAI.findLast(m => m.sender === 'user');

    if (!lastUserMessage) {
        alert("Cannot regenerate the initial greeting.");
        return; 
    }
    
    setMessages(messagesWithoutLastAI);
    await saveChatHistory(currentCharacter.id, messagesWithoutLastAI);
    
    initializeChat(currentCharacter, messagesWithoutLastAI);
    
    await handleSendMessage(lastUserMessage.text, true);
  };

  const handleSaveCharacter = async (data: Omit<Character, 'id' | 'sprites'>, sprites: Record<string, string>) => {
    setShowCreator(false);
    setEditingCharacter(null);
    setIsLoading(true);
    setLoadingMessage('Saving character...');

    try {
      // AI generation path is removed. Sprites are always provided by the user.
      const finalCharacter: Character = { ...data, id: editingCharacter?.id || Date.now().toString(), sprites };

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
      
      const history = await getChatHistory(character.id);
      initializeChat(character, history || []);
      
      if (character.sceneImageUrl) {
        setSceneImageUrl(character.sceneImageUrl);
      } else {
        // Use default static scene URL instead of generating one.
        setSceneImageUrl(DEFAULT_SCENE_URL);
      }

      if (history && history.length > 0) {
        setMessages(history);
      } else {
        const greeting = character.greeting || `Hello, ${userName}.`;
        const firstMessage: Message = { id: Date.now().toString(), sender: 'ai', text: greeting, emotion: 'happy' };
        setMessages([firstMessage]);
        await saveChatHistory(character.id, [firstMessage]);
        // Re-initialize chat with the greeting in history.
        initializeChat(character, [firstMessage]);
      }
      
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
    if (characterToDelete && window.confirm(`Are you sure you want to delete ${characterToDelete.name}? This will also delete their chat history.`)) {
      await deleteCharacterDB(characterId);
      await deleteChatHistory(characterId);
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

      setIsLoading(true);
      setLoadingMessage('Saving settings & restarting chat...');
      
      try {
          const updatedCharacter = { ...currentCharacter, systemInstruction: newInstruction };
          setCurrentCharacter(updatedCharacter);
          await saveCharacter(updatedCharacter);
          setCharacters(chars => chars.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
          
          await deleteChatHistory(currentCharacter.id);
          
          const greeting = updatedCharacter.greeting || `Hello, ${userName}.`;
          const firstMessage: Message = { id: Date.now().toString(), sender: 'ai', text: greeting, emotion: 'happy' };
          setMessages([firstMessage]);
          await saveChatHistory(updatedCharacter.id, [firstMessage]);
          
          initializeChat(updatedCharacter, [firstMessage]);
      } catch (error) {
          console.error("Failed to save chat settings:", error);
          alert("Could not save settings. Please try again.");
      } finally {
          setShowChatSettings(false);
          setIsLoading(false);
      }
  };

  const handleSetSceneFromUpload = async (dataUrl: string) => {
    setSceneImageUrl(dataUrl);
    const systemMessage: Message = { id: `${Date.now()}-system`, sender: 'system', text: 'Scene updated from uploaded image.' };
    const newMessages = [...messages, systemMessage];
    setMessages(newMessages);
    if(currentCharacter) {
      await saveChatHistory(currentCharacter.id, newMessages);
    }
  };

  const handleSaveTransform = async (characterId: string, transform: { x: number; y: number; scale: number; }) => {
    const characterToUpdate = characters.find(c => c.id === characterId);
    if (characterToUpdate) {
      const updatedCharacter = { ...characterToUpdate, transform };
      
      const updatedCharacters = characters.map(c => c.id === characterId ? updatedCharacter : c);
      setCharacters(updatedCharacters);
      if (currentCharacter?.id === characterId) {
        setCurrentCharacter(updatedCharacter);
      }

      await saveCharacter(updatedCharacter);
    }
  };

  const handleGenerateImpersonation = async (character: Character, currentMessages: Message[]): Promise<string[]> => {
      if (!isAIInitialized()) {
        alert("API Key is not configured.");
        return [];
      }
      return await generateImpersonatedResponses(character, currentMessages, userName, userPersonality);
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
        if (!charToSave.indicator) {
            charToSave.indicator = { name: 'Affection', value: 50 };
        }
        if (!charToSave.emotions || charToSave.emotions.length === 0) {
            charToSave.emotions = Object.keys(charToSave.sprites);
        }

        return saveCharacter(charToSave);
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

  const handleNewChat = async () => {
    if (!currentCharacter || !window.confirm("Are you sure you want to start a new chat? The current history will be deleted.")) return;
    
    setIsLoading(true);
    setLoadingMessage('Starting new conversation...');

    try {
        await deleteChatHistory(currentCharacter.id);
        const greeting = currentCharacter.greeting || `Hello, ${userName}.`;
        const firstMessage: Message = { id: Date.now().toString(), sender: 'ai', text: greeting, emotion: 'happy' };
        setMessages([firstMessage]);
        await saveChatHistory(currentCharacter.id, [firstMessage]);
        initializeChat(currentCharacter, [firstMessage]);
    } catch (error) {
        console.error("Failed to start new chat:", error);
        alert("Could not start a new chat. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentCharacter) return;

    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const newMessages = messages.slice(0, messageIndex);
    
    setMessages(newMessages);
    await saveChatHistory(currentCharacter.id, newMessages);
    initializeChat(currentCharacter, newMessages);
    
    alert("Message deleted. The conversation has been rolled back to the previous state.");
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!currentCharacter) return;

    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const newMessages = messages.slice(0, messageIndex + 1);
    newMessages[messageIndex] = { ...newMessages[messageIndex], text: newText };

    setMessages(newMessages);
    await saveChatHistory(currentCharacter.id, newMessages);
    initializeChat(currentCharacter, newMessages);
    
    alert("Message edited. The conversation has been rolled back to this point.");
  };

  const handleChatBoxHeightChange = async (newHeight: number) => {
    setChatBoxHeight(newHeight);
    await setSetting('chatBoxHeight', newHeight);
  };

  return (
    <div ref={appContainerRef} className="w-screen bg-black flex justify-center items-center overflow-hidden">
      <div className="relative w-full h-full max-w-2xl lg:max-w-4xl aspect-[9/16] sm:aspect-auto bg-gray-900">
        {isLoading && <LoadingOverlay message={loadingMessage} />}
        {showSettings && <SettingsModal currentName={userName} currentPersonality={userPersonality} currentApiKey={apiKey} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />}
        
        {showCreator && (
          <CharacterCreator
            onSave={handleSaveCharacter}
            onClose={handleCloseCreator}
            characterToEdit={editingCharacter}
          />
        )}

        {showChatSettings && currentCharacter && (
          <ChatSettingsModal
            character={currentCharacter}
            currentInstruction={currentCharacter.systemInstruction || ''}
            defaultInstruction={getDefaultSystemInstruction()}
            onSave={handleSaveChatSettings}
            onClose={() => setShowChatSettings(false)}
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
            onUploadScene={handleSetSceneFromUpload}
            onBack={() => window.history.back()}
            onSaveTransform={handleSaveTransform}
            onGenerateImpersonation={handleGenerateImpersonation}
            onRegenerate={handleRegenerate}
            onNewChat={handleNewChat}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            isLoading={isLoading}
            onShowChatSettings={() => setShowChatSettings(true)}
            chatBoxHeight={chatBoxHeight}
            onChatBoxHeightChange={handleChatBoxHeightChange}
          />
        )}
      </div>
    </div>
  );
};

export default App;
