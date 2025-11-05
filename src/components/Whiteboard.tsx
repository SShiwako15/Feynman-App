import { useState, useRef } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import '../styles/Whiteboard.css';

interface WhiteboardProps {
  isShared?: boolean;
}

export default function Whiteboard({ isShared = false }: WhiteboardProps) {
  const canvasRef = useRef<ReactSketchCanvas>(null);
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
    <div className="whiteboard-container">
      <div className="whiteboard-toolbar">
        <div className="toolbar-section">
          <button
            onClick={() => setTool('pen')}
            className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
          >
            ✏️ Pen
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
          >
            🧹 Eraser
          </button>
        </div>

        <div className="toolbar-section">
          <label>Color:</label>
          <div className="color-picker">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setStrokeColor(color)}
                className={`color-btn ${strokeColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        <div className="toolbar-section">
          <label>Width:</label>
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="width-slider"
          />
          <span>{strokeWidth}px</span>
        </div>

        <div className="toolbar-section">
          <button onClick={handleUndo} className="tool-btn">
            ↶ Undo
          </button>
          <button onClick={handleRedo} className="tool-btn">
            ↷ Redo
          </button>
          <button onClick={handleClear} className="tool-btn clear-btn">
            🗑️ Clear
          </button>
        </div>

        {isShared && (
          <div className="shared-indicator">
            <span>🔗 Shared with attendees</span>
          </div>
        )}
      </div>

      <div className="whiteboard-canvas-wrapper">
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

