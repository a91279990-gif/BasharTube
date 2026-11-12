import React from 'react';
import { 
  Compass, 
  Flame, 
  Users, 
  MessageCircle, 
  PhoneCall, 
  ShieldCheck, 
  User, 
  Settings, 
  Home,
  Lock,
  Sparkles,
  Shield
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useVideo, FeedType } from '../../context/VideoContext';
import { useMessenger } from '../../context/MessengerContext';

interface SidebarProps {
  onOpenSettings: () => void;
  isMobileSidebarOpen: boolean;
  onCloseMobileSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenSettings,
  isMobileSidebarOpen,
  onCloseMobileSidebar
}) => {
  const { t, language } = useLanguage();
  const { currentUser, isAdminUnlocked } = useAuth();
  const { activeFeed, setActiveFeed } = useVideo();
  const { chats } = useMessenger();

  const totalUnreadMessages = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const navItems = [
    { id: 'foryou' as FeedType, label: t('forYou'), icon: Home },
    { id: 'following' as FeedType, label: t('following'), icon: Users },
    { id: 'explore' as FeedType, label: t('explore'), icon: Compass },
    { id: 'trending' as FeedType, label: t('trending'), icon: Flame, badge: 'HOT' },
    { id: 'messenger' as any, label: t('messenger'), icon: MessageCircle, count: totalUnreadMessages },
    { id: 'calls' as any, label: t('callHistory'), icon: PhoneCall },
    { id: 'profile' as FeedType, label: t('profile'), icon: User },
  ];

  const handleNavClick = (id: string) => {
    setActiveFeed(id as FeedType);
    onCloseMobileSidebar();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={onCloseMobileSidebar}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-[57px] h-screen lg:h-[calc(100vh-57px)] w-64 bg-[#09090b] border-r border-zinc-800/80 z-50 flex flex-col justify-between p-3.5 transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Navigation list */}
        <div className="space-y-1 overflow-y-auto pr-1 select-none font-['Hind_Siliguri']">
          <div className="px-3 py-1.5 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            {language === 'bn' ? 'মেনু ও নেভিগেশন' : 'Feeds & Channels'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeFeed === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 to-transparent text-cyan-400 border-l-4 border-cyan-400 font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-pink-500/20 text-pink-400 border border-pink-500/30 animate-pulse">
                    {item.badge}
                  </span>
                )}
                {item.count !== undefined && item.count > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500 text-black">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Dedicated Protected Admin Panel with Security Lock */}
          <button
            onClick={() => handleNavClick('admin')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              activeFeed === ('admin' as any)
                ? 'bg-gradient-to-r from-pink-500/20 to-transparent text-pink-400 border-l-4 border-pink-400 font-semibold shadow-inner'
                : 'text-pink-400/90 hover:text-pink-300 hover:bg-pink-950/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-pink-400" />
              <span>{t('adminPanel')}</span>
            </div>
            {isAdminUnlocked ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                UNLOCKED
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-bold border border-zinc-700">
                <Lock className="w-2.5 h-2.5" />
                <span>ভল্ট</span>
              </span>
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <Settings className="w-4 h-4 text-zinc-400" />
            <span>{t('settings')}</span>
          </button>
        </div>

        {/* Clean, Executive Platform Footer (NO Demo Switchers) */}
        <div className="mt-4 p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-md font-['Hind_Siliguri']">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
              BasharTube Secure
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight">
            বাংলাদেশের সোশ্যাল ভিডিও প্ল্যাটফর্ম। পূর্ণ সুরক্ষা ও ক্রিয়েটর ক্ষমতায়ন।
          </p>
        </div>
      </aside>
    </>
  );
};
