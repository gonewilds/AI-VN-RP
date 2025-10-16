import React, { useState, useMemo, useEffect } from 'react';
import type { Character } from '../types';

interface CharacterCreatorProps {
  onSave: (data: Omit<Character, 'id' | 'sprites'>, sprites: Record<string, string>) => void;
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

  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [visualDescription, setVisualDescription] = useState('');
  const [greeting, setGreeting] = useState('');
  const [sceneImageUrl, setSceneImageUrl] = useState<string | undefined>(undefined);
  const [systemInstruction, setSystemInstruction] = useState('');
  const [emotions, setEmotions] = useState<string[]>(['neutral', 'happy', 'sad']);
  const [sprites, setSprites] = useState<Record<string, string | null>>({});
  const [indicatorName, setIndicatorName] = useState('Affection');
  const [indicatorValue, setIndicatorValue] = useState(50);

  useEffect(() => {
    if (isEditMode && characterToEdit) {
      setName(characterToEdit.name);
      setPersonality(characterToEdit.personality);
      setVisualDescription(characterToEdit.visualDescription);
      setGreeting(characterToEdit.greeting || '');
      setEmotions(characterToEdit.emotions);
      setSprites(characterToEdit.sprites);
      setSceneImageUrl(characterToEdit.sceneImageUrl);
      setIndicatorName(characterToEdit.indicator.name);
      setIndicatorValue(characterToEdit.indicator.value);
      setSystemInstruction(characterToEdit.systemInstruction || '');
    }
  }, [isEditMode, characterToEdit]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isFormValid) {
        const commonData: Omit<Character, 'id' | 'sprites' | 'emotions'> = {
            name,
            personality,
            visualDescription,
            greeting: greeting.trim() ? greeting.trim() : undefined,
            sceneImageUrl,
            transform: characterToEdit?.transform, // Preserve existing transform
            indicator: { name: indicatorName.trim() || 'Affection', value: indicatorValue },
            systemInstruction: systemInstruction.trim() ? systemInstruction.trim() : undefined,
        };

        const finalSprites = Object.fromEntries(Object.entries(sprites).filter(([, val]) => val !== null)) as Record<string, string>;
        onSave({ ...commonData, emotions }, finalSprites);
    }
  };

  const handleFileChange = async (type: string | 'scene', file: File | null) => {
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
  
  const isFormValid = useMemo(() => {
    return name.trim() !== '' && personality.trim() !== '' && emotions.every(e => !!sprites[e]);
  }, [name, personality, sprites, emotions]);

    const handleEmotionNameChange = (index: number, newName: string) => {
        const oldName = emotions[index];
        const updatedEmotions = [...emotions];
        updatedEmotions[index] = newName;
        setEmotions(updatedEmotions);
        
        if (sprites[oldName]) {
            setSprites(prev => {
                const newSprites = {...prev};
                newSprites[newName] = newSprites[oldName];
                delete newSprites[oldName];
                return newSprites;
            });
        }
    };
    
    const addEmotion = () => {
        const newEmotionName = `Emotion ${emotions.length + 1}`;
        setEmotions(prev => [...prev, newEmotionName]);
    };

    const removeEmotion = (indexToRemove: number) => {
        if (emotions.length <= 1) {
            alert("A character must have at least one emotion.");
            return;
        }
        const nameToRemove = emotions[indexToRemove];
        setEmotions(prev => prev.filter((_, i) => i !== indexToRemove));
        setSprites(prev => {
            const newSprites = {...prev};
            delete newSprites[nameToRemove];
            return newSprites;
        });
    };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 border-2 border-purple-500 rounded-lg w-full max-w-3xl shadow-2xl relative text-white flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-white z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-6">
          <h2 className="text-2xl font-bold text-pink-400 border-b-2 border-purple-500 pb-2">{isEditMode ? 'Edit Character' : 'Create Character'}</h2>
          
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
          
           <div>
            <label htmlFor="visual-description" className="block text-sm font-medium text-gray-300">Visual Description (Optional)</label>
            <textarea id="visual-description" value={visualDescription} onChange={(e) => setVisualDescription(e.target.value)} rows={2} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2" placeholder="Notes about the character's appearance..." />
          </div>
          
          <div>
            <label htmlFor="char-greeting" className="block text-sm font-medium text-gray-300">Greeting Message (Optional)</label>
            <textarea id="char-greeting" value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={2} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2" placeholder="The first thing this character says to the user. If empty, a generic greeting will be used." />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-purple-300 border-b border-gray-600 pb-2">Character Sprites & Emotions</h3>
              {emotions.map((emotion, index) => (
                <div key={index} className="flex items-center gap-4 p-2 bg-gray-700 rounded-md">
                  <div className="w-24 h-32 bg-gray-600 rounded-md flex-shrink-0">
                      {sprites[emotion] && <img src={sprites[emotion]} alt={`${emotion} preview`} className="w-full h-full object-contain rounded-md" />}
                  </div>
                  <div className="flex-grow space-y-2">
                      <input
                          type="text"
                          value={emotion}
                          onChange={(e) => handleEmotionNameChange(index, e.target.value)}
                          placeholder="Emotion Name (e.g., happy)"
                          className="block w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-sm"
                      />
                        <input
                          type="file"
                          accept="image/png, image/jpeg"
                          onChange={(e) => handleFileChange(emotion, e.target.files ? e.target.files[0] : null)}
                          className="block w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                      />
                  </div>
                  <button type="button" onClick={() => removeEmotion(index)} className="text-red-400 hover:text-red-300 p-2" title="Remove Emotion">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              ))}
              <button type="button" onClick={addEmotion} className="w-full mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors text-sm">Add Emotion</button>
          </div>
         
          <div>
              <h3 className="text-lg font-semibold text-purple-300 border-b border-gray-600 pb-2">Relationship Indicator</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <input 
                    type="text"
                    value={indicatorName}
                    onChange={(e) => setIndicatorName(e.target.value)}
                    className="block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"
                    placeholder="Indicator Name (e.g. Affection)"
                  />
                  <div className="flex items-center gap-2">
                      <input 
                        type="range" min="0" max="100"
                        value={indicatorValue}
                        onChange={(e) => setIndicatorValue(Number(e.target.value))}
                        className="w-full"
                      />
                      <span className="font-mono bg-gray-900 px-2 py-1 rounded-md">{indicatorValue}</span>
                  </div>
              </div>
          </div>
          
           <div>
              <h3 className="text-lg font-semibold text-purple-300 border-b border-gray-600 pb-2">Character's Scene (Optional)</h3>
              <div className="mt-2 flex items-center gap-4">
                  <div className="w-48 h-28 bg-gray-700 rounded-md flex items-center justify-center flex-shrink-0">
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

          <details className="bg-gray-900/50 p-3 rounded-lg">
            <summary className="text-lg font-semibold text-purple-300 cursor-pointer select-none">Advanced: System Instruction</summary>
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-2">
                This will override the default instructions for this character. Leave empty to use the default. You can use placeholders like {'{{character.name}}'} or {'{{user.name}}'}.
                <br/>
                <span className="font-bold text-yellow-400">Warning:</span> For the app to work, the AI's response must be a valid JSON object.
              </p>
              <textarea 
                value={systemInstruction} 
                onChange={(e) => setSystemInstruction(e.target.value)} 
                rows={5} 
                className="block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm custom-scrollbar"
                placeholder="Customize how the AI should behave..."
              />
            </div>
          </details>

          <div className="flex justify-end pt-4">
            <button type="submit" className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed" disabled={!isFormValid}>
              {isEditMode ? 'Save Changes' : 'Create Character'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CharacterCreator;
