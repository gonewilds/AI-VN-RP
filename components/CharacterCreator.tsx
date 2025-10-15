import React, { useState, useMemo, useEffect } from 'react';
import { ALL_EMOTIONS } from '../constants';
import type { Character, Emotion } from '../types';

interface CharacterCreatorProps {
  onSave: (data: Omit<Character, 'id' | 'sprites'>, sprites?: Record<Emotion, string>) => void;
  onClose: () => void;
  characterToEdit: Character | null;
}

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onSave, onClose, characterToEdit }) => {
  const isEditMode = !!characterToEdit;
  const [mode, setMode] = useState<'ai' | 'upload'>(isEditMode ? 'upload' : 'ai');

  // Shared state
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [sceneImageUrl, setSceneImageUrl] = useState<string | undefined>(undefined);
  const [systemInstruction, setSystemInstruction] = useState<string | undefined>(undefined);
  
  // State for AI creation
  const [aiVisualDescription, setAiVisualDescription] = useState('');

  // State for Upload/Edit creation
  const [sprites, setSprites] = useState<Record<Emotion, string | null>>(Object.fromEntries(ALL_EMOTIONS.map(e => [e, null])) as Record<Emotion, null>);

  useEffect(() => {
    if (isEditMode && characterToEdit) {
      setName(characterToEdit.name);
      setPersonality(characterToEdit.personality);
      setAiVisualDescription(characterToEdit.visualDescription);
      setSprites(characterToEdit.sprites);
      setSceneImageUrl(characterToEdit.sceneImageUrl);
      setSystemInstruction(characterToEdit.systemInstruction);
    }
  }, [isEditMode, characterToEdit]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const commonData: Omit<Character, 'id' | 'sprites'> = {
        name,
        personality,
        visualDescription: mode === 'ai' ? aiVisualDescription : (characterToEdit?.visualDescription || 'User-provided images.'),
        sceneImageUrl,
        systemInstruction,
        transform: characterToEdit?.transform, // Preserve existing transform
    };

    if (mode === 'ai') {
        if (isAiFormValid) {
            onSave(commonData);
        }
    } else { // upload mode
        if (isUploadFormValid) {
            onSave(commonData, sprites as Record<Emotion, string>);
        }
    }
  };

  const handleFileChange = async (type: Emotion | 'scene', file: File | null) => {
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        alert(`File for ${type} is too large. Please upload an image under 4MB.`);
        return;
      }
      try {
        const dataUrl = await fileToDataUrl(file);
        if (type === 'scene') {
            setSceneImageUrl(dataUrl);
        } else {
            setSprites(prev => ({ ...prev, [type]: dataUrl }));
        }
      } catch (error) {
        console.error("Error reading file:", error);
        alert('There was an error processing your image.');
      }
    }
  };
  
  const isAiFormValid = useMemo(() => {
    return name.trim() !== '' && personality.trim() !== '' && aiVisualDescription.trim() !== '';
  }, [name, personality, aiVisualDescription]);

  const isUploadFormValid = useMemo(() => {
    return name.trim() !== '' && personality.trim() !== '' && Object.values(sprites).every(s => s !== null);
  }, [name, personality, sprites]);
  
  const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode, disabled?: boolean }> = ({ active, onClick, children, disabled }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${
        active ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 border-2 border-purple-500 rounded-lg w-full max-w-3xl shadow-2xl relative text-white flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-white z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex-shrink-0 border-b-2 border-purple-500 px-6 pt-4">
            <div className="flex space-x-2">
                <TabButton active={mode === 'ai'} onClick={() => setMode('ai')} disabled={isEditMode}>Create with AI</TabButton>
                <TabButton active={mode === 'upload'} onClick={() => setMode('upload')}>{isEditMode ? 'Edit Sprites & Scene' : 'Upload Sprites & Scene'}</TabButton>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-4">
          <h2 className="text-2xl font-bold text-pink-400">{isEditMode ? 'Edit Character' : 'Create Character'}</h2>
          
          {/* Common Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="char-name" className="block text-sm font-medium text-gray-300">Name</label>
                <input id="char-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2" required />
              </div>
              <div>
                <label htmlFor="char-personality" className="block text-sm font-medium text-gray-300">Personality</label>
                <textarea id="char-personality" value={personality} onChange={(e) => setPersonality(e.target.value)} rows={1} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2" required />
              </div>
          </div>
          
          {mode === 'ai' && (
             <div className="space-y-4">
              <div>
                <label htmlFor="ai-visualDescription" className="block text-sm font-medium text-gray-300">Visual Description (for AI Generation)</label>
                <textarea id="ai-visualDescription" value={aiVisualDescription} onChange={(e) => setAiVisualDescription(e.target.value)} rows={2} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2" placeholder="e.g., Long silver hair, wears glasses..." required />
              </div>
            </div>
          )}

          {mode === 'upload' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-purple-300 border-b border-gray-600 pb-2">Character Sprites</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {ALL_EMOTIONS.map(emotion => (
                  <div key={emotion}>
                    <label className="block text-sm font-medium text-gray-300 capitalize mb-1 text-center">{emotion}</label>
                    <div className="aspect-w-3 aspect-h-4 bg-gray-700 rounded-md flex items-center justify-center">
                      {sprites[emotion] ? (
                        <img src={sprites[emotion]} alt={`${emotion} preview`} className="w-full h-full object-contain rounded-md" />
                      ) : (
                        <span className="text-gray-400 text-xs text-center">Upload Image</span>
                      )}
                    </div>
                     <input
                        type="file"
                        accept="image/png, image/jpeg"
                        onChange={(e) => handleFileChange(emotion, e.target.files ? e.target.files[0] : null)}
                        className="mt-2 block w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                      />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
              <h3 className="text-lg font-semibold text-purple-300 border-b border-gray-600 pb-2">Custom System Instructions (Advanced)</h3>
              <textarea 
                value={systemInstruction || ''}
                onChange={(e) => setSystemInstruction(e.target.value)}
                rows={4}
                className="mt-2 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"
                placeholder="Leave blank to use default instructions based on personality. Or, provide your own detailed instructions for the AI character."
              />
          </div>
          
          {/* Scene Uploader */}
           <div>
              <h3 className="text-lg font-semibold text-purple-300 border-b border-gray-600 pb-2">Character's Scene (Optional)</h3>
              <div className="mt-2 flex items-center gap-4">
                  <div className="w-48 h-28 bg-gray-700 rounded-md flex items-center justify-center">
                      {sceneImageUrl ? (
                          <img src={sceneImageUrl} alt="Scene preview" className="w-full h-full object-cover rounded-md" />
                      ) : (
                          <span className="text-gray-400 text-xs text-center">Upload a 16:9 Image</span>
                      )}
                  </div>
                  <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={(e) => handleFileChange('scene', e.target.files ? e.target.files[0] : null)}
                      className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                    />
              </div>
           </div>

          <div className="flex justify-end pt-4">
            <button type="submit" className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed" disabled={mode === 'ai' ? !isAiFormValid : !isUploadFormValid}>
              {isEditMode ? 'Save Changes' : (mode === 'ai' ? 'Generate Character' : 'Create Character')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CharacterCreator;
