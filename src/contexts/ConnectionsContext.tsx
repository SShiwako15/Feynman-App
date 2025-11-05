import { createContext, useContext, useState, ReactNode } from 'react';

interface Connection {
  id: string;
  name: string;
  email: string;
  subject?: string;
  avatar?: string;
}

interface ConnectionsContextType {
  connections: Connection[];
  addConnection: (connection: Connection) => void;
  removeConnection: (id: string) => void;
  searchUsers: (query: string) => Connection[];
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined);

// Mock users database - replace with actual API
const mockUsers: Connection[] = [
  { id: '2', name: 'Alice Johnson', email: 'alice@example.com', subject: 'Physics' },
  { id: '3', name: 'Bob Smith', email: 'bob@example.com', subject: 'Chemistry' },
  { id: '4', name: 'Carol White', email: 'carol@example.com', subject: 'Biology' },
  { id: '5', name: 'David Brown', email: 'david@example.com', subject: 'Mathematics' },
];

export const ConnectionsProvider = ({ children }: { children: ReactNode }) => {
  const [connections, setConnections] = useState<Connection[]>(() => {
    const saved = localStorage.getItem('connections');
    return saved ? JSON.parse(saved) : [];
  });

  const addConnection = (connection: Connection) => {
    setConnections((prev) => {
      if (prev.find((c) => c.id === connection.id)) return prev;
      const updated = [...prev, connection];
      localStorage.setItem('connections', JSON.stringify(updated));
      return updated;
    });
  };

  const removeConnection = (id: string) => {
    setConnections((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      localStorage.setItem('connections', JSON.stringify(updated));
      return updated;
    });
  };

  const searchUsers = (query: string): Connection[] => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return mockUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery) ||
        user.subject?.toLowerCase().includes(lowerQuery)
    );
  };

  return (
    <ConnectionsContext.Provider
      value={{
        connections,
        addConnection,
        removeConnection,
        searchUsers,
      }}
    >
      {children}
    </ConnectionsContext.Provider>
  );
};

export const useConnections = () => {
  const context = useContext(ConnectionsContext);
  if (context === undefined) {
    throw new Error('useConnections must be used within a ConnectionsProvider');
  }
  return context;
};

