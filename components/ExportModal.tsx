import React, { useState } from 'react';
import type { Character } from '../types';

interface ExportModalProps {
  characters: Character[];
  onClose: () => void;
  onExport: (selectedCharacterIds: string[]) => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ characters, onClose, onExport }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(characters.map(c => c.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleExport = () => {
    onExport(Array.from(selectedIds));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 border-2 border-purple-500 rounded-lg w-full max-w-md shadow-2xl relative text-white flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-white z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="p-6">
            <h2 className="text-2xl font-bold text-pink-400 border-b-2 border-purple-500 pb-2 mb-4">Export Characters</h2>
        </div>

        <div className="px-6 flex-grow overflow-y-auto custom-scrollbar space-y-2">
            <div className="flex gap-2 mb-4">
                <button onClick={handleSelectAll} className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded">Select All</button>
                <button onClick={handleDeselectAll} className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded">Deselect All</button>
            </div>
            {characters.length > 0 ? characters.map(char => (
                <div key={char.id} className="flex items-center bg-gray-700 p-2 rounded-md">
                    <input
                        type="checkbox"
                        id={`char-export-${char.id}`}
                        checked={selectedIds.has(char.id)}
                        onChange={() => handleToggle(char.id)}
                        className="w-5 h-5 accent-pink-500 bg-gray-900 border-gray-600 rounded focus:ring-pink-600 ring-offset-gray-800 focus:ring-2"
                    />
                    <label htmlFor={`char-export-${char.id}`} className="ml-3 text-white cursor-pointer select-none">
                        {char.name}
                    </label>
                </div>
            )) : (
              <p className="text-gray-400 text-center">No characters to export.</p>
            )}
        </div>

        <div className="flex justify-end items-center p-6 border-t border-gray-700 mt-4 space-x-2">
            <button onClick={onClose} className="px-4 py-2 bg-transparent hover:bg-gray-700 text-white font-bold rounded-lg transition-colors">
              Cancel
            </button>
            <button 
                onClick={handleExport}
                disabled={selectedIds.size === 0}
                className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                Export ({selectedIds.size})
            </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;