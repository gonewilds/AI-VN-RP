import React, { useState } from 'react';

interface ChatSettingsModalProps {
  characterName: string;
  currentInstruction: string;
  defaultInstruction: string;
  onSave: (newInstruction: string) => void;
  onClose: () => void;
}

const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({ characterName, currentInstruction, defaultInstruction, onSave, onClose }) => {
  const [instruction, setInstruction] = useState(currentInstruction || defaultInstruction);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(instruction);
  };

  const handleReset = () => {
    setInstruction(defaultInstruction);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <form onSubmit={handleSave} className="bg-gray-800 border-2 border-purple-500 rounded-lg w-full max-w-lg shadow-2xl relative text-white p-6 flex flex-col max-h-[90vh]">
        <button type="button" onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-white z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-pink-400">Chat Settings for {characterName}</h2>
        <p className="text-sm text-gray-400 mt-1 mb-4">
          Edit the system instructions that guide the AI's behavior. Saving will reset the chat.
        </p>
        
        <div className="flex-grow flex flex-col">
          <label htmlFor="system-instruction" className="block text-sm font-medium text-gray-300">System Instruction</label>
          <textarea
            id="system-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="mt-1 block w-full h-full flex-grow bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-pink-500 focus:border-pink-500 custom-scrollbar text-sm"
            placeholder="Enter system instructions for the AI character..."
          />
        </div>

        <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-700">
          <button type="button" onClick={handleReset} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors text-sm">
            Reset to Default
          </button>
          <div className="space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-transparent hover:bg-gray-700 text-white font-bold rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-lg transition-colors">
              Save & Reset Chat
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatSettingsModal;
