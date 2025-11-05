import { useState, useRef } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';

interface WhiteboardProps {
  isShared?: boolean;
}

export default function Whiteboard({ isShared = false }: WhiteboardProps) {
  const canvasRef = useRef<any>(null);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  const handleClear = () => {
    canvasRef.current?.clearCanvas();
  };

  const handleUndo = () => {
    canvasRef.current?.undo();
  };

  const handleRedo = () => {
    canvasRef.current?.redo();
  };

  const colors = [
    '#000000',
    '#FF0000',
    '#00FF00',
    '#0000FF',
    '#FFFF00',
    '#FF00FF',
    '#00FFFF',
    '#FFFFFF',
  ];

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex items-center gap-5 p-3 bg-gray-100 rounded-t-lg border-b border-gray-300 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTool('pen')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tool === 'pen'
                ? 'bg-purple-500 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            ✏️ Pen
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tool === 'eraser'
                ? 'bg-purple-500 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            🧹 Eraser
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-medium text-gray-700 text-sm">Color:</label>
          <div className="flex gap-2">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setStrokeColor(color)}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${
                  strokeColor === color ? 'border-gray-800 scale-110' : 'border-transparent'
                } hover:scale-110`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-medium text-gray-700 text-sm">Width:</label>
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-gray-700">{strokeWidth}px</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ↶ Undo
          </button>
          <button
            onClick={handleRedo}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ↷ Redo
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            🗑️ Clear
          </button>
        </div>

        {isShared && (
          <div className="ml-auto px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            🔗 Shared with attendees
          </div>
        )}
      </div>

      <div className="flex-1 bg-white rounded-b-lg overflow-hidden">
        <ReactSketchCanvas
          ref={canvasRef}
          width="100%"
          height="100%"
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          canvasColor="#FFFFFF"
          eraserWidth={strokeWidth * 2}
          allowOnlyPointerType="all"
          style={{ border: '1px solid #ccc', borderRadius: '4px' }}
        />
      </div>
    </div>
  );
}

