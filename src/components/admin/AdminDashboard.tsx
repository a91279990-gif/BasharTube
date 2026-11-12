import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Film, 
  FileCheck, 
  HardDrive, 
  Sparkles, 
  Check, 
  X, 
  Ban, 
  Trash2, 
  Plus, 
  Clock, 
  Activity,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  Copy,
  CheckCheck,
  Search,
  CheckCircle,
  RefreshCw,
  Wallet,
  DollarSign,
  AlertOctagon,
  ArrowUpRight,
  CheckCircle2,
  Settings,
  Save,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVideo } from '../../context/VideoContext';
import { useComment } from '../../context/CommentContext';
import { useLanguage } from '../../context/LanguageContext';
import { useMonetization } from '../../context/MonetizationContext';
import { DEFAULT_PLATFORM_SETTINGS, SUPER_ADMIN_EMAIL } from '../../data/mockData';
import { VerificationRequest, UserProfile } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { language } = useLanguage();
  const { 
    currentUser, 
    isAdminUnlocked, 
    unlockAdminWithPassword, 
    lockAdmin, 
    updateAdminPassword 
  } = useAuth();
  const { videos, deleteVideo } = useVideo();
  const { comments, reviewCommentAction } = useComment();
  const { 
    applications, 
    withdrawals, 
    transactions, 
    antiFraudLogs, 
    approveMonetization, 
    rejectMonetization, 
    toggleCreatorMonetization, 
    approveWithdrawal, 
    rejectWithdrawal,
    monetizationConfig,
    updateMonetizationConfig,
    resetMonetizationConfig
  } = useMonetization();

  // Password Gate States
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  // Change Password Modal inside Admin
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [changePassError, setChangePassError] = useState<string | null>(null);
  const [changePassSuccess, setChangePassSuccess] = useState<string | null>(null);

  // Monetization control subtabs & modals
  const [monetizationSubTab, setMonetizationSubTab] = useState<'applications' | 'withdrawals' | 'creators' | 'antifraud' | 'settings'>('applications');
  const [selectedAppForReject, setSelectedAppForReject] = useState<{ id: string; name: string } | null>(null);
  const [appRejectReason, setAppRejectReason] = useState('');
  const [selectedWithdrawalForApprove, setSelectedWithdrawalForApprove] = useState<{ id: string; amount: number; creator: string; bKash: string } | null>(null);
  const [bKashTrxIdInput, setBKashTrxIdInput] = useState('');
  const [selectedWithdrawalForReject, setSelectedWithdrawalForReject] = useState<{ id: string; amount: number; creator: string } | null>(null);
  const [withdrawalRejectReason, setWithdrawalRejectReason] = useState('');
  const [monetizationActionMsg, setMonetizationActionMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Dynamic Monetization Configuration States
  const [configMinViews, setConfigMinViews] = useState<number>(monetizationConfig.minViews);
  const [configMinWatchHours, setConfigMinWatchHours] = useState<number>(monetizationConfig.minWatchHours);
  const [configMinFollowers, setConfigMinFollowers] = useState<number>(monetizationConfig.minFollowers);
  const [configRatePer1000Views, setConfigRatePer1000Views] = useState<number>(monetizationConfig.ratePer1000Views);
  const [configRatePerWatchHour, setConfigRatePerWatchHour] = useState<number>(monetizationConfig.ratePerWatchHour);
  const [configMinWithdrawal, setConfigMinWithdrawal] = useState<number>(monetizationConfig.minWithdrawalAmount);
  const [configSaveStatus, setConfigSaveStatus] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    setConfigMinViews(monetizationConfig.minViews);
    setConfigMinWatchHours(monetizationConfig.minWatchHours);
    setConfigMinFollowers(monetizationConfig.minFollowers);
    setConfigRatePer1000Views(monetizationConfig.ratePer1000Views);
    setConfigRatePerWatchHour(monetizationConfig.ratePerWatchHour);
    setConfigMinWithdrawal(monetizationConfig.minWithdrawalAmount);
  }, [monetizationConfig]);

  const handleSaveMonetizationConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaveStatus(null);
    setIsSavingConfig(true);

    try {
      const res = await updateMonetizationConfig({
        minViews: Number(configMinViews) || 0,
        minWatchHours: Number(configMinWatchHours) || 0,
        minFollowers: Number(configMinFollowers) || 0,
        ratePer1000Views: Number(configRatePer1000Views) || 0,
        ratePerWatchHour: Number(configRatePerWatchHour) || 0,
        minWithdrawalAmount: Number(configMinWithdrawal) || 0
      });

      if (res.success) {
        setConfigSaveStatus({ text: 'মনিটাইজেশনের নতুন যোগ্যতা ও আয়ের হার সফলভাবে সংরক্ষিত হয়েছে!' });
        setTimeout(() => setConfigSaveStatus(null), 3500);
      } else {
        setConfigSaveStatus({ text: res.message || 'সংরক্ষণ ব্যর্থ হয়েছে', isError: true });
      }
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleResetMonetizationConfig = async () => {
    if (window.confirm('আপনি কি ডিফল্ট মনিটাইজেশন মান (১০ কোটি ভিউ, ১০,০০০ ঘণ্টা, ১০,০০০ ফলোয়ার, ১০ টাকা/১০০০ ভিউ, ১ টাকা/ঘণ্টা, ১০,০০০ টাকা ক্যাশআউট) পুনরুদ্ধার করতে চান?')) {
      const res = await resetMonetizationConfig();
      if (res.success) {
        setConfigSaveStatus({ text: 'ডিফল্ট মান সফলভাবে পুনরুদ্ধার করা হয়েছে!' });
        setTimeout(() => setConfigSaveStatus(null), 3500);
      }
    }
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'monetization' | 'users' | 'videos' | 'verification' | 'trending' | 'logs'>('overview');
  
  // Platform settings state
  const [maxDuration, setMaxDuration] = useState<number>(DEFAULT_PLATFORM_SETTINGS.maxVideoDurationSeconds);
  const [maxUploadSize, setMaxUploadSize] = useState<number>(DEFAULT_PLATFORM_SETTINGS.maxVideoUploadSizeMB);
  const [trendingKeywords, setTrendingKeywords] = useState<string[]>(DEFAULT_PLATFORM_SETTINGS.trendingSearchTerms);
  const [newKeyword, setNewKeyword] = useState<string>('');

  // Users state: loaded dynamically from registered accounts
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('bashartube_registered_accounts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [userSearch, setUserSearch] = useState('');

  // Refresh users list
  const refreshUsers = () => {
    try {
      const saved = localStorage.getItem('bashartube_registered_accounts');
      if (saved) {
        setAllUsers(JSON.parse(saved));
      }
    } catch {}
  };

  useEffect(() => {
    refreshUsers();
  }, [isAdminUnlocked]);

  // Verification requests
  const [verificationQueue, setVerificationQueue] = useState<VerificationRequest[]>([
    {
      id: 'vreq_1',
      userId: 'usr_verified_applicant',
      username: 'bd_explorer',
      displayName: 'Bangladesh Explorer 🇧🇩',
      reason: 'Official travel creator documenting 64 districts in 4K.',
      supportingDocUrl: 'https://youtube.com/@bdexplorer',
      status: 'pending',
      createdAt: '2026-03-02T12:00:00Z'
    }
  ]);

  // Security audit logs
  const [auditLogs, setAuditLogs] = useState<{ id: string; event: string; user: string; timestamp: string }[]>([
    { id: 'log_1', event: 'Super Admin Vault Initialized & Protected', user: 'Security Core', timestamp: new Date().toISOString() },
    { id: 'log_2', event: 'AI Content Moderation Shield Active (Gemini AI)', user: 'AI Filter', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: 'log_3', event: 'Database Encrypted & Storage Verified', user: 'Cloud Guard', timestamp: new Date(Date.now() - 7200000).toISOString() }
  ]);

  // Flagged comments for AI moderation
  const flaggedComments = comments.filter(c => c.aiModerationStatus === 'flagged');

  const handleGateUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setGateError(null);
    const result = unlockAdminWithPassword(passwordInput);
    if (!result.success) {
      setGateError(result.message || 'ভুল সিকিউরিটি পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।');
    } else {
      setPasswordInput('');
      setAuditLogs(prev => [
        {
          id: 'log_' + Date.now(),
          event: 'Super Admin Terminal Unlocked via Master Password',
          user: currentUser?.email || 'Super Admin',
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);
    }
  };


  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);
    setChangePassSuccess(null);

    const result = updateAdminPassword(currentPassInput, newPassInput);
    if (!result.success) {
      setChangePassError(result.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।');
    } else {
      setChangePassSuccess(result.message || 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
      setCurrentPassInput('');
      setNewPassInput('');
      setTimeout(() => {
        setShowChangePassModal(false);
        setChangePassSuccess(null);
      }, 1500);
    }
  };

  const handleToggleSuspendUser = (userId: string) => {
    setAllUsers(prev => {
      const updated = prev.map(u => {
        if (u.id === userId) {
          const nextState = !u.isSuspended;
          setAuditLogs(prevLogs => [
            {
              id: 'log_' + Date.now(),
              event: `${nextState ? 'Applied 30-day suspension to' : 'Unsuspended'} @${u.username}`,
              user: currentUser?.displayName || 'Super Admin',
              timestamp: new Date().toISOString()
            },
            ...prevLogs
          ]);
          return { ...u, isSuspended: nextState };
        }
        return u;
      });
      try {
        localStorage.setItem('bashartube_registered_accounts', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleToggleVerification = (userId: string) => {
    setAllUsers(prev => {
      const updated = prev.map(u => {
        if (u.id === userId) {
          const nextVerified = !u.isVerified;
          setAuditLogs(prevLogs => [
            {
              id: 'log_' + Date.now(),
              event: `${nextVerified ? 'Approved verified badge for' : 'Revoked verification from'} @${u.username}`,
              user: currentUser?.displayName || 'Super Admin',
              timestamp: new Date().toISOString()
            },
            ...prevLogs
          ]);
          return { ...u, isVerified: nextVerified };
        }
        return u;
      });
      try {
        localStorage.setItem('bashartube_registered_accounts', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleDeleteUserAccount = (userId: string) => {
    if (window.confirm('আপনি কি নিশ্চিত যে এই ব্যবহারকারীর অ্যাকাউন্ট ও সমস্ত তথ্য মুছে ফেলতে চান?')) {
      setAllUsers(prev => {
        const updated = prev.filter(u => u.id !== userId);
        try {
          localStorage.setItem('bashartube_registered_accounts', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setAuditLogs(prevLogs => [
        {
          id: 'log_' + Date.now(),
          event: `Permanently removed account ${userId}`,
          user: currentUser?.displayName || 'Super Admin',
          timestamp: new Date().toISOString()
        },
        ...prevLogs
      ]);
    }
  };

  const handleReviewVerification = (reqId: string, status: 'approved' | 'rejected') => {
    setVerificationQueue(prev => prev.map(req => {
      if (req.id === reqId) {
        if (status === 'approved') {
          handleToggleVerification(req.userId);
        }
        return { ...req, status };
      }
      return req;
    }));
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    const clean = newKeyword.startsWith('#') ? newKeyword.trim() : `#${newKeyword.trim()}`;
    if (!trendingKeywords.includes(clean)) {
      setTrendingKeywords([...trendingKeywords, clean]);
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (kw: string) => {
    setTrendingKeywords(trendingKeywords.filter(k => k !== kw));
  };

  // ==========================================
  // PASSWORD GATE: When Admin is LOCKED
  // ==========================================
  if (!isAdminUnlocked) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
          {/* Glowing Cyber Accent */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-pink-500/20 to-purple-500/20 rounded-3xl blur-xl pointer-events-none" />

          <div className="relative">
            {/* Lock Icon Emblem */}
            <div className="flex justify-center mb-6">
              <div className="relative w-20 h-20 rounded-3xl bg-zinc-950 border border-zinc-700/80 p-[2px] shadow-2xl flex items-center justify-center">
                <div className="w-full h-full rounded-[22px] bg-gradient-to-br from-zinc-900 via-black to-zinc-950 flex items-center justify-center">
                  <Lock className="w-9 h-9 text-pink-400 stroke-[2] animate-pulse" />
                </div>
              </div>
            </div>

            {/* Header Title */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-bold mb-2 shadow">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>মাস্টার সিকিউরিটি গেটওয়ে (Admin Protected)</span>
              </div>
              <h1 className="text-2xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight">
                বাশারটিউব সুপার অ্যাডমিন ভল্ট
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 font-['Hind_Siliguri'] mt-1">
                অ্যাডমিন প্যানেলে প্রবেশ করতে শুধুমাত্র শক্তিশালী মাস্টার পাসওয়ার্ড প্রদান করুন
              </p>
            </div>

            {/* Error Notice */}
            {gateError && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs mb-4 animate-in shake">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span className="font-['Hind_Siliguri']">{gateError}</span>
              </div>
            )}

            {/* Password Entry Form */}
            <form onSubmit={handleGateUnlock} className="space-y-4 font-['Hind_Siliguri']">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                    <span>অ্যাডমিন পাসওয়ার্ড (Admin Password) *</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">ENCRYPTED SHA-256</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="পাসওয়ার্ড প্রদান করুন..."
                    className="w-full px-4 py-3 pr-11 rounded-2xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Unlock Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-pink-500 text-black font-black text-sm hover:brightness-110 active:scale-95 transition shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4 stroke-[2.5]" />
                <span>অ্যাডমিন প্যানেল আনলক করুন</span>
              </button>
            </form>

            {/* Zero-Disclosure Security Notice */}
            <div className="mt-6 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 text-center">
              <span className="text-xs text-zinc-400 flex items-center justify-center gap-2 font-medium">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>মাস্টার সিকিউরিটি পাসওয়ার্ড অত্যন্ত গোপনীয়। অননুমোদিত অ্যাক্সেস বা প্রকাশ সম্পূর্ণ নিষিদ্ধ।</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // UNLOCKED SUPER ADMIN CONSOLE
  // ==========================================
  const filteredUsers = allUsers.filter(u => 
    (u.displayName || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.channelName || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 font-['Hind_Siliguri']">
      {/* Top Banner: Unlocked Vault Status */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-cyan-500/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
              সুপার অ্যাডমিন টার্মিনাল — আনলকড
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span>পাসওয়ার্ড সুরক্ষিত</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight">
            BasharTube Executive Console
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            সুপার অ্যাডমিন: <span className="text-cyan-400 font-mono">{SUPER_ADMIN_EMAIL}</span>
          </p>
        </div>

        {/* Action Buttons: Change Password & Lock Admin */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowChangePassModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition"
          >
            <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
            <span>পাসওয়ার্ড পরিবর্তন</span>
          </button>

          <button
            onClick={lockAdmin}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition shadow"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>লক করুন (Lock)</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-zinc-800">
        {[
          { id: 'overview', label: 'প্ল্যাটফর্ম ওভারভিউ', icon: Activity },
          { 
            id: 'monetization', 
            label: `মনিটাইজেশন ও বিকাশ ক্যাশআউট (${applications.filter(a => a.status === 'pending').length + withdrawals.filter(w => w.status === 'pending').length})`, 
            icon: Wallet 
          },
          { id: 'users', label: `ব্যবহারকারী ও চ্যানেল (${allUsers.length})`, icon: Users },
          { id: 'videos', label: `ভিডিও ব্যবস্থাপনা (${videos.length})`, icon: Film },
          { id: 'verification', label: `ভেরিফিকেশন আবেদন (${verificationQueue.filter(r => r.status === 'pending').length})`, icon: FileCheck },
          { id: 'trending', label: 'ট্রেন্ডিং সার্চ কী-ওয়ার্ডস', icon: Sparkles },
          { id: 'logs', label: 'সিকিউরিটি অডিট লগ', icon: ShieldCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-pink-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-zinc-900/70 border border-zinc-800">
              <span className="text-xs font-bold text-zinc-400">নিবন্ধিত চ্যানেল ও ব্যবহারকারী</span>
              <p className="text-3xl font-black text-white mt-2 font-['Plus_Jakarta_Sans']">{allUsers.length}</p>
              <span className="text-[11px] text-cyan-400 mt-1 block">নতুন অ্যাকাউন্ট সিস্টেম সক্রিয়</span>
            </div>

            <div className="p-5 rounded-3xl bg-zinc-900/70 border border-zinc-800">
              <span className="text-xs font-bold text-zinc-400">মোট আপলোডকৃত ভিডিও</span>
              <p className="text-3xl font-black text-white mt-2 font-['Plus_Jakarta_Sans']">{videos.length}</p>
              <span className="text-[11px] text-pink-400 mt-1 block">MP4 1080p ফুল-স্ক্রিন ফিড</span>
            </div>

            <div className="p-5 rounded-3xl bg-zinc-900/70 border border-zinc-800">
              <span className="text-xs font-bold text-zinc-400">মোট ভিডিও ভিউ</span>
              <p className="text-3xl font-black text-white mt-2 font-['Plus_Jakarta_Sans']">
                {videos.reduce((acc, v) => acc + (v.viewsCount || 0), 0)}
              </p>
              <span className="text-[11px] text-emerald-400 mt-1 block">লাইভ প্লেব্যাক কাউন্ট</span>
            </div>

            <div className="p-5 rounded-3xl bg-zinc-900/70 border border-zinc-800">
              <span className="text-xs font-bold text-zinc-400">ভল্ট সিকিউরিটি স্ট্যাটাস</span>
              <p className="text-2xl font-black text-emerald-400 mt-2 font-['Plus_Jakarta_Sans'] flex items-center gap-1.5">
                <CheckCircle className="w-5 h-5" />
                <span>PROTECTED</span>
              </p>
              <span className="text-[11px] text-zinc-400 mt-1 block">মাস্টার পাসওয়ার্ড সক্রিয়</span>
            </div>
          </div>

          {/* Policy Reminder */}
          <div className="p-5 rounded-3xl bg-zinc-900/40 border border-zinc-800/80">
            <h3 className="text-sm font-bold text-cyan-400 mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>বাশারটিউব প্ল্যাটফর্ম কোর পলিসি</span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              সুপার অ্যাডমিন আর্কিটেকচার অনুযায়ী পুরো প্ল্যাটফর্মের কমেন্ট বন্ধ করার অপশন স্থায়ীভাবে ব্লক করা হয়েছে (ক্রিয়েটরগণ কেবল তাদের নিজস্ব ভিডিওর কমেন্ট নিয়ন্ত্রণ করেন)। এছাড়াও প্ল্যাটফর্মে কোনো প্রকার রিপোর্ট ফর্ম বা বাটন থাকবে না—AI মডারেশন স্বয়ংক্রিয়ভাবে স্প্যাম নিয়ন্ত্রণ করে এবং ব্যবহারকারীদের জন্য ব্লক সুবিধা রয়েছে।
            </p>
          </div>
        </div>
      )}

      {/* MONETIZATION & BKASH CASHOUT TAB */}
      {activeTab === 'monetization' && (
        <div className="space-y-6">
          {/* Notification banner if action performed */}
          {monetizationActionMsg && (
            <div className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold shadow-lg animate-in fade-in ${
              monetizationActionMsg.isError 
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
            }`}>
              <div className="flex items-center gap-2">
                {monetizationActionMsg.isError ? <AlertOctagon className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                <span>{monetizationActionMsg.text}</span>
              </div>
              <button onClick={() => setMonetizationActionMsg(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs font-bold text-zinc-400">মুলতবি ক্যাশআউট (Pending bKash)</span>
              <p className="text-2xl sm:text-3xl font-black text-pink-400 mt-2 font-['Plus_Jakarta_Sans']">
                ৳{withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-zinc-400 mt-1 block">
                {withdrawals.filter(w => w.status === 'pending').length}টি রিকোয়েস্ট অপেক্ষারত
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs font-bold text-zinc-400">পরিশোধিত মোট আয় (Total Paid)</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2 font-['Plus_Jakarta_Sans']">
                ৳{withdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.amount, 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-zinc-400 mt-1 block">বিকাশ TrxID ভেরিফায়েড</span>
            </div>

            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs font-bold text-zinc-400">মনিটাইজেশন আবেদন</span>
              <p className="text-2xl sm:text-3xl font-black text-cyan-400 mt-2 font-['Plus_Jakarta_Sans']">
                {applications.filter(a => a.status === 'pending').length}
              </p>
              <span className="text-[11px] text-zinc-400 mt-1 block">যাচাইয়ের অপেক্ষায়</span>
            </div>

            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs font-bold text-zinc-400">অ্যান্টি-ফ্রড ও বট অ্যালার্ট</span>
              <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-2 font-['Plus_Jakarta_Sans']">
                {antiFraudLogs.length}
              </p>
              <span className="text-[11px] text-zinc-400 mt-1 block">স্বয়ংক্রিয়ভাবে প্রতিরোধকৃত</span>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2">
            {[
              { id: 'applications', label: `আবেদন যাচাই (${applications.filter(a => a.status === 'pending').length})` },
              { id: 'withdrawals', label: `বিকাশ ক্যাশআউট (${withdrawals.filter(w => w.status === 'pending').length})` },
              { id: 'creators', label: `মনিটাইজড ক্রিয়েটর (${allUsers.filter(u => u.monetizationStatus === 'monetized').length})` },
              { id: 'antifraud', label: `বট ও ফ্রড লগ (${antiFraudLogs.length})` },
              { id: 'settings', label: 'মনিটাইজেশন ও আয়ের হার সেটিংস ⚙' }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setMonetizationSubTab(sub.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  monetizationSubTab === sub.id
                    ? 'bg-zinc-800 text-cyan-400 border border-cyan-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* SubTab 1: Monetization Applications Queue */}
          {monetizationSubTab === 'applications' && (
            <div className="space-y-4">
              {applications.length === 0 ? (
                <div className="p-10 text-center rounded-3xl bg-zinc-900/50 border border-zinc-800">
                  <FileCheck className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white mb-1">কোনো মনিটাইজেশন আবেদন নেই</h4>
                  <p className="text-xs text-zinc-400">
                    যোগ্য ক্রিয়েটররা (১০ কোটি ভিউ, ১০,০০০ ঘণ্টা, ১০,০০০ ফলোয়ার) আবেদন করলে এখানে পর্যালোচনা করতে পারবেন।
                  </p>
                </div>
              ) : (
                applications.map(app => (
                  <div key={app.id} className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-base">{app.creatorName}</span>
                        <span className="text-xs text-cyan-400 font-mono">{app.handle}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          app.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                          app.status === 'rejected' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {app.status === 'approved' ? 'অনুমোদিত' : app.status === 'rejected' ? 'প্রত্যাখ্যাত' : 'পর্যালোচনাধীন'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                        <span>ভিডিও ভিউ: <strong className="text-white font-mono">{(app.validViews || 0).toLocaleString()}</strong> / ১০ কোটি</span>
                        <span>ওয়াচ টাইম: <strong className="text-white font-mono">{(app.validWatchTimeHours || 0).toLocaleString()}</strong> / ১০,০০০ ঘণ্টা</span>
                        <span>ফলোয়ার: <strong className="text-white font-mono">{(app.followersCount || 0).toLocaleString()}</strong> / ১০,০০০</span>
                        <span className="text-emerald-400">✓ অরিজিনাল কন্টেন্ট প্রত্যায়িত</span>
                      </div>

                      {app.rejectionReason && (
                        <p className="text-xs text-rose-400 font-medium">প্রত্যাখ্যানের কারণ: {app.rejectionReason}</p>
                      )}
                    </div>

                    {app.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={async () => {
                            const res = await approveMonetization(app.id);
                            setMonetizationActionMsg({ text: res.message || 'মনিটাইজেশন অনুমোদিত হয়েছে।' });
                            setTimeout(() => setMonetizationActionMsg(null), 4000);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-black font-black text-xs hover:brightness-110 transition shadow-lg shadow-cyan-500/20"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>অনুমোদন করুন</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedAppForReject({ id: app.id, name: app.creatorName });
                            setAppRejectReason('');
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-400 text-xs font-bold transition border border-zinc-700"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>প্রত্যাখ্যান</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* SubTab 2: bKash Withdrawals Queue */}
          {monetizationSubTab === 'withdrawals' && (
            <div className="space-y-4">
              {withdrawals.length === 0 ? (
                <div className="p-10 text-center rounded-3xl bg-zinc-900/50 border border-zinc-800">
                  <Wallet className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white mb-1">কোনো ক্যাশআউট রিকোয়েস্ট নেই</h4>
                  <p className="text-xs text-zinc-400">
                    ক্রিয়েটররা ন্যূনতম ৳১০,০০০ তোলার আবেদন করলে এখানে তালিকাভুক্ত হবে।
                  </p>
                </div>
              ) : (
                withdrawals.map(req => (
                  <div key={req.id} className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-black text-pink-400 font-['Plus_Jakarta_Sans']">
                          ৳{req.amount.toLocaleString()}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                          req.status === 'rejected' ? 'bg-rose-500/20 text-rose-400' : 'bg-pink-500/20 text-pink-400'
                        }`}>
                          {req.status === 'approved' ? 'পরিশোধিত (Paid)' : req.status === 'rejected' ? 'প্রত্যাখ্যাত (ফেরত)' : 'অনুমোদনের অপেক্ষায়'}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-300 space-y-0.5">
                        <p>ক্রিয়েটর: <strong className="text-white">{req.creatorName}</strong></p>
                        <p className="flex items-center gap-2">
                          <span>বিকাশ নম্বর: <span className="text-pink-400 font-mono font-bold tracking-wider">{req.bKashNumber}</span></span>
                          <span className="capitalize px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-400">{req.bKashAccountType}</span>
                        </p>
                        <p className="text-zinc-500 text-[11px]">তারিখ: {new Date(req.requestedAt).toLocaleString()}</p>
                        {req.bKashTrxId && (
                          <p className="text-emerald-400 font-mono text-[11px] font-bold">
                            bKash TrxID: {req.bKashTrxId}
                          </p>
                        )}
                        {req.status === 'rejected' && req.rejectionReason && (
                          <p className="text-rose-400 text-xs">কারণ: {req.rejectionReason}</p>
                        )}
                      </div>
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedWithdrawalForApprove({
                              id: req.id,
                              amount: req.amount,
                              creator: req.creatorName,
                              bKash: req.bKashNumber
                            });
                            setBKashTrxIdInput('');
                          }}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-black font-black text-xs transition shadow-lg shadow-pink-500/25"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>বিকাশ পে অনুমোদন</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedWithdrawalForReject({
                              id: req.id,
                              amount: req.amount,
                              creator: req.creatorName
                            });
                            setWithdrawalRejectReason('');
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-400 text-xs font-bold transition border border-zinc-700"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>বাতিল ও ব্যালেন্স ফেরত</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* SubTab 3: Monetized Creators Directory */}
          {monetizationSubTab === 'creators' && (
            <div className="space-y-4">
              {allUsers.filter(u => u.monetizationStatus === 'monetized' || u.monetizationStatus === 'suspended').length === 0 ? (
                <div className="p-10 text-center rounded-3xl bg-zinc-900/50 border border-zinc-800">
                  <Users className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white mb-1">কোনো মনিটাইজড ক্রিয়েটর তালিকাভুক্ত নেই</h4>
                  <p className="text-xs text-zinc-400">
                    আবেদন অনুমোদন করা হলে এখানে ক্রিয়েটরদের মনিটাইজেশন নিয়ন্ত্রণ করতে পারবেন।
                  </p>
                </div>
              ) : (
                allUsers.filter(u => u.monetizationStatus === 'monetized' || u.monetizationStatus === 'suspended').map(cr => (
                  <div key={cr.id} className="p-4 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img src={cr.avatarUrl} alt={cr.displayName} className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400/50" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{cr.displayName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cr.monetizationStatus === 'monetized' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {cr.monetizationStatus === 'monetized' ? 'সক্রিয়' : 'স্থগিত'}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400">@{cr.username} • চ্যানেল: {cr.channelName}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          ব্যালেন্স: ৳{(cr.availableBalance || 0).toLocaleString()} • মোট আয়: ৳{(cr.lifetimeEarnings || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        const nextStatus = cr.monetizationStatus === 'monetized' ? 'suspended' : 'monetized';
                        await toggleCreatorMonetization(cr.id, nextStatus);
                        refreshUsers();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                        cr.monetizationStatus === 'monetized'
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                          : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                      }`}
                    >
                      {cr.monetizationStatus === 'monetized' ? 'স্থগিত করুন (Suspend)' : 'পুনরায় সক্রিয় করুন'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SubTab 4: Anti-Fraud & Bot Prevention Logs */}
          {monetizationSubTab === 'antifraud' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 leading-relaxed">
                <span className="font-bold text-cyan-400">অটোমেটিক গার্ড রুলস:</span> ফেক ভিউ, বট নেটওয়ার্ক, স্ক্রিপ্টেড স্প্যামিং এবং দ্রুত লুপ করা অটোমেটিক শনাক্ত ও ব্লক করা হয়। অবৈধ অ্যাক্টিভিটি থেকে কোনো ভিউ বা ওয়াচ টাইম কাউন্ট ও আয় যুক্ত হবে না।
              </div>

              {antiFraudLogs.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-500">
                  কোনো অননুমোদিত বট বা ফেক অ্যাক্টিভিটি পাওয়া যায়নি। প্ল্যাটফর্ম সম্পূর্ণ সুরক্ষিত।
                </div>
              ) : (
                antiFraudLogs.map(log => (
                  <div key={log.id} className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-rose-400">{log.actionTaken.toUpperCase()}</span>
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono">
                          {log.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-zinc-400 mt-0.5">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SubTab 5: Monetization & Income Rate Settings */}
          {monetizationSubTab === 'settings' && (
            <div className="space-y-6">
              {/* Header card */}
              <div className="p-5 rounded-3xl bg-zinc-950/70 border border-zinc-800">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      মনিটাইজেশন যোগ্যতা ও আয়ের হার পরিবর্তন (Monetization & Income Configuration)
                    </h3>
                    <p className="text-xs text-zinc-400">
                      সুপার অ্যাডমিন হিসেবে আপনি যেকোনো সময় ক্রিয়েটরদের মনিটাইজেশন অর্জনের শর্তসমূহ (ভিউ, ওয়াচ টাইম, ফলোয়ার) এবং প্রতি ১,০০০ ভিউ ও প্রতি ঘণ্টা ওয়াচ টাইমের আয়ের হার পরিবর্তন করতে পারেন।
                    </p>
                  </div>
                </div>

                {configSaveStatus && (
                  <div className={`mt-3 p-3.5 rounded-2xl flex items-center gap-2 text-xs font-bold ${
                    configSaveStatus.isError
                      ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                      : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  }`}>
                    {configSaveStatus.isError ? <AlertOctagon className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                    <span>{configSaveStatus.text}</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveMonetizationConfig} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Card 1: Eligibility Milestones */}
                  <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        ১. মনিটাইজেশন যোগ্যতা ও মাইলফলক শর্ত
                      </h4>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        ন্যূনতম ভ্যালিড ভিডিও ভিউ (Valid Views)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={configMinViews}
                        onChange={(e) => setConfigMinViews(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none transition"
                      />
                      <span className="text-[10px] text-zinc-500 mt-1 block">
                        ডিফল্ট: ১০ কোটি (100,000,000) ভিউ। ক্রিয়েটর প্রোফাইলের প্রগ্রেস বার এই টার্গেটের সাথে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        ন্যূনতম ভ্যালিড ওয়াচ টাইম (ঘণ্টা)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={configMinWatchHours}
                        onChange={(e) => setConfigMinWatchHours(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none transition"
                      />
                      <span className="text-[10px] text-zinc-500 mt-1 block">
                        ডিফল্ট: ১০,০০০ ঘণ্টা (10,000 hrs)।
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        ন্যূনতম চ্যানেল ফলোয়ার (Followers)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={configMinFollowers}
                        onChange={(e) => setConfigMinFollowers(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none transition"
                      />
                      <span className="text-[10px] text-zinc-500 mt-1 block">
                        ডিফল্ট: ১০,০০০ ফলোয়ার (10,000 followers)।
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Fixed Income Rates */}
                  <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                      <Wallet className="w-4 h-4 text-pink-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        ২. স্থায়ী আয়ের হার ও বিকাশ ক্যাশআউট সীমা
                      </h4>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        প্রতি ১,০০০ ভ্যালিড ভিউয়ের আয় (৳ BDT)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        value={configRatePer1000Views}
                        onChange={(e) => setConfigRatePer1000Views(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white font-mono focus:border-pink-500 focus:outline-none transition"
                      />
                      <span className="text-[10px] text-zinc-500 mt-1 block">
                        ডিফল্ট: ৳১০ টাকা / ১,০০০ ভ্যালিড ভিউ।
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        প্রতি ১ ঘণ্টা ওয়াচ টাইমের আয় (৳ BDT)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        value={configRatePerWatchHour}
                        onChange={(e) => setConfigRatePerWatchHour(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white font-mono focus:border-pink-500 focus:outline-none transition"
                      />
                      <span className="text-[10px] text-zinc-500 mt-1 block">
                        ডিফল্ট: ৳১ টাকা / ১ ঘণ্টা ওয়াচ টাইম।
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        সর্বনিম্ন বিকাশ ক্যাশআউট উত্তোলন সীমা (৳ BDT)
                      </label>
                      <input
                        type="number"
                        min="100"
                        required
                        value={configMinWithdrawal}
                        onChange={(e) => setConfigMinWithdrawal(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white font-mono focus:border-pink-500 focus:outline-none transition"
                      />
                      <span className="text-[10px] text-zinc-500 mt-1 block">
                        ডিফল্ট: ৳১০,০০০ টাকা। ক্রিয়েটরগণ ব্যালেন্স এই সীমার কম থাকলে ক্যাশআউট করতে পারবেন না।
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submit & Reset Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                  <div className="text-xs text-zinc-400">
                    <span className="font-bold text-white">লাইভ প্ল্যাটফর্ম সিঙ্কিং:</span> সেভ করার সাথে সাথে সমস্ত ক্রিয়েটর প্রোফাইল ও ড্যাশবোর্ডে নতুন মান প্রতিফলিত হবে।
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleResetMonetizationConfig}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white font-bold text-xs transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>ডিফল্ট রিস্টোর</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingConfig}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-black text-xs hover:brightness-110 active:scale-95 transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 stroke-[2.5]" />
                      <span>{isSavingConfig ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন (Save Settings)'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* USERS MANAGEMENT TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="চ্যানেলের নাম, ব্যবহারকারী বা জিমেইল খুঁজুন..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={refreshUsers}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>রিফ্রেশ</span>
            </button>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-zinc-900/50 border border-zinc-800">
              <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white mb-1">কোনো ব্যবহারকারী পাওয়া যায়নি</h4>
              <p className="text-xs text-zinc-400">
                {userSearch ? 'অনুসন্ধানের সাথে কোনো মিল পাওয়া যায়নি।' : 'নতুন ব্যবহারকারী সাইন আপ করার পর এখানে প্রদর্শিত হবে।'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUsers.map((u) => (
                <div key={u.id} className="p-4 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={u.avatarUrl}
                      alt={u.displayName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400/50 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white truncate">{u.displayName}</span>
                        {u.isVerified && <CheckCircle className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400 shrink-0" />}
                        {u.isSuspended && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 font-bold">
                            সাসপেন্ডেড
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">
                        {u.channelName ? `চ্যানেল: ${u.channelName} • ` : ''}@{u.username}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono truncate">{u.email}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleVerification(u.id)}
                      title={u.isVerified ? 'ভেরিফিকেশন সরান' : 'ভেরিফাইড ব্যাজ দিন'}
                      className={`p-2 rounded-xl transition ${
                        u.isVerified ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleSuspendUser(u.id)}
                      title={u.isSuspended ? 'আন-সাসপেন্ড করুন' : '৩০ দিনের জন্য সাসপেন্ড করুন'}
                      className={`p-2 rounded-xl transition ${
                        u.isSuspended ? 'bg-rose-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-rose-400'
                      }`}
                    >
                      <Ban className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteUserAccount(u.id)}
                      title="অ্যাকাউন্ট মুছে ফেলুন"
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIDEOS MANAGEMENT TAB */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          {/* Limits Config Card */}
          <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                সর্বোচ্চ ভিডিও দৈর্ঘ্য (সেকেন্ডে) — পলিসি অনুযায়ী সর্বোচ্চ ১০ মিনিট (৬০০ সেকেন্ড)
              </label>
              <input
                type="number"
                value={maxDuration}
                max={600}
                onChange={(e) => setMaxDuration(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                সর্বোচ্চ ভিডিও সাইজ (MB) — সর্বোচ্চ ৫০০ MB
              </label>
              <input
                type="number"
                value={maxUploadSize}
                max={500}
                onChange={(e) => setMaxUploadSize(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white"
              />
            </div>
          </div>

          {/* Videos Grid */}
          {videos.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-zinc-900/50 border border-zinc-800">
              <Film className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white mb-1">এখনো কোনো ভিডিও আপলোড করা হয়নি</h4>
              <p className="text-xs text-zinc-400">প্ল্যাটফর্মে ভিডিও আপলোড করা হলে এখানে তালিকাভুক্ত হবে।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {videos.map((vid) => (
                <div key={vid.id} className="p-4 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                  <div className="relative aspect-[9/14] rounded-2xl overflow-hidden bg-black">
                    <img
                      src={vid.thumbnailUrl}
                      alt={vid.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/80 text-[10px] font-bold text-cyan-400">
                      {vid.category}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white line-clamp-1">{vid.title}</h4>
                    <p className="text-xs text-zinc-400">ক্রিয়েটর: {vid.authorName}</p>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      {vid.viewsCount} ভিউ • {vid.likesCount} লাইক • {vid.commentsCount} কমেন্ট
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('এই ভিডিওটি স্থায়ীভাবে মুছে ফেলতে চান?')) {
                        deleteVideo(vid.id);
                      }
                    }}
                    className="w-full py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>মুছে ফেলুন</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VERIFICATION QUEUE TAB */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          {verificationQueue.map((req) => (
            <div key={req.id} className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-base text-white">{req.displayName}</span>
                  <span className="text-xs text-zinc-400">@{req.username}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                    req.status === 'rejected' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {req.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 max-w-xl">{req.reason}</p>
                {req.supportingDocUrl && (
                  <a
                    href={req.supportingDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-cyan-400 hover:underline mt-1 inline-block"
                  >
                    পোর্টফোলিও লিংক: {req.supportingDocUrl}
                  </a>
                )}
              </div>

              {req.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReviewVerification(req.id, 'approved')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>অনুমোদন করুন</span>
                  </button>
                  <button
                    onClick={() => handleReviewVerification(req.id, 'rejected')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-400 text-xs font-bold transition"
                  >
                    <X className="w-4 h-4" />
                    <span>বাতিল</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TRENDING KEYWORDS TAB */}
      {activeTab === 'trending' && (
        <div className="space-y-4">
          <form onSubmit={handleAddKeyword} className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="নতুন ট্রেন্ডিং ট্যাগ (e.g. #eid2026)"
              className="flex-1 px-4 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-bold text-xs hover:brightness-110 active:scale-95 transition"
            >
              যোগ করুন
            </button>
          </form>

          <div className="flex flex-wrap gap-2 pt-2">
            {trendingKeywords.map((kw) => (
              <span
                key={kw}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-cyan-400"
              >
                <span>{kw}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(kw)}
                  className="hover:text-rose-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* SECURITY AUDIT LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="p-4 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-2">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-white">{log.event}</span>
                <span className="text-[11px] text-zinc-500 block">Operator: {log.user}</span>
              </div>
              <span className="text-zinc-500 font-mono text-[10px] shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showChangePassModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
            <button
              onClick={() => setShowChangePassModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-black text-white font-['Plus_Jakarta_Sans']">
                মাস্টার পাসওয়ার্ড পরিবর্তন
              </h3>
            </div>

            {changePassError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs mb-3">
                {changePassError}
              </div>
            )}

            {changePassSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs mb-3">
                {changePassSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  বর্তমান পাসওয়ার্ড
                </label>
                <input
                  type="password"
                  required
                  value={currentPassInput}
                  onChange={(e) => setCurrentPassInput(e.target.value)}
                  placeholder="বর্তমান মাস্টার পাসওয়ার্ড দিন"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  নতুন শক্তিশালী পাসওয়ার্ড (অন্তত ৮ অক্ষর)
                </label>
                <input
                  type="password"
                  required
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  placeholder="নতুন শক্তিশালী পাসওয়ার্ড দিন"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-pink-500 text-black font-extrabold text-sm hover:brightness-110 active:scale-95 transition shadow-lg"
              >
                সংরক্ষণ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reject Monetization Application Modal */}
      {selectedAppForReject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
            <button
              onClick={() => setSelectedAppForReject(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-2">
              আবেদন প্রত্যাখ্যানের কারণ
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              ক্রিয়েটর <strong>{selectedAppForReject.name}</strong>-কে কারণটি স্পষ্টভাবে জানানো হবে যাতে তারা সংশোধন করে পুনরায় আবেদন করতে পারেন।
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!appRejectReason.trim()) return;
              const res = await rejectMonetization(selectedAppForReject.id, appRejectReason.trim());
              setSelectedAppForReject(null);
              setAppRejectReason('');
              setMonetizationActionMsg({ text: res.message || 'আবেদন প্রত্যাখ্যান করা হয়েছে।', isError: true });
              setTimeout(() => setMonetizationActionMsg(null), 4000);
            }} className="space-y-4">
              <textarea
                required
                rows={3}
                value={appRejectReason}
                onChange={(e) => setAppRejectReason(e.target.value)}
                placeholder="প্রত্যাখ্যানের সুনির্দিষ্ট কারণ লিখুন (e.g. অন্যের কপি করা ভিডিও পাওয়া গেছে, ইত্যাদি)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAppForReject(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-bold text-xs"
                >
                  প্রত্যাখ্যান নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve bKash Withdrawal Modal (Requires TrxID) */}
      {selectedWithdrawalForApprove && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
            <button
              onClick={() => setSelectedWithdrawalForApprove(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-pink-400" />
              <h3 className="text-base font-bold text-white">
                বিকাশ ক্যাশআউট অনুমোদন
              </h3>
            </div>
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs space-y-1 mb-4">
              <p>ক্রিয়েটর: <strong className="text-white">{selectedWithdrawalForApprove.creator}</strong></p>
              <p>টাকার পরিমাণ: <strong className="text-pink-400 font-mono text-sm">৳{selectedWithdrawalForApprove.amount.toLocaleString()}</strong></p>
              <p>বিকাশ নম্বর: <strong className="text-white font-mono">{selectedWithdrawalForApprove.bKash}</strong></p>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!bKashTrxIdInput.trim()) return;
              const res = await approveWithdrawal(selectedWithdrawalForApprove.id, bKashTrxIdInput.trim());
              setSelectedWithdrawalForApprove(null);
              setBKashTrxIdInput('');
              setMonetizationActionMsg({ text: res.message || 'বিকাশ ক্যাশআউট সফল হয়েছে।' });
              setTimeout(() => setMonetizationActionMsg(null), 4000);
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  বিকাশ ট্রানজেকশন আইডি (bKash TrxID) *
                </label>
                <input
                  type="text"
                  required
                  value={bKashTrxIdInput}
                  onChange={(e) => setBKashTrxIdInput(e.target.value)}
                  placeholder="e.g. BKASH827XA94"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono uppercase focus:outline-none focus:border-pink-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWithdrawalForApprove(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-black font-black text-xs"
                >
                  পরিশোধ সম্পন্ন করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject bKash Withdrawal Modal (Auto Refund) */}
      {selectedWithdrawalForReject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
            <button
              onClick={() => setSelectedWithdrawalForReject(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-2">
              ক্যাশআউট বাতিল ও ব্যালেন্স রিফান্ড
            </h3>
            <p className="text-xs text-zinc-400 mb-3">
              ক্যাশআউট বাতিল করলে <strong className="text-pink-400 font-mono">৳{selectedWithdrawalForReject.amount.toLocaleString()}</strong> টাকা ক্রিয়েটর <strong>{selectedWithdrawalForReject.creator}</strong>-এর অ্যাকাউন্টে স্বয়ংক্রিয়ভাবে ফেরত দেওয়া হবে।
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!withdrawalRejectReason.trim()) return;
              const res = await rejectWithdrawal(selectedWithdrawalForReject.id, withdrawalRejectReason.trim());
              setSelectedWithdrawalForReject(null);
              setWithdrawalRejectReason('');
              setMonetizationActionMsg({ text: res.message || 'ক্যাশআউট বাতিল ও ফেরত সম্পন্ন হয়েছে।', isError: true });
              setTimeout(() => setMonetizationActionMsg(null), 4000);
            }} className="space-y-4">
              <textarea
                required
                rows={3}
                value={withdrawalRejectReason}
                onChange={(e) => setWithdrawalRejectReason(e.target.value)}
                placeholder="বাতিল করার কারণ লিখুন (e.g. ভুল বিকাশ নম্বর, বিকাশ লিমিট অতিক্রান্ত)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWithdrawalForReject(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-bold text-xs"
                >
                  বাতিল ও রিফান্ড নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
