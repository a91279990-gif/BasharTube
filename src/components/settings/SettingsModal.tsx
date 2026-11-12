import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe, 
  Wifi, 
  EyeOff, 
  Shield, 
  Smartphone, 
  Laptop, 
  Tablet,
  LogOut,
  CheckCircle2,
  Bell,
  Eye,
  EyeOff as EyeOffIcon,
  Heart,
  MessageCircle,
  UserCheck,
  Phone,
  Video,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { NotificationCategorySettings, UserSession } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser,
    preferences, 
    updatePreferences, 
    toggleDontRecommendCreator,
    deviceSessions,
    fetchActiveSessions,
    invalidateSessionWithToken,
    updateNotificationCategory,
    toggleSeenStatus
  } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // Active Sessions & Devices sub-section states
  const [sessions, setSessions] = useState<UserSession[]>(deviceSessions);
  const [isFetchingSessions, setIsFetchingSessions] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loggingOutSessionId, setLoggingOutSessionId] = useState<string | null>(null);

  // Load and fetch active sessions when modal is open
  const loadSessions = async () => {
    setIsFetchingSessions(true);
    try {
      const activeList = await fetchActiveSessions();
      setSessions(activeList);
    } catch {
      setActionNotice({ text: 'সেশন তালিকা লোড করতে সমস্যা হয়েছে।', type: 'error' });
    } finally {
      setIsFetchingSessions(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Invalidate specific session using Firebase Auth Tokens
  const handleInvalidateSession = async (sessionId: string) => {
    setLoggingOutSessionId(sessionId);
    setActionNotice(null);

    try {
      const result = await invalidateSessionWithToken(sessionId);
      if (result.success) {
        setActionNotice({
          text: result.message || 'Firebase Auth Token অকার্যকর করে সেশন সফলভাবে লগআউট করা হয়েছে।',
          type: 'success'
        });
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      } else {
        setActionNotice({
          text: result.message || 'সেশন লগআউট ব্যর্থ হয়েছে।',
          type: 'error'
        });
      }
    } catch (err: any) {
      setActionNotice({
        text: err.message || 'টোকেন অকার্যকর করতে ত্রুটি ঘটেছে।',
        type: 'error'
      });
    } finally {
      setLoggingOutSessionId(null);
      setTimeout(() => {
        setActionNotice(null);
      }, 5000);
    }
  };

  const categories: { key: keyof NotificationCategorySettings; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      key: 'likes',
      label: 'লাইক নোটিফিকেশন (Likes)',
      icon: <Heart className="w-4 h-4 text-pink-400" />,
      desc: 'আপনার ভিডিওতে লাইক দেওয়া হলে নোটিফিকেশন পান'
    },
    {
      key: 'comments',
      label: 'কমেন্ট নোটিফিকেশন (Comments)',
      icon: <MessageCircle className="w-4 h-4 text-cyan-400" />,
      desc: 'আপনার ভিডিওতে নতুন মন্তব্য বা উত্তর আসলে নোটিফিকেশন পান'
    },
    {
      key: 'follows',
      label: 'ফলো নোটিফিকেশন (Follows)',
      icon: <UserCheck className="w-4 h-4 text-emerald-400" />,
      desc: 'নতুন কেউ আপনার চ্যানেল ফলো করলে নোটিফিকেশন পান'
    },
    {
      key: 'messages',
      label: 'মেসেঞ্জার নোটিফিকেশন (Messages)',
      icon: <Bell className="w-4 h-4 text-indigo-400" />,
      desc: 'মেসেঞ্জারে নতুন চ্যাট বার্তা আসলে নোটিফিকেশন পান'
    },
    {
      key: 'calls',
      label: 'কল নোটিফিকেশন (Voice & Video Calls)',
      icon: <Phone className="w-4 h-4 text-amber-400" />,
      desc: 'ইনকামিং ভয়েস বা ভিডিও কল নোটিফিকেশন ও রিংটোন'
    },
    {
      key: 'videoUploads',
      label: 'নতুন ভিডিও নোটিফিকেশন (Video Uploads)',
      icon: <Video className="w-4 h-4 text-rose-400" />,
      desc: 'আপনার পছন্দের ক্রিয়েটররা নতুন ভিডিও আপলোড করলে নোটিফিকেশন'
    }
  ];

  const getDeviceIcon = (type?: string, deviceName?: string) => {
    if (type === 'mobile' || deviceName?.toLowerCase().includes('phone') || deviceName?.toLowerCase().includes('android')) {
      return <Smartphone className="w-4 h-4 text-cyan-400" />;
    }
    if (type === 'tablet' || deviceName?.toLowerCase().includes('ipad')) {
      return <Tablet className="w-4 h-4 text-pink-400" />;
    }
    return <Laptop className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl animate-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto font-['Hind_Siliguri']">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
              সেটিংস ও পছন্দসমূহ (Settings)
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              Preferences
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Action Feedback Alert */}
        {actionNotice && (
          <div className={`mt-3 p-3 rounded-2xl border text-xs flex items-center gap-2 animate-in slide-in-from-top-1 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{actionNotice.text}</span>
          </div>
        )}

        <div className="mt-4 space-y-4">
          {/* ============================================================== */}
          {/* SUB-SECTION: ACTIVE LOGIN SESSIONS & DEVICE MANAGEMENT          */}
          {/* ============================================================== */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-cyan-500/30 shadow-lg space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <span>অ্যাক্টিভ লগইন সেশন ও ডিভাইস (Active Login Sessions)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                      {sessions.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Firebase Auth টোকেন ব্যবহার করে সক্রিয় ডিভাইস পরিচালনা করুন ও নির্দিষ্ট সেশন লগআউট করুন।
                  </p>
                </div>
              </div>

              {/* Fetch / Refresh Active Devices Button */}
              <button
                type="button"
                onClick={loadSessions}
                disabled={isFetchingSessions}
                className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-cyan-400 hover:text-cyan-300 border border-zinc-700/80 text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                title="সক্রিয় সেশন রিফ্রেশ করুন"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingSessions ? 'animate-spin' : ''}`} />
                <span>{isFetchingSessions ? 'ফেচ করা হচ্ছে...' : 'রিফ্রেশ সেশন (Fetch)'}</span>
              </button>
            </div>

            {/* List of Active Login Sessions */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5">
              {sessions.length === 0 ? (
                <div className="p-4 rounded-xl bg-zinc-900/50 text-center text-xs text-zinc-400">
                  {currentUser ? 'কোনো সক্রিয় সেশন পাওয়া যায়নি।' : 'ডিভাইস সেশন ও নিরাপত্তা টোকেন পরিচালনা করতে অনুগ্রহ করে প্রথমে অ্যাকাউন্টে লগইন করুন।'}
                </div>
              ) : (
                sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className={`p-3 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      sess.isCurrent
                        ? 'bg-gradient-to-r from-cyan-950/20 to-zinc-900 border-cyan-500/40 shadow-sm'
                        : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                        {getDeviceIcon(sess.deviceType, sess.deviceName)}
                      </div>

                      <div className="overflow-hidden">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">{sess.deviceName}</span>
                          {sess.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-black text-[9px] font-black tracking-tight">
                              বর্তমান ডিভাইস (This Device)
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-semibold">
                            Token: {sess.tokenStatus || 'Active'}
                          </span>
                        </div>

                        <div className="text-[10px] text-zinc-400 mt-1 flex flex-wrap items-center gap-2">
                          <span>ব্রাউজার: <strong className="text-zinc-300">{sess.browser}</strong> ({sess.os})</span>
                          <span>•</span>
                          <span>আইপি: <strong className="text-zinc-300">{sess.ipAddress || sess.ip}</strong></span>
                        </div>

                        <div className="text-[9px] text-zinc-500 mt-0.5 flex items-center gap-2">
                          <span>লগইন: {new Date(sess.loginAt || sess.lastActive || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <span className="font-mono text-zinc-600">ID: {sess.id.slice(0, 14)}...</span>
                        </div>
                      </div>
                    </div>

                    {/* Invalidate / Logout Button */}
                    <div className="shrink-0 flex sm:justify-end">
                      <button
                        type="button"
                        onClick={() => handleInvalidateSession(sess.id)}
                        disabled={loggingOutSessionId === sess.id}
                        className={`w-full sm:w-auto px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 shadow ${
                          sess.isCurrent
                            ? 'bg-zinc-800 hover:bg-rose-950 hover:border-rose-500/40 text-zinc-300 hover:text-rose-300 border-zinc-700'
                            : 'bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border-rose-500/20'
                        } disabled:opacity-50`}
                        title="Firebase Auth Token অকার্যকর করে এই সেশন বন্ধ করুন"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>
                          {loggingOutSessionId === sess.id
                            ? 'টোকেন বাতিল হচ্ছে...'
                            : sess.isCurrent
                              ? 'লগআউট (Current)'
                              : 'লগআউট (Logout)'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[10px] text-zinc-400 flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                'Logout' চাপলে Firebase ক্লাউড সার্ভার থেকে সংশ্লিষ্ট Auth Token অবৈধ করা হয় এবং ডিভাইসটির সেশন বাতিল হয়।
              </span>
            </div>
          </div>

          {/* 1. Language Switch */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-cyan-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">অ্যাপের ভাষা (Language)</h4>
                <p className="text-[11px] text-zinc-400">
                  বাংলা এবং ইংরেজি ভাষার মধ্যে পরিবর্তন করুন
                </p>
              </div>
            </div>

            <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  language === 'bn' ? 'bg-cyan-400 text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  language === 'en' ? 'bg-cyan-400 text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {/* 2. Messenger Seen Status Toggle */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-cyan-400">
                {preferences.seenStatusEnabled ? <Eye className="w-5 h-5" /> : <EyeOffIcon className="w-5 h-5 text-zinc-500" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">মেসেঞ্জার Seen স্ট্যাটাস (Seen Status)</h4>
                <p className="text-[11px] text-zinc-400">
                  {preferences.seenStatusEnabled 
                    ? 'চালু রয়েছে: প্রেরক দেখতে পাবেন আপনি বার্তা পড়েছেন কি না।' 
                    : 'বন্ধ রয়েছে: আপনি বার্তা পড়লেও প্রেরকের কাছে Delivered থাকবে, Seen হবে না।'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleSeenStatus(!preferences.seenStatusEnabled)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                preferences.seenStatusEnabled ? 'bg-cyan-400 justify-end' : 'bg-zinc-800 justify-start'
              }`}
            >
              <span className={`w-4 h-4 rounded-full ${preferences.seenStatusEnabled ? 'bg-black' : 'bg-zinc-500'}`} />
            </button>
          </div>

          {/* 3. Advanced Notification Settings */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white">উন্নত নোটিফিকেশন সেটিংস (Category Notification Settings)</h4>
            </div>
            <p className="text-[11px] text-zinc-400 mb-2">
              আপনার পছন্দ অনুযায়ী প্রতিটি ক্যাটাগরির নোটিফিকেশন আলাদাভাবে চালু বা বন্ধ রাখুন:
            </p>

            <div className="space-y-2.5 divide-y divide-zinc-900">
              {categories.map((cat) => {
                const isEnabled = preferences.notificationCategories?.[cat.key] ?? true;
                return (
                  <div key={cat.key} className="pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center">
                        {cat.icon}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{cat.label}</span>
                        <span className="text-[10px] text-zinc-500">{cat.desc}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateNotificationCategory(cat.key, !isEnabled)}
                      className={`w-11 h-5 flex items-center rounded-full p-0.5 transition shrink-0 ${
                        isEnabled ? 'bg-cyan-400 justify-end' : 'bg-zinc-800 justify-start'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full ${isEnabled ? 'bg-black' : 'bg-zinc-500'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Advanced Data Saver */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-amber-400">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">{t('dataSaver')}</h4>
                <p className="text-[11px] text-zinc-400">
                  চালু থাকলে শুধু পরবর্তী ১টি ভিডিও প্রি-লোড হবে এবং মোবাইল ডাটা সাশ্রয় হবে।
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => updatePreferences({ dataSaver: !preferences.dataSaver })}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                preferences.dataSaver ? 'bg-cyan-400 justify-end' : 'bg-zinc-800 justify-start'
              }`}
            >
              <span className={`w-4 h-4 rounded-full ${preferences.dataSaver ? 'bg-black' : 'bg-zinc-500'}`} />
            </button>
          </div>

          {/* 5. Don't Recommend List */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <EyeOff className="w-4 h-4 text-zinc-400" />
              <h4 className="text-xs font-bold text-white">{t('dontRecommend')}</h4>
            </div>
            <p className="text-[11px] text-zinc-400 mb-2">
              এই তালিকায় থাকা ক্রিয়েটরদের কোনো ভিডিও আপনার ফিডে সুপারিশ করা হবে না।
            </p>
            {preferences.dontRecommendCreatorIds.length === 0 ? (
              <span className="text-[11px] text-zinc-500 italic">কোনো ক্রিয়েটর মিউট করা নেই।</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {preferences.dontRecommendCreatorIds.map(id => (
                  <span key={id} className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 flex items-center gap-1.5">
                    <span>Creator ({id})</span>
                    <button type="button" onClick={() => toggleDontRecommendCreator(id)} className="text-rose-400 hover:text-white font-bold">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800 mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-cyan-400 text-black font-bold text-xs shadow-md shadow-cyan-500/20 hover:brightness-110 transition"
          >
            সম্পন্ন (Done)
          </button>
        </div>
      </div>
    </div>
  );
};
