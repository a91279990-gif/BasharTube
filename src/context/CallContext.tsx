import React, { createContext, useContext, useState, useEffect } from 'react';
import { CallItem, CallType, CallStatus, UserProfile } from '../types';
import { useAuth } from './AuthContext';

interface CallContextType {
  activeCall: CallItem | null;
  callDuration: number;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isFrontCamera: boolean;
  callHistory: CallItem[];
  startCall: (receiver: UserProfile, type: CallType) => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  flipCamera: () => void;
  deleteCallHistoryItem: (callId: string) => void;
  clearAllCallHistory: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [activeCall, setActiveCall] = useState<CallItem | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(true);

  const [callHistory, setCallHistory] = useState<CallItem[]>([
    {
      id: 'call_1',
      callerId: 'user_creator_tanvir',
      callerName: 'Tanvir Ahmed 🎬',
      callerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
      receiverId: 'user_superadmin',
      receiverName: 'Abdul Bashar',
      receiverAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
      type: 'video',
      status: 'ended',
      duration: 342, // 5 min 42s
      createdAt: '2026-03-02T16:20:00Z',
      endedAt: '2026-03-02T16:25:42Z'
    },
    {
      id: 'call_2',
      callerId: 'user_nusrat',
      callerName: 'Nusrat Jahan 🌸',
      callerAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop',
      receiverId: 'user_superadmin',
      receiverName: 'Abdul Bashar',
      receiverAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
      type: 'voice',
      status: 'missed',
      duration: 0,
      createdAt: '2026-03-03T09:40:00Z'
    }
  ]);

  // Call duration counter when call is accepted
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeCall && activeCall.status === 'accepted') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCall?.status]);

  const startCall = (receiver: UserProfile, type: CallType) => {
    if (!currentUser) return;
    const newCall: CallItem = {
      id: 'call_' + Date.now(),
      callerId: currentUser.id,
      callerName: currentUser.displayName,
      callerAvatar: currentUser.avatarUrl,
      receiverId: receiver.id,
      receiverName: receiver.displayName,
      receiverAvatar: receiver.avatarUrl,
      type,
      status: 'calling',
      duration: 0,
      createdAt: new Date().toISOString()
    };
    setActiveCall(newCall);
    setIsMuted(false);
    setIsVideoEnabled(type === 'video');

    // Simulate auto-accept after 3 seconds for demo experience
    setTimeout(() => {
      setActiveCall(prev => prev ? { ...prev, status: 'accepted' } : null);
    }, 2800);
  };

  const acceptCall = () => {
    if (activeCall) {
      setActiveCall({ ...activeCall, status: 'accepted' });
    }
  };

  const declineCall = () => {
    if (activeCall) {
      const ended = { ...activeCall, status: 'declined' as CallStatus, endedAt: new Date().toISOString() };
      setCallHistory(prev => [ended, ...prev]);
      setActiveCall(null);
    }
  };

  const endCall = () => {
    if (activeCall) {
      const ended = { 
        ...activeCall, 
        status: (activeCall.status === 'calling' ? 'missed' : 'ended') as CallStatus, 
        duration: callDuration,
        endedAt: new Date().toISOString() 
      };
      setCallHistory(prev => [ended, ...prev]);
      setActiveCall(null);
    }
  };

  const toggleMute = () => setIsMuted(prev => !prev);
  const toggleVideo = () => setIsVideoEnabled(prev => !prev);
  const flipCamera = () => setIsFrontCamera(prev => !prev);

  const deleteCallHistoryItem = (callId: string) => {
    setCallHistory(prev => prev.filter(c => c.id !== callId));
  };

  const clearAllCallHistory = () => {
    setCallHistory([]);
  };

  return (
    <CallContext.Provider value={{
      activeCall,
      callDuration,
      isMuted,
      isVideoEnabled,
      isFrontCamera,
      callHistory,
      startCall,
      acceptCall,
      declineCall,
      endCall,
      toggleMute,
      toggleVideo,
      flipCamera,
      deleteCallHistoryItem,
      clearAllCallHistory
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
