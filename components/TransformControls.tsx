import React from 'react';

interface TransformControlsProps {
  transform: { x: number; y: number; scale: number; };
  setTransform: React.Dispatch<React.SetStateAction<{ x: number; y: number; scale: number; }>>;
  onSave: () => void;
  onCancel: () => void;
}

const ControlButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string, title: string }> = ({ onClick, children, className, title }) => (
  <button
    onClick={onClick}
    title={title}
    className={`bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full w-10 h-10 flex items-center justify-center transition-transform transform hover:scale-110 ${className}`}
  >
    {children}
  </button>
);

const TransformControls: React.FC<TransformControlsProps> = ({ transform, setTransform, onSave, onCancel }) => {
  const MOVE_STEP = 5; // 5%
  const SCALE_STEP = 0.1; // 10%

  const handleMove = (dx: number, dy: number) => {
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  };

  const handleScale = (dScale: number) => {
    setTransform(prev => ({ ...prev, scale: Math.max(0.1, prev.scale + dScale) }));
  };
  
  const handleReset = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex justify-center items-center z-30 p-4">
      <div className="bg-gray-800 border-2 border-pink-500 rounded-lg p-4 shadow-2xl text-white flex flex-col items-center gap-4">
        <h3 className="text-lg font-bold">Adjust Position & Scale</h3>
        <div className="flex items-center gap-8">
          {/* Movement Controls */}
          <div className="grid grid-cols-3 grid-rows-3 gap-2 w-36 h-36">
            <div className="col-start-2">
              <ControlButton onClick={() => handleMove(0, -MOVE_STEP)} title="Move Up">↑</ControlButton>
            </div>
            <div>
              <ControlButton onClick={() => handleMove(-MOVE_STEP, 0)} title="Move Left">←</ControlButton>
            </div>
            <div className="flex items-center justify-center">
                 <button onClick={handleReset} title="Reset Position & Scale" className="bg-gray-600 hover:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-xs">
                    RST
                 </button>
            </div>
            <div>
              <ControlButton onClick={() => handleMove(MOVE_STEP, 0)} title="Move Right">→</ControlButton>
            </div>
            <div className="col-start-2">
              <ControlButton onClick={() => handleMove(0, MOVE_STEP)} title="Move Down">↓</ControlButton>
            </div>
          </div>
          {/* Zoom Controls */}
          <div className="flex flex-col gap-2">
            <ControlButton onClick={() => handleScale(SCALE_STEP)} title="Zoom In">+</ControlButton>
            <span className="text-center font-mono">{transform.scale.toFixed(1)}x</span>
            <ControlButton onClick={() => handleScale(-SCALE_STEP)} title="Zoom Out">-</ControlButton>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={onSave} className="px-6 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
};

export default TransformControls;
