import React, { useState } from 'react';

interface IndicatorMeterProps {
  name: string;
  value: number;
  onUpdate: (newValue: number) => void;
}

const IndicatorMeter: React.FC<IndicatorMeterProps> = ({ name, value, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onUpdate(editValue);
    setIsEditing(false);
  };
  
  const percentage = Math.max(0, Math.min(100, value));

  return (
    <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 p-2 rounded-lg text-white w-48 shadow-lg">
      <div className="flex justify-between items-center text-sm mb-1">
        <span className="font-bold truncate" title={name}>{name}</span>
        <span 
            className="font-mono cursor-pointer hover:text-pink-400"
            onClick={() => { setEditValue(value); setIsEditing(true); }}
            aria-label={`Current value is ${value} out of 100. Click to edit.`}
        >
            {value}/100
        </span>
      </div>
      <div className="w-full bg-gray-600 rounded-full h-2.5" title={`${name}: ${value}/100`}>
        <div 
          className="bg-pink-500 h-2.5 rounded-full transition-all duration-500" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      {isEditing && (
        <div 
          className="absolute inset-0 bg-gray-900 bg-opacity-95 rounded-lg flex flex-col items-center justify-center p-2"
          role="dialog"
          aria-modal="true"
          aria-labelledby="indicator-editor-title"
        >
            <h3 id="indicator-editor-title" className="text-sm font-bold">{`Set ${name}`}</h3>
            <input 
                type="range"
                min="0"
                max="100"
                value={editValue}
                onChange={(e) => setEditValue(Number(e.target.value))}
                className="w-full my-2 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                aria-label={`Indicator value slider`}
            />
            <div className="font-bold text-lg" aria-live="polite">{editValue}</div>
            <div className="flex space-x-2 mt-2">
                <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-500 transition-colors">Cancel</button>
                <button onClick={handleSave} className="px-3 py-1 bg-pink-600 rounded hover:bg-pink-500 transition-colors">Save</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default IndicatorMeter;
