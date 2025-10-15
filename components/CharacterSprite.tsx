
import React, { useState, useEffect } from 'react';
import type { Character, Emotion } from '../types';

interface CharacterSpriteProps {
  character: Character;
  emotion: Emotion;
}

const CharacterSprite: React.FC<CharacterSpriteProps> = ({ character, emotion }) => {
  const [currentUrl, setCurrentUrl] = useState<string>(character.sprites[emotion]);
  const [isFading, setIsFading] = useState<boolean>(false);

  useEffect(() => {
    const newUrl = character.sprites[emotion];
    if (newUrl && newUrl !== currentUrl) {
      setIsFading(true);
      setTimeout(() => {
        setCurrentUrl(newUrl);
        setIsFading(false);
      }, 300); // Half of the transition duration
    }
  }, [emotion, character.sprites, currentUrl]);

  if (!currentUrl) return null;

  return (
    <div className="w-2/3 md:w-1/2 max-w-sm h-auto relative">
      <img
        src={currentUrl}
        alt={`${character.name} - ${emotion}`}
        className={`character-sprite w-full h-full object-contain transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
};

export default CharacterSprite;
