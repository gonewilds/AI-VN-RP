import React from 'react';

interface IndicatorMeterProps {
  name: string;
  value: number;
}

const IndicatorMeter: React.FC<IndicatorMeterProps> = ({ name, value }) => {
  const percentage = Math.max(0, Math.min(100, value));

  return (
    <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 p-2 rounded-lg text-white w-48 shadow-lg">
      <div className="flex justify-between items-center text-sm mb-1">
        <span className="font-bold truncate" title={name}>{name}</span>
        <span 
            className="font-mono"
            aria-label={`Current value is ${value} out of 100.`}
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
    </div>
  );
};

export default IndicatorMeter;