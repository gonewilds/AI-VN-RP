
import React, { useEffect, useRef } from 'react';
import type { Message } from '../types';

interface DialogueBoxProps {
  messages: Message[];
  characterName: string;
}

const DialogueBox: React.FC<DialogueBoxProps> = ({ messages, characterName }) => {
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getDisplayName = (sender: 'ai' | 'user' | 'system') => {
    if (sender === 'ai') return characterName;
    if (sender === 'user') return 'You';
    return 'System';
  };
  
  const getTextColor = (sender: 'ai' | 'user' | 'system') => {
    if (sender === 'ai') return 'text-pink-300';
    if (sender === 'user') return 'text-cyan-300';
    return 'text-yellow-300';
  }

  return (
    <div className="h-40 sm:h-48 bg-black bg-opacity-70 p-4 rounded-lg border-2 border-purple-400 overflow-y-auto custom-scrollbar">
      {messages.map((msg, index) => (
        <div key={index} ref={index === messages.length - 1 ? lastMessageRef : null}>
          {msg.sender !== 'system' ? (
            <p className="dialogue-text text-white leading-relaxed">
              <span className={`font-bold ${getTextColor(msg.sender)}`}>{getDisplayName(msg.sender)}: </span>
              {msg.text}
            </p>
          ) : (
            <p className="dialogue-text text-yellow-400 italic text-sm my-1">
              {msg.text}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default DialogueBox;
