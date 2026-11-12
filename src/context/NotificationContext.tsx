import React, { createContext, useContext, useState } from 'react';
import { NotificationItem, NotificationType } from '../types';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  addNotification: (item: Omit<NotificationItem, 'id' | 'isRead' | 'createdAt'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif_1',
      userId: 'user_superadmin',
      actorId: 'user_creator_tanvir',
      actorName: 'Tanvir Ahmed 🎬',
      actorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
      type: 'creator_heart',
      title: 'ক্রিয়েটর হার্ট দিয়েছেন',
      message: 'তানভীর আহমেদ আপনার মন্তব্যে হার্ট দিয়েছেন: "অসাধারণ সিনেমাটোগ্রাফি তানভীর ভাই..."',
      isRead: false,
      createdAt: '2026-03-01T15:10:00Z'
    },
    {
      id: 'notif_2',
      userId: 'user_superadmin',
      actorId: 'user_nusrat',
      actorName: 'Nusrat Jahan 🌸',
      actorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop',
      type: 'reaction',
      title: 'নতুন কমেন্ট রিঅ্যাকশন',
      message: 'নুসরাত জাহান আপনার মন্তব্যে "Love" রিঅ্যাক্ট করেছেন।',
      isRead: false,
      createdAt: '2026-03-01T16:00:00Z'
    },
    {
      id: 'notif_3',
      userId: 'user_superadmin',
      actorId: 'user_creator_tanvir',
      actorName: 'Tanvir Ahmed 🎬',
      actorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
      type: 'follow',
      title: 'নতুন অনুসারী',
      message: 'তানভীর আহমেদ আপনাকে ফলো করা শুরু করেছেন।',
      isRead: true,
      createdAt: '2026-02-28T12:00:00Z'
    }
  ]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const addNotification = (item: Omit<NotificationItem, 'id' | 'isRead' | 'createdAt'>) => {
    const newNotif: NotificationItem = {
      ...item,
      id: 'notif_' + Date.now(),
      isRead: false,
      createdAt: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev]);

    // Play subtle audio if enabled
    if (soundEnabled) {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.4;
        audio.play().catch(() => {});
      } catch {}
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      soundEnabled,
      setSoundEnabled,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
      addNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
