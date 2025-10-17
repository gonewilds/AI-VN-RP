import React, { useEffect, useRef, useState } from 'react';
import type { Message } from '../types';

interface DialogueBoxProps {
  messages: Message[];
  characterName: string;
  onEditMessage: (messageId: string, newText: string) => void;
  onDeleteMessage: (messageId: string) => void;
  height: number;
}

const MessageActions: React.FC<{ message: Message; onEdit: () => void; onDelete: () => void; }> = ({ message, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="text-gray-400 hover:text-white p-1 rounded-full">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-1 w-28 bg-gray-900 border border-purple-500 rounded-md shadow-lg z-10 text-sm">
          {message.sender === 'user' && (
            <button onClick={() => { onEdit(); setIsOpen(false); }} className="block w-full text-left px-3 py-1.5 text-white hover:bg-purple-700 rounded-t-md">Edit</button>
          )}
          <button onClick={() => { onDelete(); setIsOpen(false); }} className="block w-full text-left px-3 py-1.5 text-white hover:bg-purple-700 rounded-b-md">Delete</button>
        </div>
      )}
    </div>
  );
};

const parseMessageText = (text: string): React.ReactNode => {
  const parts = text.split(/(\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index} className="action-text">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const TypingIndicator = () => (
  <span className="typing-indicator" aria-label="AI is typing">
    <span>.</span>
    <span>.</span>
    <span>.</span>
  </span>
);


const DialogueBox: React.FC<DialogueBoxProps> = ({ messages, characterName, onEditMessage, onDeleteMessage, height }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, height]);

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
    <div 
      ref={scrollRef} 
      className="bg-black bg-opacity-70 p-4 rounded-lg border-2 border-purple-400 overflow-y-auto custom-scrollbar"
      style={{ height: `${height}px` }}
    >
      {messages.map((msg) => (
        <div key={msg.id} className="group flex items-start space-x-2 my-1 pr-4">
            <div className="flex-grow">
                {msg.sender !== 'system' ? (
                    <p className="dialogue-text text-white leading-relaxed">
                    <span className={`font-bold ${getTextColor(msg.sender)}`}>{getDisplayName(msg.sender)}: </span>
                    {msg.isTyping ? <TypingIndicator /> : parseMessageText(msg.text)}
                    </p>
                ) : (
                    <p className="dialogue-text text-yellow-400 italic text-sm my-1">
                    {msg.text}
                    </p>
                )}
            </div>
            {msg.sender !== 'system' && !msg.isTyping && (
                 <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MessageActions 
                    message={msg}
                    onEdit={() => {
                        const newText = window.prompt("Edit your message:", msg.text);
                        if (newText && newText.trim() !== msg.text) {
                            onEditMessage(msg.id, newText.trim());
                        }
                    }}
                    onDelete={() => {
                        if (window.confirm("Are you sure you want to delete this message? This will roll back the conversation to this point.")) {
                            onDeleteMessage(msg.id);
                        }
                    }}
                    />
                </div>
            )}
        </div>
      ))}
    </div>
  );
};

export default DialogueBox;