import React, { useState } from 'react';
import { 
  Bell, 
  Heart, 
  MessageCircle, 
  CornerDownRight, 
  Smile, 
  UserPlus, 
  PhoneMissed, 
  Trash2, 
  CheckCheck, 
  Volume2, 
  VolumeX, 
  Sparkles 
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { NotificationItem, NotificationType } from '../../types';

interface NotificationsViewProps {
  onSelectVideo?: (videoId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onSelectVideo }) => {
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAllNotifications, 
    soundEnabled, 
    setSoundEnabled 
  } = useNotification();
  const { t, language } = useLanguage();

  const [activeFilter, setActiveFilter] = useState<'all' | 'comments' | 'reactions' | 'calls'>('all');

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'comments') return n.type === 'comment' || n.type === 'reply';
    if (activeFilter === 'reactions') return n.type === 'reaction' || n.type === 'creator_heart' || n.type === 'like';
    if (activeFilter === 'calls') return n.type === 'call_missed';
    return true;
  });

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'creator_heart':
        return <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />;
      case 'reaction':
      case 'like':
        return <Smile className="w-4 h-4 text-amber-400" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-cyan-400" />;
      case 'reply':
        return <CornerDownRight className="w-4 h-4 text-cyan-300" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'call_missed':
        return <PhoneMissed className="w-4 h-4 text-rose-500" />;
      default:
        return <Bell className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 w-full animate-in fade-in pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
              {t('notifications')}
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400">
              {notifications.filter(n => !n.isRead).length} New
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {language === 'bn' ? 'আপনার পোস্ট, কমেন্ট ও অ্যাকাউন্টের সাম্প্রতিক আপডেট' : 'Real-time activity alerts across BasharTube'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound alert toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
            title={soundEnabled ? 'Alert Sound On' : 'Alert Sound Off'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-zinc-600" />}
          </button>

          <button
            onClick={markAllAsRead}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Mark All Read</span>
          </button>

          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-rose-400 transition"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 pb-4 mb-4 border-b border-zinc-800/80">
        {[
          { id: 'all', label: 'All' },
          { id: 'comments', label: 'Comments & Replies' },
          { id: 'reactions', label: 'Reactions & Hearts' },
          { id: 'calls', label: 'Calls' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              activeFilter === f.id
                ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Stream List */}
      {filteredNotifications.length === 0 ? (
        <div className="py-20 text-center text-zinc-500 text-xs">
          <Bell className="w-10 h-10 mx-auto text-zinc-600 mb-2 opacity-50" />
          <p>{language === 'bn' ? 'কোনো নতুন নোটিফিকেশন নেই।' : 'No notifications in this filter.'}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              className={`p-3.5 rounded-2xl border transition flex items-start justify-between gap-3 cursor-pointer ${
                notif.isRead
                  ? 'bg-zinc-900/40 border-zinc-800/60 opacity-80'
                  : 'bg-zinc-900/80 border-cyan-500/30 ring-1 ring-cyan-500/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <img
                    src={notif.actorAvatar}
                    alt={notif.actorName}
                    className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                  />
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-zinc-900 border border-zinc-700 shadow">
                    {getIcon(notif.type)}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                    {notif.title}
                  </h4>
                  <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                    {notif.message}
                  </p>
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notif.id);
                }}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
