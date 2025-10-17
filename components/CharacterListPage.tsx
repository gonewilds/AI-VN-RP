import React, { useRef, useState } from 'react';
import type { Character } from '../types';
import ExportModal from './ExportModal';

interface CharacterListPageProps {
  characters: Character[];
  onSelectCharacter: (character: Character) => void;
  onCreateNew: () => void;
  onEditCharacter: (character: Character) => void;
  onDeleteCharacter: (characterId: string) => void;
  onShowSettings: () => void;
  onImportCharacters: (characters: Character[]) => void;
}

const CharacterListPage: React.FC<CharacterListPageProps> = ({
  characters,
  onSelectCharacter,
  onCreateNew,
  onEditCharacter,
  onDeleteCharacter,
  onShowSettings,
  onImportCharacters,
}) => {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExportSelected = (selectedIds: string[]) => {
    const charactersToExport = characters.filter(c => selectedIds.includes(c.id));
    if (charactersToExport.length === 0) {
      alert("No characters selected for export.");
      return;
    }
    try {
      const dataStr = JSON.stringify(charactersToExport, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `ai-vn-characters-export-${new Date().toISOString().split('T')[0]}.json`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export characters:", error);
      alert("An error occurred while exporting characters.");
    }
    setShowExportModal(false);
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const importedData = JSON.parse(text);
        onImportCharacters(importedData);
      } catch (error) {
        console.error("Failed to import file:", error);
        alert("Invalid JSON file. Please select a valid character export file.");
      }
      // Reset the file input value to allow re-uploading the same file
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      alert("Error reading the file.");
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <div 
        className="w-full h-full text-white p-4 sm:p-8 flex flex-col bg-cover bg-center"
        style={{backgroundImage: 'linear-gradient(rgba(17, 24, 39, 0.8), rgba(17, 24, 39, 0.8)), url(https://source.unsplash.com/random/1600x900/?anime,sky)'}}
      >
        <header className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-pink-400 dialogue-text">
            AI Visual Novel
          </h1>
          <p className="text-gray-300 mt-2">Select a character to begin your story</p>
        </header>
        
        <div className="flex justify-center items-center gap-2 sm:gap-4 my-6">
            <button onClick={handleImportClick} title="Import Characters" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-transform transform hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Import</span>
            </button>
            <button onClick={() => setShowExportModal(true)} title="Export Characters" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-transform transform hover:scale-105">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM10 2a1 1 0 011 1v10.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 13.586V3a1 1 0 011-1z" clipRule="evenodd" />
               </svg>
               <span className="hidden sm:inline">Export</span>
            </button>
            <button onClick={onShowSettings} title="Settings" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-transform transform hover:scale-105" aria-label="Settings">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-1.57 1.996A1.532 1.532 0 013.17 7.49c-1.56.38-1.56 2.6 0 2.98a1.532 1.532 0 01.948 2.286c-.836 1.372.734 2.942 1.996 1.57A1.532 1.532 0 017.49 16.83c.38 1.56 2.6 1.56 2.98 0a1.532 1.532 0 012.286-.948c1.372.836 2.942-.734 1.57-1.996A1.532 1.532 0 0116.83 12.51c1.56-.38 1.56-2.6 0-2.98a1.532 1.532 0 01-.948-2.286c.836-1.372-.734-2.942-1.996-1.57A1.532 1.532 0 0112.51 3.17zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Settings</span>
            </button>
            <input type="file" ref={importInputRef} onChange={handleFileSelect} className="hidden" accept="application/json,.json" />
        </div>

        <main className="flex-grow overflow-y-auto custom-scrollbar -mr-2 pr-2">
          {characters.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-lg text-gray-400 mb-4">No characters found.</p>
                  <button
                      onClick={onCreateNew}
                      className="flex items-center justify-center w-full max-w-xs p-4 bg-green-500 bg-opacity-80 border-2 border-green-400 rounded-lg shadow-lg hover:bg-opacity-100 transition-all duration-300 transform hover:scale-105"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xl font-bold">Create Your First Character</span>
                  </button>
             </div>
          ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {characters.map(char => (
                  <div key={char.id} className="group relative aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-transparent hover:border-pink-500 transition-all duration-300">
                  <img src={char.sprites[char.emotions[0]] || 'https://via.placeholder.com/300x400.png?text=No+Sprite'} alt={char.name} className="w-full h-full object-cover group-hover:opacity-30 transition-opacity duration-300" loading="lazy" />
                  <div className="absolute inset-0 flex flex-col justify-end p-2 bg-gradient-to-t from-black via-black/70 to-transparent">
                      <h2 className="text-base font-bold dialogue-text truncate">{char.name}</h2>
                      <div className="flex flex-col items-stretch mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 space-y-1">
                      <button onClick={() => onSelectCharacter(char)} className="w-full px-2 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold rounded-md transition-colors">Chat</button>
                      <div className="flex space-x-1">
                          <button onClick={() => onEditCharacter(char)} className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md transition-colors">Edit</button>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteCharacter(char.id); }} className="w-full px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md transition-colors">Delete</button>
                      </div>
                      </div>
                  </div>
                  </div>
              ))}
              <button
                  onClick={onCreateNew}
                  className="group flex flex-col items-center justify-center aspect-[3/4] bg-black bg-opacity-40 border-2 border-dashed border-gray-500 rounded-lg hover:border-purple-500 hover:bg-opacity-60 transition-all duration-300"
                  aria-label="Create new character"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 group-hover:text-purple-400 transition-colors" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span className="mt-2 text-sm font-semibold text-gray-400 group-hover:text-purple-400">Create New</span>
              </button>
              </div>
          )}
        </main>
      </div>
      {showExportModal && (
        <ExportModal 
          characters={characters}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportSelected}
        />
      )}
    </>
  );
};

export default CharacterListPage;