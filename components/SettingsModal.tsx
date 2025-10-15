import React, { useState } from 'react';

interface SettingsModalProps {
  currentName: string;
  currentPersonality: string;
  currentApiKey: string;
  onSave: (newName: string, newPersonality: string, newApiKey: string) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ currentName, currentPersonality, currentApiKey, onSave, onClose }) => {
  const [name, setName] = useState(currentName);
  const [personality, setPersonality] = useState(currentPersonality);
  const [apiKey, setApiKey] = useState(currentApiKey);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && apiKey.trim()) {
      onSave(name.trim(), personality.trim(), apiKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <form onSubmit={handleSave} className="bg-gray-800 border-2 border-purple-500 rounded-lg w-full max-w-md shadow-2xl relative text-white p-6 space-y-4">
        <button type="button" onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-pink-400">Settings</h2>
        
        <div>
          <label htmlFor="api-key" className="block text-sm font-medium text-gray-300">Google Gemini API Key</label>
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Enter your API Key"
            required
          />
           <p className="text-xs text-gray-400 mt-1">Your key is stored securely in your browser's IndexedDB and never leaves your device.</p>
        </div>
        
        <div>
          <label htmlFor="user-name" className="block text-sm font-medium text-gray-300">Your Name</label>
          <input
            id="user-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-pink-500 focus:border-pink-500"
            placeholder="Enter your name"
            required
          />
        </div>
        
        <div>
          <label htmlFor="user-personality" className="block text-sm font-medium text-gray-300">Your Personality (Optional)</label>
          <textarea
            id="user-personality"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            rows={3}
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-pink-500 focus:border-pink-500"
            placeholder="e.g., Quiet and observant, loves reading books..."
          />
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-lg transition-colors disabled:bg-gray-600" disabled={!name.trim() || !apiKey.trim()}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsModal;
