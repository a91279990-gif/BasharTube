import React, { createContext, useContext, useState, useEffect } from 'react';
import { ChatItem, MessageItem, UserProfile } from '../types';
import { useAuth } from './AuthContext';

interface MessengerContextType {
  chats: ChatItem[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  activeChat: ChatItem | null;
  messagesForActiveChat: MessageItem[];
  isOnline: boolean;
  sendMessage: (text: string, options?: {
    messageType?: 'text' | 'image' | 'video' | 'voice' | 'file';
    mediaUrl?: string;
    fileName?: string;
    fileSize?: string;
  }) => Promise<void>;
  editMessage: (messageId: string, newText: string) => void;
  deleteMessageForMe: (messageId: string) => void;
  deleteMessageForEveryone: (messageId: string) => void;
  togglePinChat: (chatId: string) => void;
  setChatWallpaper: (chatId: string, wallpaperUrl: string) => void;
  startChatWithUser: (user: UserProfile) => string;
  isRecipientTyping: boolean;
  setIsUserTyping: (typing: boolean) => void;
  pendingQueueCount: number;
}

const MessengerContext = createContext<MessengerContextType | undefined>(undefined);

export const MessengerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, preferences } = useAuth();
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const [isRecipientTyping, setIsRecipientTyping] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Load chats from localStorage
  const [chats, setChats] = useState<ChatItem[]>(() => {
    try {
      const saved = localStorage.getItem('bashartube_messenger_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load messages from localStorage
  const [messages, setMessages] = useState<Record<string, MessageItem[]>>(() => {
    try {
      const saved = localStorage.getItem('bashartube_messenger_messages');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Offline Pending Message Queue (Item 21)
  const [pendingQueue, setPendingQueue] = useState<MessageItem[]>(() => {
    try {
      const saved = localStorage.getItem('bashartube_pending_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveChats = (newChats: ChatItem[]) => {
    setChats(newChats);
    try {
      localStorage.setItem('bashartube_messenger_chats', JSON.stringify(newChats));
    } catch {}
  };

  const saveMessages = (newMessages: Record<string, MessageItem[]>) => {
    setMessages(newMessages);
    try {
      localStorage.setItem('bashartube_messenger_messages', JSON.stringify(newMessages));
    } catch {}
  };

  const savePendingQueue = (queue: MessageItem[]) => {
    setPendingQueue(queue);
    try {
      localStorage.setItem('bashartube_pending_messages', JSON.stringify(queue));
    } catch {}
  };

  // Monitor Network Online / Offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Process pending offline messages automatically (Item 21)
      flushPendingQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingQueue, messages, chats]);

  // Flush offline pending queue when back online
  const flushPendingQueue = () => {
    if (pendingQueue.length === 0) return;

    setMessages(prev => {
      const next = { ...prev };
      pendingQueue.forEach(msg => {
        const chatMsgs = next[msg.chatId] || [];
        next[msg.chatId] = chatMsgs.map(m => 
          m.id === msg.id ? { ...m, status: 'sent' as const, isOfflineQueued: false } : m
        );
      });
      try { localStorage.setItem('bashartube_messenger_messages', JSON.stringify(next)); } catch {}
      return next;
    });

    // Clear pending queue
    savePendingQueue([]);
  };

  // Set active chat and reset unread counter (Item 20)
  const setActiveChatId = (id: string | null) => {
    setActiveChatIdState(id);
    if (!id) return;

    // Reset unread count for this chat
    setChats(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c);
      try { localStorage.setItem('bashartube_messenger_chats', JSON.stringify(updated)); } catch {}
      return updated;
    });

    // If seen status is enabled, mark received messages as 'seen' (Item 13)
    if (preferences.seenStatusEnabled !== false && currentUser) {
      setMessages(prev => {
        const list = prev[id] || [];
        let hasChanges = false;
        const nextList = list.map(m => {
          if (m.recipientId === currentUser.id && m.status !== 'seen') {
            hasChanges = true;
            return { ...m, status: 'seen' as const };
          }
          return m;
        });

        if (hasChanges) {
          const updated = { ...prev, [id]: nextList };
          try { localStorage.setItem('bashartube_messenger_messages', JSON.stringify(updated)); } catch {}
          return updated;
        }
        return prev;
      });
    }
  };

  const activeChat = chats.find(c => c.id === activeChatId) || null;
  const messagesForActiveChat = activeChatId ? (messages[activeChatId] || []) : [];

  const startChatWithUser = (user: UserProfile): string => {
    if (!currentUser) return '';
    const existing = chats.find(c => 
      (c.userAId === currentUser.id && c.userBId === user.id) ||
      (c.userBId === currentUser.id && c.userAId === user.id)
    );
    if (existing) {
      setActiveChatId(existing.id);
      return existing.id;
    }

    const newChatId = 'chat_' + Date.now();
    const newChat: ChatItem = {
      id: newChatId,
      userAId: currentUser.id,
      userBId: user.id,
      otherUser: user,
      lastMessageText: 'চ্যাট শুরু হয়েছে',
      lastMessageSenderId: currentUser.id,
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      isPinned: false,
      wallpaper: 'linear-gradient(135deg, #09090b 0%, #151922 100%)',
      updatedAt: new Date().toISOString()
    };

    saveChats([newChat, ...chats]);
    setActiveChatId(newChatId);
    return newChatId;
  };

  const sendMessage = async (
    text: string, 
    options?: {
      messageType?: 'text' | 'image' | 'video' | 'voice' | 'file';
      mediaUrl?: string;
      fileName?: string;
      fileSize?: string;
    }
  ) => {
    if (!currentUser || !activeChatId || (!text.trim() && !options?.mediaUrl)) return;

    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;

    const recipientId = chat.userAId === currentUser.id ? chat.userBId : chat.userAId;
    const currentOnline = typeof navigator !== 'undefined' ? navigator.onLine : isOnline;

    const newMsg: MessageItem = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      chatId: activeChatId,
      senderId: currentUser.id,
      recipientId,
      text: text.trim(),
      messageType: options?.messageType || 'text',
      mediaUrl: options?.mediaUrl,
      fileName: options?.fileName,
      fileSize: options?.fileSize,
      status: currentOnline ? 'sent' : 'pending', // Item 21: Pending when offline
      isOfflineQueued: !currentOnline,
      isEdited: false,
      createdAt: new Date().toISOString()
    };

    // If offline, queue it locally
    if (!currentOnline) {
      savePendingQueue([...pendingQueue, newMsg]);
    }

    const currentChatMsgs = messages[activeChatId] || [];
    const updatedMsgs = {
      ...messages,
      [activeChatId]: [...currentChatMsgs, newMsg]
    };
    saveMessages(updatedMsgs);

    // Update last message in chat
    const updatedChats = chats.map(c => {
      if (c.id === activeChatId) {
        return {
          ...c,
          lastMessageText: options?.mediaUrl ? `[${options.messageType || 'মিডিয়া'}] ${options.fileName || ''}` : text.trim(),
          lastMessageSenderId: currentUser.id,
          lastMessageAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });
    saveChats(updatedChats);

    // If online, simulate recipient delivery and seen transition
    if (currentOnline) {
      setTimeout(() => {
        setMessages(prev => {
          const list = prev[activeChatId] || [];
          const nextList = list.map(m => m.id === newMsg.id ? { ...m, status: 'delivered' as const } : m);
          const updated = { ...prev, [activeChatId]: nextList };
          try { localStorage.setItem('bashartube_messenger_messages', JSON.stringify(updated)); } catch {}
          return updated;
        });

        // If recipient has Seen Status enabled, mark as 'seen'
        if (preferences.seenStatusEnabled !== false) {
          setTimeout(() => {
            setMessages(prev => {
              const list = prev[activeChatId] || [];
              const nextList = list.map(m => m.id === newMsg.id ? { ...m, status: 'seen' as const } : m);
              const updated = { ...prev, [activeChatId]: nextList };
              try { localStorage.setItem('bashartube_messenger_messages', JSON.stringify(updated)); } catch {}
              return updated;
            });
          }, 1200);
        }
      }, 800);
    }
  };

  const editMessage = (messageId: string, newText: string) => {
    if (!activeChatId || !newText.trim()) return;
    const currentList = messages[activeChatId] || [];
    const updatedList = currentList.map(m => {
      if (m.id === messageId) {
        return {
          ...m,
          text: newText.trim(),
          isEdited: true,
          editedAt: new Date().toISOString()
        };
      }
      return m;
    });
    saveMessages({ ...messages, [activeChatId]: updatedList });
  };

  const deleteMessageForMe = (messageId: string) => {
    if (!activeChatId || !currentUser) return;
    const currentList = messages[activeChatId] || [];
    const updatedList = currentList.map(m => {
      if (m.id === messageId) {
        const deletedFor = m.deletedForUserIds || [];
        return {
          ...m,
          deletedForUserIds: [...deletedFor, currentUser.id]
        };
      }
      return m;
    });
    saveMessages({ ...messages, [activeChatId]: updatedList });
  };

  const deleteMessageForEveryone = (messageId: string) => {
    if (!activeChatId) return;
    const currentList = messages[activeChatId] || [];
    const updatedList = currentList.map(m => {
      if (m.id === messageId) {
        return {
          ...m,
          isDeletedForEveryone: true,
          text: 'এই বার্তাটি মুছে ফেলা হয়েছে'
        };
      }
      return m;
    });
    saveMessages({ ...messages, [activeChatId]: updatedList });
  };

  const togglePinChat = (chatId: string) => {
    const updated = chats.map(c => c.id === chatId ? { ...c, isPinned: !c.isPinned } : c);
    saveChats(updated);
  };

  const setChatWallpaper = (chatId: string, wallpaperUrl: string) => {
    const updated = chats.map(c => c.id === chatId ? { ...c, wallpaper: wallpaperUrl } : c);
    saveChats(updated);
  };

  const setIsUserTyping = (typing: boolean) => {
    // When user types, simulate active recipient typing response
    if (typing) {
      setIsRecipientTyping(true);
      setTimeout(() => setIsRecipientTyping(false), 2500);
    }
  };

  return (
    <MessengerContext.Provider value={{
      chats,
      activeChatId,
      setActiveChatId,
      activeChat,
      messagesForActiveChat,
      isOnline,
      sendMessage,
      editMessage,
      deleteMessageForMe,
      deleteMessageForEveryone,
      togglePinChat,
      setChatWallpaper,
      startChatWithUser,
      isRecipientTyping,
      setIsUserTyping,
      pendingQueueCount: pendingQueue.length
    }}>
      {children}
    </MessengerContext.Provider>
  );
};

export const useMessenger = () => {
  const context = useContext(MessengerContext);
  if (!context) {
    throw new Error('useMessenger must be used within a MessengerProvider');
  }
  return context;
};
