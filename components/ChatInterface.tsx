import React, { useState, useRef } from 'react';
import type { Character, Message } from '../types';
import DialogueBox from './DialogueBox';
import CharacterSprite from './CharacterSprite';

interface ChatInterfaceProps {
  character: Character;
  sceneImageUrl: string;
  messages: Message[];
  onSendMessage: (message: string) => void;
  onGenerateScene: (prompt: string) => void;
  onUploadScene: (dataUrl: string) => void;
  onBack: () => void;
  isLoading: boolean;
}

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  character,
  sceneImageUrl,
  messages,
  onSendMessage,
  onGenerateScene,
  onUploadScene,
  onBack,
  isLoading
}) => {
  const [userInput, setUserInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessage = messages[messages.length - 1];
  const currentEmotion = lastMessage?.sender === 'ai' ? lastMessage.emotion : 'neutral';
  
  const handleSend = () => {
    if (userInput.startsWith('/scene ')) {
      const prompt = userInput.substring(7);
      onGenerateScene(prompt);
    } else {
      onSendMessage(userInput);
    }
    setUserInput('');
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await fileToDataUrl(file);
        onUploadScene(dataUrl);
        setIsMenuOpen(false);
      } catch (error) {
        console.error("Failed to read image file", error);
        alert("Sorry, there was an error uploading that image.");
      }
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col bg-gray-800">
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{ backgroundImage: `url(${sceneImageUrl})` }}
      />
      
      <div className="flex-grow flex justify-center items-end pb-40">
        <CharacterSprite character={character} emotion={currentEmotion || 'neutral'} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4">
        <DialogueBox messages={messages} characterName={character.name} />

        <div className="mt-2 flex items-center space-x-2">
           <button 
             onClick={() => setIsMenuOpen(!isMenuOpen)}
             className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 text-white font-bold p-2.5 rounded-full transition-transform duration-300 transform hover:scale-110"
             aria-label="Menu"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
             </svg>
           </button>
          
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder="Type your message or /scene <description>"
            disabled={isLoading}
            className="w-full p-3 bg-black bg-opacity-70 text-white rounded-lg border-2 border-purple-400 focus:border-purple-300 focus:ring-0 outline-none placeholder-gray-400 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !userInput.trim()}
            className="flex-shrink-0 bg-pink-500 text-white font-bold p-3 rounded-lg hover:bg-pink-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
          >
             {isLoading ? (
                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
             ) : ( 'Send' )}
          </button>
        </div>
      </div>
      {isMenuOpen && (
        <div 
          className="absolute top-2 left-2 bg-black bg-opacity-80 p-2 rounded-lg shadow-lg border border-purple-500 z-20 space-y-1"
        >
          <button onClick={handleUploadClick} className="block w-full text-left px-4 py-2 text-white hover:bg-purple-700 rounded transition-colors text-sm">
            Upload Scene
          </button>
          <button onClick={() => { onBack(); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-white hover:bg-purple-700 rounded transition-colors text-sm">
            Change Character
          </button>
        </div>
      )}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg" className="hidden" />
    </div>
  );
};

export default ChatInterface;
