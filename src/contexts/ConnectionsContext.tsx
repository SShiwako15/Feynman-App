import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { RemoteUser } from '../services/userService';
import { searchUsersApi } from '../services/userService';
import {
  sendConnectionRequest as sendRequest,
  getConnectionRequests,
  acceptConnectionRequest as acceptRequest,
  rejectConnectionRequest as rejectRequest,
  cancelConnectionRequest as cancelRequest,
  getAcceptedConnections,
  removeConnection as removeConnectionApi,
  type ConnectionRequest,
} from '../services/connectionService';
import { useAuth } from './AuthContext';

export type Connection = RemoteUser;

interface ConnectionsContextType {
  connections: Connection[];
  pendingRequestsReceived: ConnectionRequest[];
  pendingRequestsSent: ConnectionRequest[];
  sendConnectionRequest: (toUserId: string) => Promise<boolean>;
  acceptRequest: (requestId: string) => Promise<boolean>;
  rejectRequest: (requestId: string) => Promise<boolean>;
  cancelRequest: (requestId: string) => Promise<boolean>;
  removeConnection: (id: string) => Promise<boolean>;
  searchUsers: (query: string) => Promise<Connection[]>;
  loadConnections: () => Promise<void>;
  loadRequests: () => Promise<void>;
  isLoading: boolean;
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined);

export const ConnectionsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingRequestsReceived, setPendingRequestsReceived] = useState<ConnectionRequest[]>([]);
  const [pendingRequestsSent, setPendingRequestsSent] = useState<ConnectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadConnections = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const acceptedConnections = await getAcceptedConnections(user.id);
      // Map ConnectionType to Connection (RemoteUser)
      const mappedConnections: Connection[] = acceptedConnections.map((conn) => ({
        id: conn.id,
        name: conn.name,
        email: conn.email,
        subject: conn.subject,
        avatar: conn.avatar,
      }));
      setConnections(mappedConnections);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRequests = async () => {
    if (!user?.id) return;

    try {
      const allRequests = await getConnectionRequests(user.id, 'all');
      const received = allRequests.filter(
        (req) => req.toUserId === user.id && req.status === 'pending'
      );
      const sent = allRequests.filter(
        (req) => req.fromUserId === user.id && req.status === 'pending'
      );
      setPendingRequestsReceived(received);
      setPendingRequestsSent(sent);
    } catch (error) {
      console.error('Failed to load connection requests:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadConnections();
      loadRequests();
    }
  }, [user?.id]);

  const sendConnectionRequest = async (toUserId: string): Promise<boolean> => {
    if (!user?.id || !user?.name) {
      return false;
    }

    try {
      const request = await sendRequest(toUserId, user.id, user.name, user.avatar);
      if (request) {
        await loadRequests();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to send connection request:', error);
      return false;
    }
  };

  const acceptRequestHandler = async (requestId: string): Promise<boolean> => {
    try {
      const success = await acceptRequest(requestId);
      if (success) {
        await loadConnections();
        await loadRequests();
      }
      return success;
    } catch (error) {
      console.error('Failed to accept connection request:', error);
      return false;
    }
  };

  const rejectRequestHandler = async (requestId: string): Promise<boolean> => {
    try {
      const success = await rejectRequest(requestId);
      if (success) {
        await loadRequests();
      }
      return success;
    } catch (error) {
      console.error('Failed to reject connection request:', error);
      return false;
    }
  };

  const cancelRequestHandler = async (requestId: string): Promise<boolean> => {
    try {
      const success = await cancelRequest(requestId);
      if (success) {
        await loadRequests();
      }
      return success;
    } catch (error) {
      console.error('Failed to cancel connection request:', error);
      return false;
    }
  };

  const removeConnectionHandler = async (connectionId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await removeConnectionApi(user.id, connectionId);
      if (success) {
        await loadConnections();
      }
      return success;
    } catch (error) {
      console.error('Failed to remove connection:', error);
      return false;
    }
  };

  const searchUsers = async (query: string): Promise<Connection[]> => {
    if (!query.trim()) return [];
    const users = await searchUsersApi(query);
    return users;
  };

  return (
    <ConnectionsContext.Provider
      value={{
        connections,
        pendingRequestsReceived,
        pendingRequestsSent,
        sendConnectionRequest,
        acceptRequest: acceptRequestHandler,
        rejectRequest: rejectRequestHandler,
        cancelRequest: cancelRequestHandler,
        removeConnection: removeConnectionHandler,
        searchUsers,
        loadConnections,
        loadRequests,
        isLoading,
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
