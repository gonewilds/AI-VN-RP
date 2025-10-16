import React, { useState, useEffect } from 'react';
import type { Character } from '../types';

interface CharacterSpriteProps {
  character: Character;
  emotion: string;
  transform?: {
    x: number;
    y: number;
    scale: number;
  };
}

const CharacterSprite: React.FC<CharacterSpriteProps> = ({ character, emotion, transform }) => {
  const getSpriteUrl = (emo: string): string => {
    // Fallback to the first defined emotion if the current one doesn't exist.
    return character.sprites[emo] || character.sprites[character.emotions[0]];
  };
  
  const [currentUrl, setCurrentUrl] = useState<string>(getSpriteUrl(emotion));
  const [isFading, setIsFading] = useState<boolean>(false);

  useEffect(() => {
    const newUrl = getSpriteUrl(emotion);
    if (newUrl && newUrl !== currentUrl) {
      setIsFading(true);
      setTimeout(() => {
        setCurrentUrl(newUrl);
        setIsFading(false);
      }, 300); // Half of the transition duration
    }
  }, [emotion, character.sprites, currentUrl, character.emotions]);

  if (!currentUrl) return null;

  const transformStyle = {
    transform: `translate(${transform?.x || 0}%, ${transform?.y || 0}%) scale(${transform?.scale || 1})`,
    transition: 'transform 0.2s ease-out, opacity 0.5s ease-in-out',
  };

  return (
    <div 
      className="w-2/3 md:w-1/2 max-w-sm h-auto relative"
      style={transformStyle}
    >
      <img
        src={currentUrl}
        alt={`${character.name} - ${emotion}`}
        className={`character-sprite w-full h-full object-contain transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
};

export default CharacterSprite;
