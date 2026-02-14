import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';

interface WhiteboardProps {
  isShared?: boolean;
}

export default function Whiteboard({ isShared = false }: WhiteboardProps) {
  return (
    <div className="flex flex-col h-[500px]">
      {isShared && (
        <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium self-end mb-2">
          🔗 Shared with attendees
        </div>
      )}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-gray-200">
        <Tldraw />
      </div>
    </div>
  );
}
