import React, { useState } from 'react';
import { 
  Search, 
  Upload, 
  Bell, 
  Globe, 
  ShieldCheck, 
  User, 
  LogOut, 
  Settings, 
  CheckCircle,
  Menu,
  X,
  Sparkles,
  Play,
  Tv
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useVideo } from '../../context/VideoContext';
import { DEFAULT_PLATFORM_SETTINGS } from '../../data/mockData';

interface HeaderProps {
  onOpenUpload: () => void;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  onOpenAiStudio: () => void;
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUpload,
  onOpenAuth,
  onOpenSettings,
  onOpenAiStudio,
  onToggleMobileSidebar,
  isMobileSidebarOpen,
}) => {
  const { language, toggleLanguage, t } = useLanguage();
  const { currentUser, isSuperAdmin, logout } = useAuth();
  const { unreadCount } = useNotification();
  const { activeFeed, setActiveFeed } = useVideo();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveFeed('explore');
      setShowSearchDropdown(false);
    }
  };

  const handleSelectTrendingTag = (tag: string) => {
    setSearchQuery(tag);
    setActiveFeed('explore');
    setShowSearchDropdown(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full max-w-full bg-[#09090b]/95 backdrop-blur-md border-b border-zinc-800/80 px-2.5 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
      {/* Left: Mobile hamburger & Logo */}
      <div className="flex items-center gap-1 sm:gap-3 min-w-0">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1.5 sm:p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-xl transition shrink-0"
          aria-label="Toggle Navigation"
        >
          {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div 
          onClick={() => setActiveFeed('foryou')}
          className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group select-none min-w-0"
        >
          {/* Logo icon with Cyan and Pink accents */}
          <div className="relative w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-pink-500 p-[2px] shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
            <div className="w-full h-full bg-[#09090b] rounded-[10px] flex items-center justify-center">
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 fill-cyan-400 ml-0.5" />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[15px] sm:text-xl font-extrabold tracking-tight text-white font-['Plus_Jakarta_Sans'] whitespace-nowrap">
                Bashar<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">Tube</span>
              </span>
            </div>
            <span className="text-[10px] font-medium text-zinc-400 hidden sm:block -mt-1 font-['Hind_Siliguri']">
              {language === 'bn' ? 'বাংলাদেশি সোশ্যাল ভিডিও প্ল্যাটফর্ম' : 'Bangladesh Social Video Platform'}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Search bar with trending suggestions */}
      <div className="relative flex-1 max-w-md hidden md:block">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearchDropdown(true)}
            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 250)}
            placeholder={t('search')}
            className="w-full bg-zinc-900/90 text-sm text-zinc-200 pl-10 pr-4 py-2 rounded-full border border-zinc-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition placeholder:text-zinc-500"
          />
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5" />
        </form>

        {showSearchDropdown && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mb-2 px-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'bn' ? 'ট্রেন্ডিং অনুসন্ধান' : 'Trending Searches'}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_PLATFORM_SETTINGS.trendingSearchTerms.map((term) => (
                <button
                  key={term}
                  type="button"
                  onMouseDown={() => handleSelectTrendingTag(term)}
                  className="px-3 py-1 text-xs rounded-full bg-zinc-800/80 hover:bg-cyan-500/20 hover:text-cyan-400 text-zinc-300 border border-zinc-700/50 transition"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
        {/* Language switcher */}
        <button
          onClick={toggleLanguage}
          title={t('language')}
          aria-label={t('language')}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 min-h-[36px] sm:min-h-[38px] text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition whitespace-nowrap shrink-0"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">{language === 'bn' ? 'বাংলা' : 'EN'}</span>
        </button>

        {/* BasharTube AI Studio button */}
        <button
          type="button"
          onClick={onOpenAiStudio}
          title="BasharTube AI"
          aria-label="Open BasharTube AI Studio"
          className="flex items-center gap-1.5 px-2 sm:px-3 min-h-[36px] sm:min-h-[38px] text-xs font-bold rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-cyan-500/40 text-cyan-400 transition whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">BasharTube AI</span>
        </button>

        {/* Upload Button */}
        <button
          type="button"
          onClick={onOpenUpload}
          aria-label={t('upload')}
          className="flex items-center gap-1.5 px-2 sm:px-3 min-h-[36px] sm:min-h-[38px] text-xs font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-black hover:brightness-110 active:scale-95 transition shadow-lg shadow-cyan-500/25 whitespace-nowrap shrink-0"
        >
          <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">{t('upload')}</span>
        </button>

        {/* Notifications */}
        <button
          onClick={() => setActiveFeed('profile')}
          title={t('notifications')}
          aria-label={t('notifications')}
          className="relative p-1.5 sm:p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition"
        >
          <Bell className="w-4 h-4 text-zinc-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-pink-500 text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Account / Avatar / Dropdown */}
        {currentUser ? (
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              aria-label="User menu"
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/50 transition"
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-xl object-cover ring-2 ring-cyan-500/40"
              />
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-white leading-tight flex items-center gap-1 max-w-[140px] truncate">
                  <span className="truncate">{currentUser.channelName || currentUser.displayName}</span>
                  {currentUser.isVerified && (
                    <CheckCircle className="w-3 h-3 text-cyan-400 fill-cyan-400 shrink-0" />
                  )}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {currentUser.handle || `@${currentUser.username}`}
                </span>
              </div>
            </button>

            {showUserDropdown && (
              <div 
                className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in font-['Hind_Siliguri']"
                onMouseLeave={() => setShowUserDropdown(false)}
              >
                <div className="px-3 py-2 border-b border-zinc-800/80 mb-1">
                  <p className="text-xs font-bold text-white flex items-center gap-1">
                    <span className="truncate">{currentUser.channelName || currentUser.displayName}</span>
                    {currentUser.isVerified && <CheckCircle className="w-3 h-3 text-cyan-400 fill-cyan-400 shrink-0" />}
                  </p>
                  <p className="text-[11px] text-cyan-400 font-mono">
                    {currentUser.handle || `@${currentUser.username}`}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono truncate">{currentUser.email}</p>
                </div>

                <button
                  onClick={() => { setActiveFeed('profile'); setShowUserDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-xl transition"
                >
                  <Tv className="w-4 h-4 text-cyan-400" />
                  <span>আমার চ্যানেল ও প্রোফাইল</span>
                </button>

                <button
                  onClick={() => { setActiveFeed(('admin' as any)); setShowUserDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-pink-400 hover:bg-pink-500/10 rounded-xl transition font-medium"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>অ্যাডমিন টার্মিনাল (ভল্ট)</span>
                </button>

                <button
                  onClick={() => { onOpenSettings(); setShowUserDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-xl transition"
                >
                  <Settings className="w-4 h-4 text-zinc-400" />
                  <span>{t('settings')}</span>
                </button>

                <div className="border-t border-zinc-800/80 pt-1 mt-1">
                  <button
                    onClick={() => { logout(); setShowUserDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>লগআউট (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* When NOT logged in: High-end Login / Sign Up Button */
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-cyan-400 text-white hover:brightness-110 active:scale-95 transition shadow-lg shadow-pink-500/25"
          >
            <User className="w-3.5 h-3.5" />
            <span className="sm:hidden">লগইন</span>
            <span className="hidden sm:inline">লগইন / সাইন আপ</span>
          </button>
        )}
      </div>
    </header>
  );
};
