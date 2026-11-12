import React, { useState } from 'react';
import { 
  CheckCircle, 
  Globe, 
  Edit3, 
  Lock, 
  Trash2, 
  Eye, 
  Heart, 
  BarChart3, 
  Film, 
  FileCheck, 
  Upload,
  User,
  Download,
  ShieldCheck,
  Smartphone,
  Laptop,
  LogOut,
  Plus,
  X,
  ExternalLink,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  AtSign,
  Copy,
  Check,
  Camera,
  Wallet,
  DollarSign,
  TrendingUp,
  ArrowDownRight,
  Sparkles,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVideo } from '../../context/VideoContext';
import { useLanguage } from '../../context/LanguageContext';
import { useMonetization } from '../../context/MonetizationContext';
import { SocialMediaLink } from '../../types';
import { normalizeHandle, validateHandleFormat } from '../../utils/handleValidation';
import { MonetizationProgressBar } from './MonetizationProgressBar';

interface ProfileViewProps {
  onOpenUpload: () => void;
  onOpenAuth: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onOpenUpload,
  onOpenAuth
}) => {
  const { 
    currentUser, 
    updateProfile, 
    deviceSessions,
    logoutSession,
    invalidateSessionWithToken,
    deleteAccountWithPassword,
    changeSecurityQuestion,
    updateSocialLinks,
    checkHandleAvailability
  } = useAuth();
  const { videos, deleteVideo, updateVideoVisibility } = useVideo();
  const { t, language } = useLanguage();
  const {
    creatorMonetizationStatus,
    eligibilityMetrics,
    creatorTransactions,
    creatorWithdrawals,
    applyForMonetization,
    requestBKashWithdrawal,
    saveBKashSettings,
    monetizationConfig
  } = useMonetization();

  const [activeTab, setActiveTab] = useState<'videos' | 'analytics' | 'monetization' | 'devices' | 'security' | 'verification'>('videos');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSecurityQModalOpen, setIsSecurityQModalOpen] = useState(false);

  // Edit form states
  const [editName, setEditName] = useState(currentUser?.displayName || '');
  const [editChannelName, setEditChannelName] = useState(currentUser?.channelName || '');
  const [editBio, setEditBio] = useState(currentUser?.bio || '');
  const [editWebsite, setEditWebsite] = useState(currentUser?.websiteUrl || '');
  const [editAvatar, setEditAvatar] = useState(currentUser?.avatarUrl || '');
  const [editHandle, setEditHandle] = useState(currentUser?.handle || ('@' + (currentUser?.username || '')));
  const [handleCollisionError, setHandleCollisionError] = useState<string | null>(null);
  const [handleSuggestions, setHandleSuggestions] = useState<string[]>([]);
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [logoFileError, setLogoFileError] = useState<string | null>(null);

  // Monetization modals and forms state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [originalCertified, setOriginalCertified] = useState(false);
  const [applyNote, setApplyNote] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(10000);
  const [bKashNum, setBKashNum] = useState(currentUser?.bKashNumber || '');
  const [bKashType, setBKashType] = useState<'personal' | 'agent' | 'merchant'>(currentUser?.bKashAccountType || 'personal');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [monetizationFeedback, setMonetizationFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  // Social Links state (Item 9)
  const [socialLinksList, setSocialLinksList] = useState<SocialMediaLink[]>(currentUser?.socialLinks || []);
  const [newPlatform, setNewPlatform] = useState<SocialMediaLink['platform']>('facebook');
  const [newUrl, setNewUrl] = useState('');
  const [socialError, setSocialError] = useState<string | null>(null);

  // Change Security Question states (Item 3)
  const [currentPassForQ, setCurrentPassForQ] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('আপনার প্রথম স্কুলের নাম কী?');
  const [newAnswerText, setNewAnswerText] = useState('');
  const [qError, setQError] = useState<string | null>(null);
  const [qSuccess, setQSuccess] = useState<string | null>(null);
  const [isQLoading, setIsQLoading] = useState(false);

  // Delete Account states (Item 7)
  const [deletePass, setDeletePass] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Verification request form states
  const [verifyReason, setVerifyReason] = useState('');
  const [verifyDocUrl, setVerifyDocUrl] = useState('');
  const [isVerificationSubmitted, setIsVerificationSubmitted] = useState(false);

  if (!currentUser) {
    return (
      <div className="flex-1 min-h-[75vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
        <div className="relative mb-5">
          <div className="absolute -inset-4 bg-gradient-to-r from-pink-500/20 via-cyan-500/20 to-purple-500/20 rounded-full blur-2xl" />
          <div className="relative w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl">
            <User className="w-9 h-9 text-pink-400 stroke-[2]" />
          </div>
        </div>
        <h3 className="text-2xl font-black text-white mb-2 font-['Plus_Jakarta_Sans']">
          আপনার চ্যানেলে প্রবেশ করুন
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mb-6 font-['Hind_Siliguri'] leading-relaxed">
          ভিডিও আপলোড করতে, অ্যানালিটিক্স দেখতে এবং নিজের চ্যানেল পরিচালনা করতে লগইন অথবা নতুন অ্যাকাউন্ট সাইন আপ করুন।
        </p>
        <button
          onClick={onOpenAuth}
          className="px-7 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-cyan-400 text-white font-black text-sm hover:brightness-110 active:scale-95 transition shadow-xl shadow-pink-500/25"
        >
          লগইন / নতুন অ্যাকাউন্ট তৈরি করুন
        </button>
      </div>
    );
  }

  // Filter creator's published videos (Strictly NO featured video section per item 10)
  const myVideos = videos.filter(v => v.authorId === currentUser.id);
  const totalViews = myVideos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);
  const totalLikes = myVideos.reduce((acc, v) => acc + (v.likesCount || 0), 0);
  const totalShares = myVideos.reduce((acc, v) => acc + (v.sharesCount || 0), 0);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoFileError('অনুগ্রহ করে শুধুমাত্র ছবি ফাইল (PNG, JPG, WEBP) নির্বাচন করুন।');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoFileError('ছবির সর্বোচ্চ সাইজ ৫ MB হতে পারবে।');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleHandleChange = (val: string) => {
    let clean = val;
    if (!clean.startsWith('@')) {
      clean = '@' + clean.replace(/^@+/, '');
    }
    setEditHandle(clean);
    setHandleCollisionError(null);

    const norm = normalizeHandle(clean);
    const formatCheck = validateHandleFormat(norm);
    if (!formatCheck.isValid) {
      setHandleCollisionError(formatCheck.error || 'হ্যান্ডেল সঠিক নয়');
      setHandleSuggestions([]);
      return;
    }

    const avail = checkHandleAvailability(norm, currentUser?.id);
    if (!avail.available) {
      setHandleCollisionError(avail.message || 'এই হ্যান্ডেলটি ইতিমধ্যে ব্যবহৃত হয়েছে!');
      setHandleSuggestions(avail.suggestions || []);
    } else {
      setHandleSuggestions([]);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setHandleCollisionError(null);

    const normHandle = normalizeHandle(editHandle);
    const formatCheck = validateHandleFormat(normHandle);
    if (!formatCheck.isValid) {
      setHandleCollisionError(formatCheck.error || 'হ্যান্ডেলটি সঠিক নয়');
      return;
    }

    const avail = checkHandleAvailability(normHandle, currentUser?.id);
    if (!avail.available) {
      setHandleCollisionError(avail.message || 'এই হ্যান্ডেলটি অন্য কেউ নিয়েছেন!');
      setHandleSuggestions(avail.suggestions || []);
      return;
    }

    const res = await updateProfile({
      displayName: editName.trim(),
      channelName: editChannelName.trim(),
      handle: normHandle,
      username: normHandle.replace(/^@/, ''),
      bio: editBio.trim(),
      websiteUrl: editWebsite.trim(),
      avatarUrl: editAvatar.trim(),
    });

    if (res.success) {
      setIsEditModalOpen(false);
    } else {
      setHandleCollisionError(res.message || 'প্রোফাইল আপডেট ব্যর্থ হয়েছে।');
    }
  };

  // Profile Photo Download (Item 8)
  const handleDownloadProfilePhoto = () => {
    const link = document.createElement('a');
    link.href = currentUser.avatarUrl;
    link.download = `${currentUser.channelName || currentUser.username}_profile_photo.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Manage Social Links (Item 9)
  const handleAddSocialLink = (e: React.FormEvent) => {
    e.preventDefault();
    setSocialError(null);
    if (!newUrl.trim()) return;

    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
      setSocialError('লিংক অবশ্যই https:// দিয়ে শুরু হতে হবে।');
      return;
    }

    const updated = [
      ...socialLinksList,
      {
        id: 'soc_' + Date.now(),
        platform: newPlatform,
        url: newUrl.trim()
      }
    ];

    setSocialLinksList(updated);
    updateSocialLinks(updated);
    setNewUrl('');
  };

  const handleRemoveSocialLink = (id: string) => {
    const updated = socialLinksList.filter(l => l.id !== id);
    setSocialLinksList(updated);
    updateSocialLinks(updated);
  };

  // Change Security Question & Answer (Item 3)
  const handleChangeSecurityQSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQError(null);
    setQSuccess(null);

    if (!currentPassForQ) {
      setQError('বর্তমান পাসওয়ার্ড প্রয়োজন।');
      return;
    }
    if (!newAnswerText.trim()) {
      setQError('নিরাপত্তা প্রশ্নের নতুন উত্তর দিন।');
      return;
    }

    setIsQLoading(true);
    try {
      const res = await changeSecurityQuestion(currentPassForQ, newQuestionText, newAnswerText.trim());
      if (res.success) {
        setQSuccess('নিরাপত্তা প্রশ্ন ও গোপন উত্তর সফলভাবে পরিবর্তিত হয়েছে!');
        setTimeout(() => {
          setIsSecurityQModalOpen(false);
          setCurrentPassForQ('');
          setNewAnswerText('');
          setQSuccess(null);
        }, 1200);
      } else {
        setQError(res.message || 'বর্তমান পাসওয়ার্ড ভুল হয়েছে।');
      }
    } finally {
      setIsQLoading(false);
    }
  };

  // Delete Account with Password Confirmation (Item 7)
  const handleDeleteAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    if (!deletePass) {
      setDeleteError('বর্তমান পাসওয়ার্ড প্রয়োজন।');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteAccountWithPassword(deletePass);
      if (!res.success) {
        setDeleteError(res.message || 'পাসওয়ার্ড ভুল হওয়ায় অ্যাকাউন্ট মোছা সম্ভব হয়নি।');
      } else {
        setIsDeleteModalOpen(false);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyReason.trim()) return;
    setIsVerificationSubmitted(true);
  };

  const renderSocialIcon = (platform: SocialMediaLink['platform']) => {
    switch (platform) {
      case 'facebook':
        return (
          <span className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/30">
            f
          </span>
        );
      case 'instagram':
        return (
          <span className="w-8 h-8 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center font-bold text-xs border border-pink-500/30">
            IG
          </span>
        );
      case 'tiktok':
        return (
          <span className="w-8 h-8 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold text-xs border border-cyan-500/30">
            TT
          </span>
        );
      case 'youtube':
        return (
          <span className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-xs border border-red-500/30">
            YT
          </span>
        );
      default:
        return (
          <span className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center border border-zinc-700">
            <Globe className="w-4 h-4" />
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 w-full animate-in fade-in pb-16 font-['Hind_Siliguri']">
      {/* 
        NO COVER PHOTO / BANNER (Item 11 strictly: NO profile cover photo / banner) 
        Clean header card with luxury cyberpunk accent
      */}
      <div className="relative rounded-3xl bg-zinc-950/80 border border-zinc-800/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {/* Avatar / Channel Logo with Download Button (Item 8) */}
            <div className="relative group">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-[#09090b] shadow-2xl ring-2 ring-cyan-500/40"
              />
              {currentUser.isVerified && (
                <span className="absolute bottom-1 right-1 p-1 rounded-full bg-cyan-500 text-black shadow-lg">
                  <CheckCircle className="w-5 h-5 fill-cyan-400 text-black" />
                </span>
              )}

              {/* Profile Photo Download Button (Item 8: everyone can download, no fake screenshot claim) */}
              <button
                type="button"
                onClick={handleDownloadProfilePhoto}
                title="প্রোফাইল ছবি ডাউনলোড করুন"
                className="absolute inset-0 bg-black/60 rounded-3xl opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1 text-white text-[10px] font-bold"
              >
                <Download className="w-5 h-5 text-cyan-400" />
                <span>ডাউনলোড</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight">
                  {currentUser.channelName || currentUser.displayName}
                </h1>
                {currentUser.isVerified && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    {t('verified')}
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-400 mt-0.5">
                <span>{currentUser.displayName}</span> • <span className="text-cyan-400">@{currentUser.username}</span> • <span className="text-zinc-500">{currentUser.email}</span>
              </p>

              {currentUser.bio ? (
                <p className="text-xs text-zinc-300 max-w-md mt-2 font-['Hind_Siliguri'] leading-relaxed">
                  {currentUser.bio}
                </p>
              ) : (
                <p className="text-xs text-zinc-500 italic mt-1">কোনো বায়ো দেওয়া হয়নি।</p>
              )}

              {/* Social Media Links display (Item 9) */}
              <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
                {(currentUser.socialLinks || []).length > 0 ? (
                  currentUser.socialLinks?.map((soc) => (
                    <a
                      key={soc.id}
                      href={soc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 text-xs text-zinc-300 hover:text-white transition group"
                    >
                      {renderSocialIcon(soc.platform)}
                      <span className="capitalize text-[11px] font-semibold">{soc.platform}</span>
                      <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-cyan-400" />
                    </a>
                  ))
                ) : (
                  <span className="text-[11px] text-zinc-500">কোনো সোশ্যাল মিডিয়া লিংক যুক্ত করা হয়নি</span>
                )}

                <button
                  onClick={() => setIsSocialModalOpen(true)}
                  className="px-2 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-[11px] text-cyan-400 font-bold border border-zinc-800 transition flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>লিংক যোগ</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-white transition shadow"
            >
              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('editProfile')}</span>
            </button>

            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-black text-xs hover:brightness-110 transition shadow-lg shadow-cyan-500/25"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t('upload')}</span>
            </button>
          </div>
        </div>

        {/* Public Statistics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 mt-6 border-t border-zinc-800/80">
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-center">
            <span className="block text-lg font-black text-white">{currentUser.followersCount.toLocaleString()}</span>
            <span className="text-[11px] font-medium text-zinc-400">{t('followers')}</span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-center">
            <span className="block text-lg font-black text-white">{currentUser.followingCount.toLocaleString()}</span>
            <span className="text-[11px] font-medium text-zinc-400">{t('followingCount')}</span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-center">
            <span className="block text-lg font-black text-cyan-400">{totalViews.toLocaleString()}</span>
            <span className="text-[11px] font-medium text-zinc-400">{t('views')}</span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-center">
            <span className="block text-lg font-black text-pink-500">{totalLikes.toLocaleString()}</span>
            <span className="text-[11px] font-medium text-zinc-400">{t('likes')}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-center">
            <span className="block text-lg font-black text-white">{totalShares.toLocaleString()}</span>
            <span className="text-[11px] font-medium text-zinc-400">{t('shares')}</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar: Videos, Analytics, Device Management, Security, Verification */}
      <div className="flex flex-wrap items-center gap-2 pb-4">
        <button
          onClick={() => setActiveTab('videos')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
            activeTab === 'videos'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>প্রকাশিত ভিডিও ({myVideos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
            activeTab === 'analytics'
              ? 'bg-pink-500/20 text-pink-300 border-pink-500/50'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>ক্রিয়েটর অ্যানালিটিক্স</span>
        </button>

        {/* Creator Income & Monetization Tab (User Request 10) */}
        <button
          onClick={() => setActiveTab('monetization')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
            activeTab === 'monetization'
              ? 'bg-gradient-to-r from-cyan-500/25 to-pink-500/25 text-white border-pink-500/60 shadow-lg shadow-pink-500/15'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          <Wallet className="w-3.5 h-3.5 text-pink-400" />
          <span>আয় ও মনিটাইজেশন</span>
          {creatorMonetizationStatus === 'monetized' ? (
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
              সক্রিয়
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">
              ৳
            </span>
          )}
        </button>

        {/* Device Management Tab (Item 5) */}
        <button
          onClick={() => setActiveTab('devices')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
            activeTab === 'devices'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>ডিভাইস ও সেশন ({deviceSessions.length})</span>
        </button>

        {/* Security & Password Tab (Item 3 & 7) */}
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
            activeTab === 'security'
              ? 'bg-pink-500/20 text-pink-300 border-pink-500/50'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>নিরাপত্তা সেটিংস</span>
        </button>

        <button
          onClick={() => setActiveTab('verification')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
            activeTab === 'verification'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>ভেরিফিকেশন আবেদন</span>
        </button>
      </div>

      {/* Tab 1: Videos Grid (Strictly NO featured video per item 10) */}
      {activeTab === 'videos' && (
        <div className="mt-3">
          {myVideos.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-xs">
              <Film className="w-10 h-10 mx-auto text-zinc-600 mb-2 opacity-50" />
              <p className="mb-3">আপনি এখনো কোনো ভিডিও আপলোড করেননি।</p>
              <button
                onClick={onOpenUpload}
                className="px-4 py-2 rounded-xl bg-cyan-400 text-black font-bold text-xs"
              >
                {t('upload')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {myVideos.map((vid) => (
                <div 
                  key={vid.id}
                  className="relative group rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 aspect-[9/16] shadow-lg flex flex-col justify-end p-3"
                >
                  <img
                    src={vid.thumbnailUrl}
                    alt={vid.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                  <div className="absolute top-2.5 left-2.5 z-10">
                    {vid.visibility === 'private' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/90 text-white shadow">
                        <Lock className="w-3 h-3" />
                        Private
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/90 text-black shadow">
                        Public
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition flex gap-1">
                    <button
                      onClick={() => updateVideoVisibility(vid.id, vid.visibility === 'public' ? 'private' : 'public')}
                      className="p-1.5 rounded-lg bg-black/80 hover:bg-black text-cyan-300"
                      title={t('changeVisibility')}
                    >
                      {vid.visibility === 'public' ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(t('deleteVideoConfirm'))) {
                          deleteVideo(vid.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-black/80 hover:bg-rose-900 text-rose-400"
                      title={t('deleteVideo')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="relative z-10">
                    <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight drop-shadow">
                      {vid.title}
                    </h4>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-300 mt-1">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-cyan-400" />
                        {vid.viewsCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-pink-400" />
                        {vid.likesCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Creator Analytics */}
      {activeTab === 'analytics' && (
        <div className="mt-3 space-y-4">
          <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>ভিডিও পারফরম্যান্স ওভারভিউ</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              গত ৩০ দিনে আপনার সামগ্রিক দর্শক ও এনগেজমেন্ট চিত্র।
            </p>

            <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-zinc-800">
              {[40, 65, 30, 85, 95, 70, 110, 130, 90, 140, 160, 190].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div 
                    className="w-full bg-gradient-to-t from-cyan-500/80 to-pink-500 rounded-t-lg transition duration-300 group-hover:brightness-125"
                    style={{ height: `${(val / 200) * 100}%` }}
                  />
                  <span className="text-[9px] text-zinc-500">{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-2">
              <span>Day 1</span>
              <span>Day 15</span>
              <span>Day 30</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Creator Income & Monetization (User Request 10) */}
      {activeTab === 'monetization' && (
        <div className="mt-3 space-y-6">
          {/* Feedback banner */}
          {monetizationFeedback && (
            <div className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold shadow-lg animate-in fade-in ${
              monetizationFeedback.isError 
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
            }`}>
              <div className="flex items-center gap-2">
                {monetizationFeedback.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                <span>{monetizationFeedback.text}</span>
              </div>
              <button onClick={() => setMonetizationFeedback(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Status & Eligibility Banner */}
          <div className="relative p-6 rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-500/10 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    creatorMonetizationStatus === 'monetized' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    creatorMonetizationStatus === 'pending_review' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    creatorMonetizationStatus === 'rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    creatorMonetizationStatus === 'suspended' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  }`}>
                    {creatorMonetizationStatus === 'monetized' ? '✓ মনিটাইজেশন সক্রিয় (Monetized)' :
                     creatorMonetizationStatus === 'pending_review' ? '⏳ আবেদন পর্যালোচনাধীন (Under Review)' :
                     creatorMonetizationStatus === 'rejected' ? '✕ আবেদন প্রত্যাখ্যাত' :
                     creatorMonetizationStatus === 'suspended' ? '⚠ মনিটাইজেশন স্থগিত' :
                     'যোগ্যতা যাচাই চলছে (Eligibility Progress)'}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    স্থায়ী রেট: ৳{monetizationConfig.ratePer1000Views}/১,০০০ ভিউ • ৳{monetizationConfig.ratePerWatchHour}/১ ঘণ্টা
                  </span>
                </div>

                <h2 className="text-2xl font-black text-white font-['Plus_Jakarta_Sans']">
                  বাশারটিউব ক্রিয়েটর মনিটাইজেশন ও আর্নিংস
                </h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                  {creatorMonetizationStatus === 'monetized'
                    ? 'আপনার চ্যানেলে মনিটাইজেশন সক্রিয় রয়েছে। আপনার প্রতিটি ভ্যালিড ভিউ ও ওয়াচ টাইম থেকে অর্জিত টাকা সরাসরি ব্যালেন্সে জমা হচ্ছে।'
                    : 'যোগ্যতা পূরণ হলে আবেদন করুন। সুপার অ্যাডমিন চ্যানেল যাচাই করে অনুমোদন করবেন। অরিজিনাল কন্টেন্ট বাধ্যতামূলক।'}
                </p>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-3 shrink-0">
                {creatorMonetizationStatus === 'monetized' && (
                  <button
                    onClick={() => setIsWithdrawModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-cyan-400 text-black font-black text-xs hover:brightness-110 active:scale-95 transition shadow-lg shadow-pink-500/20"
                  >
                    <Wallet className="w-4 h-4 stroke-[2.5]" />
                    <span>বিকাশে টাকা তুলুন (ক্যাশআউট)</span>
                  </button>
                )}

                {(creatorMonetizationStatus === 'not_eligible' || creatorMonetizationStatus === 'eligible' || creatorMonetizationStatus === 'rejected') && (
                  <button
                    onClick={() => {
                      if (eligibilityMetrics.isEligible) {
                        setIsApplyModalOpen(true);
                      } else {
                        alert(`মনিটাইজেশনের জন্য কমপক্ষে ${(eligibilityMetrics.targetViews / 10000000).toFixed(0)} কোটি ভিউ, ${eligibilityMetrics.targetWatchHours.toLocaleString()} ঘণ্টা ওয়াচ টাইম এবং ${eligibilityMetrics.targetFollowers.toLocaleString()} ফলোয়ার প্রয়োজন। আপনার বর্তমান অগ্রগতি নিচে দেখুন।`);
                      }
                    }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs transition shadow-lg ${
                      eligibilityMetrics.isEligible
                        ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-black hover:brightness-110 shadow-cyan-500/25 animate-pulse'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                    <span>{eligibilityMetrics.isEligible ? 'মনিটাইজেশন আবেদন করুন' : 'শর্ত পূরণের অগ্রগতি'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Rejection Notice if rejected */}
            {creatorMonetizationStatus === 'rejected' && currentUser.monetizationRejectionReason && (
              <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold block">প্রত্যাখ্যানের কারণ:</span>
                  <span>{currentUser.monetizationRejectionReason}</span>
                </div>
                <button
                  onClick={() => setIsApplyModalOpen(true)}
                  className="px-3 py-1 rounded-xl bg-rose-500 text-black font-black text-[11px] shrink-0"
                >
                  পুনরায় আবেদন
                </button>
              </div>
            )}
          </div>

          {/* 1. Monetization Eligibility Requirements Progress Bar Component */}
          <div className="p-6 rounded-3xl bg-zinc-950/80 border border-zinc-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>মনিটাইজেশন মাইলফলক ও প্রগ্রেস ট্র্যাকার (Monetization Eligibility Milestones)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  গত ১২ মাসে নিচের ৩টি শর্ত পূরণ করতে হবে এবং অরিজিনাল কন্টেন্ট নিশ্চিত করতে হবে:
                </p>
              </div>

              {/* Overall Progress Meter */}
              <div className="flex items-center gap-3 self-start sm:self-center bg-zinc-900/90 border border-zinc-800 px-3.5 py-2 rounded-2xl">
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block font-bold">সামগ্রিক যোগ্যতা</span>
                  <span className={`text-xs font-black font-mono ${eligibilityMetrics.isEligible ? 'text-emerald-400' : 'text-cyan-400'}`}>
                    {Math.min(100, Math.round((eligibilityMetrics.viewsProgress + eligibilityMetrics.watchHoursProgress + eligibilityMetrics.followersProgress) / 3))}% পূর্ণ
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center font-mono font-black text-xs text-white">
                  {eligibilityMetrics.isEligible ? '✓' : `${Math.min(100, Math.round((eligibilityMetrics.viewsProgress + eligibilityMetrics.watchHoursProgress + eligibilityMetrics.followersProgress) / 3))}%`}
                </div>
              </div>
            </div>

            {/* Three Visual Progress Bar Components with Milestone Markers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Criterion 1: Views Progress Bar */}
              <MonetizationProgressBar
                label="ভ্যালিড ভিডিও ভিউ"
                subtitle="গত ১২ মাসে রিয়েল ভ্যালিড ভিউ"
                current={currentUser.validViewsCount || totalViews}
                target={eligibilityMetrics.targetViews}
                unit="ভিউ"
                themeColor="cyan"
                icon={<Eye className="w-4 h-4 text-cyan-400" />}
                milestones={[25, 50, 75, 100]}
              />

              {/* Criterion 2: Watch Hours Progress Bar */}
              <MonetizationProgressBar
                label="ভ্যালিড ওয়াচ টাইম"
                subtitle="গত ১২ মাসে রিয়েল ওয়াচ আওয়ার"
                current={currentUser.validWatchTimeHours || 0}
                target={eligibilityMetrics.targetWatchHours}
                unit="ঘণ্টা"
                themeColor="pink"
                icon={<Clock className="w-4 h-4 text-pink-400" />}
                milestones={[25, 50, 75, 100]}
              />

              {/* Criterion 3: Followers Progress Bar */}
              <MonetizationProgressBar
                label="চ্যানেল ফলোয়ার"
                subtitle="অর্গানিক ও রিয়েল ফলোয়ার"
                current={currentUser.followersCount || 0}
                target={eligibilityMetrics.targetFollowers}
                unit="ফলোয়ার"
                themeColor="emerald"
                icon={<User className="w-4 h-4 text-emerald-400" />}
                milestones={[25, 50, 75, 100]}
              />
            </div>

            {/* Original content badge */}
            <div className="mt-4 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>অরিজিনাল ও নিজস্ব কন্টেন্ট নীতিমালা: অন্যের কপি করা বা পুনঃআপলোডকৃত ভিডিও থেকে মনিটাইজেশন গ্রহণযোগ্য নয়।</span>
              </div>
              <span className="text-emerald-400 font-bold shrink-0">বাধ্যতামূলক</span>
            </div>
          </div>

          {/* 2. Creator Earnings Analytics Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-zinc-950/80 border border-cyan-500/30 shadow-lg">
              <span className="text-xs font-bold text-zinc-400">উত্তোলনযোগ্য ব্যালেন্স (Available Balance)</span>
              <p className="text-3xl font-black text-cyan-400 mt-2 font-['Plus_Jakarta_Sans']">
                ৳{(currentUser.availableBalance || 0).toLocaleString()}
              </p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800">
                <span className="text-[10px] text-zinc-400">সর্বনিম্ন উত্তোলন: ৳{monetizationConfig.minWithdrawalAmount.toLocaleString()}</span>
                <button
                  onClick={() => setIsWithdrawModalOpen(true)}
                  disabled={(currentUser.availableBalance || 0) < monetizationConfig.minWithdrawalAmount}
                  className="px-2.5 py-1 rounded-lg bg-pink-500 hover:bg-pink-400 disabled:opacity-40 disabled:pointer-events-none text-black font-black text-[10px] transition"
                >
                  ক্যাশআউট
                </button>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-zinc-950/80 border border-zinc-800">
              <span className="text-xs font-bold text-zinc-400">মোট অর্জিত আয় (Lifetime Earnings)</span>
              <p className="text-3xl font-black text-white mt-2 font-['Plus_Jakarta_Sans']">
                ৳{(currentUser.lifetimeEarnings || 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-zinc-400 mt-1 block">ভিউ ও ওয়াচ টাইম সমন্বিত</span>
            </div>

            <div className="p-5 rounded-3xl bg-zinc-950/80 border border-zinc-800">
              <span className="text-xs font-bold text-zinc-400">প্রক্রিয়াকরণাধীন ক্যাশআউট</span>
              <p className="text-3xl font-black text-pink-400 mt-2 font-['Plus_Jakarta_Sans']">
                ৳{(currentUser.pendingWithdrawalBalance || 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-zinc-400 mt-1 block">বিকাশ ট্রান্সফারের অপেক্ষায়</span>
            </div>

            <div className="p-5 rounded-3xl bg-zinc-950/80 border border-zinc-800">
              <span className="text-xs font-bold text-zinc-400">মোট উত্তোলিত আয় (Total Withdrawn)</span>
              <p className="text-3xl font-black text-emerald-400 mt-2 font-['Plus_Jakarta_Sans']">
                ৳{(currentUser.totalWithdrawnBalance || 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-zinc-400 mt-1 block">বিকাশে সফলভাবে প্রাপ্ত</span>
            </div>
          </div>

          {/* 3. Detailed Rates & Income Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>ভিডিও ভিউ আর্নিংস (৳১০ প্রতি ১,০০০ ভিউ)</span>
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  ৳{((currentUser.validViewsCount || 0) * 0.01).toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-zinc-400">
                মোট ভ্যালিড ভিউ: <strong className="text-white font-mono">{(currentUser.validViewsCount || 0).toLocaleString()}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-950 text-[11px] text-zinc-400">
                প্রতি ১টি ভিউ = ৳০.০১ পয়সা। অটোমেটিক হিসাব হয়ে প্রতিদিনের শেষে ব্যালেন্সে জমা হয়।
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-pink-400" />
                  <span>ওয়াচ টাইম আর্নিংস (৳১ প্রতি ১ ঘণ্টা)</span>
                </span>
                <span className="text-xs font-mono font-bold text-pink-400">
                  ৳{(currentUser.validWatchTimeHours || 0).toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-zinc-400">
                মোট ভ্যালিড ওয়াচ টাইম: <strong className="text-white font-mono">{(currentUser.validWatchTimeHours || 0).toFixed(1)} ঘণ্টা</strong>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-950 text-[11px] text-zinc-400">
                প্রতি ১ ঘণ্টা রিয়েল প্লেব্যাক = ৳১.০০ টাকা। বট ও ফেক লুপ ওয়াচ টাইম বাতিল হয়ে যায়।
              </div>
            </div>
          </div>

          {/* 4. Visual Income Analytics Chart */}
          <div className="p-6 rounded-3xl bg-zinc-950/80 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>দৈনিক আয় অ্যানালিটিক্স চিত্র (Daily Earnings Trend)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  ভিউ ও ওয়াচ টাইম থেকে অর্জিত প্রতিদিনের স্বয়ংক্রিয় আয়ের চিত্র (৳)
                </p>
              </div>
              <span className="text-xs text-zinc-400 font-mono">গত ১৪ দিন</span>
            </div>

            <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-zinc-800">
              {[120, 240, 180, 420, 310, 520, 680, 490, 750, 620, 890, 780, 940, 1150].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div 
                    className="w-full bg-gradient-to-t from-pink-500 via-cyan-500 to-sky-400 rounded-t-lg transition duration-300 group-hover:brightness-125"
                    style={{ height: `${(val / 1200) * 100}%` }}
                    title={`Day ${i + 1}: ৳${val}`}
                  />
                  <span className="text-[9px] text-zinc-500 font-mono">{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-2 font-mono">
              <span>Day 1</span>
              <span>Day 7</span>
              <span>Day 14</span>
            </div>
          </div>

          {/* 5. Per-Video Earnings Table */}
          <div className="p-6 rounded-3xl bg-zinc-950/80 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-cyan-400" />
              <span>ভিডিওভিত্তিক আয় বিশ্লেষণ (Per Video Earnings)</span>
            </h3>

            {myVideos.length === 0 ? (
              <p className="text-xs text-zinc-500">এখনো কোনো ভিডিও আপলোড করা হয়নি।</p>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="py-2.5 px-3">ভিডিও</th>
                      <th className="py-2.5 px-3">ভ্যালিড ভিউ</th>
                      <th className="py-2.5 px-3">ওয়াচ টাইম</th>
                      <th className="py-2.5 px-3">ভিউ থেকে আয়</th>
                      <th className="py-2.5 px-3">ওয়াচ টাইম আয়</th>
                      <th className="py-2.5 px-3 text-right">মোট আয়</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-mono text-[11px]">
                    {myVideos.map(vid => {
                      const vViews = vid.validViewsCount || vid.viewsCount || 0;
                      const vHours = vid.validWatchTimeHours || Number(((vViews * 45) / 3600).toFixed(2));
                      const vEarn = (vViews * 0.01);
                      const wEarn = (vHours * 1.0);
                      const totalEarn = vEarn + wEarn;
                      return (
                        <tr key={vid.id} className="hover:bg-zinc-900/40">
                          <td className="py-2.5 px-3 font-sans font-bold text-white max-w-xs truncate">
                            {vid.title}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-300">{vViews.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-zinc-300">{vHours.toFixed(1)} ঘণ্টা</td>
                          <td className="py-2.5 px-3 text-cyan-400">৳{vEarn.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-pink-400">৳{wEarn.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-400">৳{totalEarn.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 6. bKash Withdrawal & Settings Card */}
          <div className="p-6 rounded-3xl bg-zinc-950/80 border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-pink-400" />
                  <span>বিকাশ উইথড্রয়াল সেটিংস (bKash Cashout Setup)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  শুধুমাত্র বিকাশ (bKash)-এর মাধ্যমে টাকা তুলতে পারবেন। সর্বনিম্ন উত্তোলন ৳১০,০০০ টাকা।
                </p>
              </div>

              <button
                onClick={() => setIsWithdrawModalOpen(true)}
                disabled={(currentUser.availableBalance || 0) < 10000}
                className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-40 disabled:pointer-events-none text-black font-black text-xs transition shadow-lg shadow-pink-500/20"
              >
                ক্যাশআউট রিকোয়েস্ট পাঠান
              </button>
            </div>

            {/* Linked bKash number form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              const res = await saveBKashSettings(bKashNum, bKashType);
              setMonetizationFeedback({ text: res.message || 'বিকাশ নম্বর সংরক্ষিত হয়েছে!', isError: !res.success });
            }} className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">বিকাশ মোবাইল নম্বর</label>
                <input
                  type="tel"
                  required
                  value={bKashNum}
                  onChange={(e) => setBKashNum(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">অ্যাকাউন্টের ধরন</label>
                <select
                  value={bKashType}
                  onChange={(e) => setBKashType(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500"
                >
                  <option value="personal">পার্সোনাল (Personal)</option>
                  <option value="agent">এজেন্ট (Agent)</option>
                  <option value="merchant">মার্চেন্ট (Merchant)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition border border-zinc-700"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>

            {/* Withdrawal History Table */}
            <div>
              <h4 className="text-xs font-bold text-zinc-400 mb-2">ক্যাশআউট রিকোয়েস্ট হিস্ট্রি</h4>
              {creatorWithdrawals.length === 0 ? (
                <p className="text-xs text-zinc-500">এখনো কোনো ক্যাশআউট রিকোয়েস্ট নেই।</p>
              ) : (
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left text-xs font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="py-2 px-3">তারিখ</th>
                        <th className="py-2 px-3">পরিমাণ</th>
                        <th className="py-2 px-3">বিকাশ নম্বর</th>
                        <th className="py-2 px-3">স্ট্যাটাস</th>
                        <th className="py-2 px-3">bKash TrxID / নোট</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {creatorWithdrawals.map(w => (
                        <tr key={w.id}>
                          <td className="py-2.5 px-3 text-zinc-400">{new Date(w.requestedAt).toLocaleDateString()}</td>
                          <td className="py-2.5 px-3 text-pink-400 font-bold">৳{w.amount.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-white">{w.bKashNumber} ({w.bKashAccountType})</td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              w.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                              w.status === 'rejected' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {w.status === 'approved' ? 'পরিশোধিত' : w.status === 'rejected' ? 'প্রত্যাখ্যাত' : 'অপেক্ষমান'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400">
                            {w.bKashTrxId ? (
                              <span className="text-emerald-400 font-bold">{w.bKashTrxId}</span>
                            ) : w.rejectionReason ? (
                              <span className="text-rose-400">{w.rejectionReason}</span>
                            ) : (
                              'সুপার অ্যাডমিন পর্যালোচনায়'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* 7. Complete Income Transactions History */}
          <div className="p-6 rounded-3xl bg-zinc-950/80 border border-zinc-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-cyan-400" />
              <span>আয়ের সম্পূর্ণ লেনদেন ইতিহাস (Income Transactions)</span>
            </h3>

            {creatorTransactions.length === 0 ? (
              <p className="text-xs text-zinc-500">এখনো কোনো আয়ের রেকর্ড নেই। ভিউ এবং ওয়াচ টাইম থেকে আয় শুরু হলে এখানে স্বয়ংক্রিয়ভাবে জমা হবে।</p>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="py-2 px-3">তারিখ ও সময়</th>
                      <th className="py-2 px-3">ধরণ</th>
                      <th className="py-2 px-3">পরিমাণ</th>
                      <th className="py-2 px-3 font-sans">বিবরণ / ভিডিও</th>
                      <th className="py-2 px-3">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {creatorTransactions.map(tx => (
                      <tr key={tx.id}>
                        <td className="py-2.5 px-3 text-zinc-400">{new Date(tx.timestamp).toLocaleString()}</td>
                        <td className="py-2.5 px-3 font-sans">
                          {tx.type === 'views_income' && <span className="text-cyan-400 font-bold">ভিডিও ভিউ</span>}
                          {tx.type === 'watch_time_income' && <span className="text-pink-400 font-bold">ওয়াচ টাইম</span>}
                          {tx.type === 'withdrawal' && <span className="text-rose-400 font-bold">ক্যাশআউট</span>}
                        </td>
                        <td className={`py-2.5 px-3 font-bold ${tx.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {tx.amount < 0 ? '-' : '+'}৳{Math.abs(tx.amount).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-zinc-300 max-w-xs truncate">{tx.videoTitle || tx.note || tx.rateApplied}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-sans font-bold">সম্পন্ন</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Device Management (Item 4 & 5) */}
      {activeTab === 'devices' && (
        <div className="mt-3 space-y-4">
          <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>অ্যাক্টিভ ডিভাইস ও সেশন ম্যানেজমেন্ট (Active Sessions)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  আপনার অ্যাকাউন্টে লগইন থাকা ডিভাইসগুলো দেখুন এবং দূর থেকে যেকোনো সেশন লগআউট করুন।
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {deviceSessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 rounded-2xl border transition flex items-center justify-between ${
                    session.isCurrent
                      ? 'bg-cyan-500/5 border-cyan-500/30'
                      : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 text-cyan-400">
                      {session.deviceType === 'desktop' ? <Laptop className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{session.deviceName}</span>
                        {session.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-black text-[9px] font-black">
                            বর্তমান ডিভাইস (This Device)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                        <span>{session.browser} ({session.os})</span>
                        <span>•</span>
                        <span>আইপি: {session.ipAddress || session.ip}</span>
                        <span>•</span>
                        <span>লগইন: {new Date(session.loginAt || session.lastActive || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <button
                      onClick={() => invalidateSessionWithToken(session.id)}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>লগআউট (Logout)</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <p className="text-[11px] text-zinc-500 mt-4">
              * নোট: বাশারটিউবে নতুন ডিভাইসে লগইন করার ক্ষেত্রে কোনো বিরক্তিকর নোটিফিকেশন পাঠানো হয় না।
            </p>
          </div>
        </div>
      )}

      {/* Tab 4: Security Settings (Item 3 & 7) */}
      {activeTab === 'security' && (
        <div className="mt-3 space-y-4">
          {/* Security Question Section */}
          <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  <span>নিরাপত্তা প্রশ্ন ও উত্তর (Security Question & Answer)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  পাসওয়ার্ড পুনরুদ্ধারের জন্য সেট করা আপনার নিজস্ব প্রশ্ন ও উত্তর।
                </p>
              </div>

              <button
                onClick={() => {
                  setIsSecurityQModalOpen(true);
                  setNewQuestionText(currentUser.securityQuestion || 'আপনার প্রথম স্কুলের নাম কী?');
                  setQError(null);
                  setQSuccess(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/20 text-xs font-bold transition"
              >
                প্রশ্ন পরিবর্তন করুন
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">
                বর্তমান প্রশ্ন
              </span>
              <p className="text-xs font-bold text-white">
                {currentUser.securityQuestion || 'নিরাপত্তা প্রশ্ন সেট করা নেই'}
              </p>
            </div>
          </div>

          {/* Permanent Account Deletion Section (Item 6 & 7: Strictly NO temporary deactivation; only permanent deletion with password) */}
          <div className="p-5 rounded-3xl bg-rose-950/20 border border-rose-500/30">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-1.5 mb-1">
              <Trash2 className="w-4 h-4" />
              <span>স্থায়ী অ্যাকাউন্ট মোছা (Permanent Account Deletion)</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              বাশারটিউবে কোনো সাময়িক ডিঅ্যাক্টিভেশন ব্যবস্থা নেই। অ্যাকাউন্ট একবার মুছে ফেললে আপনার সমস্ত ভিডিও, চ্যাট ও ডেটা স্থায়ীভাবে মুছে যাবে।
            </p>

            <button
              onClick={() => {
                setIsDeleteModalOpen(true);
                setDeletePass('');
                setDeleteError(null);
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>পাসওয়ার্ড যাচাই করে অ্যাকাউন্ট স্থায়ীভাবে মুছুন</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Verification Application Form */}
      {activeTab === 'verification' && (
        <div className="mt-3 p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 max-w-xl">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-cyan-400" />
            <span>ভেরিফিকেশন আবেদন</span>
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            বাশারটিউব ক্রিয়েটর ভেরিফিকেশন আবেদন সুপার অ্যাডমিন দ্বারা যাচাই ও স্থায়ীভাবে অনুমোদিত হবে।
          </p>

          {currentUser.isVerified ? (
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2 font-medium">
              <CheckCircle className="w-5 h-5 text-cyan-400 shrink-0" />
              <span>অভিনন্দন! আপনার চ্যানেলটি ইতোমধ্যে ভেরিফাইড।</span>
            </div>
          ) : isVerificationSubmitted ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>আপনার আবেদন সুপার অ্যাডমিনের কাছে সফলভাবে পাঠানো হয়েছে।</span>
            </div>
          ) : (
            <form onSubmit={handleSubmitVerification} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  ভেরিফিকেশনের বিবরণ *
                </label>
                <textarea
                  required
                  rows={3}
                  value={verifyReason}
                  onChange={(e) => setVerifyReason(e.target.value)}
                  placeholder="আপনি কেন বাশারটিউবের ভেরিফাইড ক্রিয়েটর ব্যাজ পাওয়ার যোগ্য..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white resize-none focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  সাপোর্টিং ডকুমেন্ট / পোর্টফোলিও লিংক
                </label>
                <input
                  type="url"
                  value={verifyDocUrl}
                  onChange={(e) => setVerifyDocUrl(e.target.value)}
                  placeholder="https://portfolio..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-black text-xs hover:brightness-110 shadow-lg shadow-cyan-500/25 transition"
              >
                আবেদন জমা দিন
              </button>
            </form>
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white">
                প্রোফাইল সম্পাদনা
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">পূর্ণ নাম</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">চ্যানেলের নাম</label>
                <input
                  type="text"
                  value={editChannelName}
                  onChange={(e) => setEditChannelName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">বায়ো (Bio)</label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              {/* Unique Handle Field (Item 8) */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5 text-cyan-400" />
                    <span>ইউনিক চ্যানেল হ্যান্ডেল (Unique @handle) *</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">গ্লোবালি অনন্য</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={editHandle}
                    onChange={(e) => handleHandleChange(e.target.value)}
                    placeholder="@your_unique_handle"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border text-xs text-white focus:outline-none transition font-mono ${
                      handleCollisionError 
                        ? 'border-rose-500/80 focus:border-rose-400' 
                        : 'border-zinc-800 focus:border-cyan-400'
                    }`}
                  />
                  {!handleCollisionError && editHandle.length >= 3 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 flex items-center gap-1 text-[11px] font-bold">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>উপলব্ধ</span>
                    </span>
                  )}
                </div>

                {handleCollisionError && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{handleCollisionError}</span>
                  </p>
                )}

                {handleSuggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-zinc-400">প্রস্তাবিত হ্যান্ডেল:</span>
                    {handleSuggestions.map(sug => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleHandleChange(sug)}
                        className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-cyan-500/20 text-cyan-400 text-[10px] font-mono border border-zinc-700 hover:border-cyan-500/40 transition"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">ওয়েবসাইট লিংক</label>
                <input
                  type="url"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Direct Channel Logo Upload (Item 8: No URL link needed) */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-pink-400" />
                    <span>চ্যানেল লোগো / প্রোফাইল ছবি আপলোড *</span>
                  </span>
                  <span className="text-[10px] text-zinc-500">ফাইল আপলোড (PNG/JPG/WEBP)</span>
                </label>

                <div className="flex items-center gap-4 p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-cyan-400/50 shadow-md shrink-0 bg-zinc-900 flex items-center justify-center">
                    {editAvatar ? (
                      <img src={editAvatar} alt="Logo Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-zinc-600" />
                    )}
                  </div>

                  <div className="flex-1">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold cursor-pointer transition border border-zinc-700 shadow-sm">
                      <Upload className="w-3.5 h-3.5 text-cyan-400" />
                      <span>ডিভাইস থেকে নতুন লোগো নির্বাচন করুন</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      কোনো লিংক দেওয়ার প্রয়োজন নেই, সরাসরি ফাইল সিলেক্ট করুন।
                    </p>
                  </div>
                </div>

                {logoFileError && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{logoFileError}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 text-xs text-zinc-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-cyan-400 text-black font-bold text-xs shadow-md"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Social Media Links Modal (Item 9) */}
      {isSocialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>সোশ্যাল মিডিয়া লিংক পরিচালনা</span>
              </h3>
              <button onClick={() => setIsSocialModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {socialError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{socialError}</span>
              </div>
            )}

            {/* List existing links */}
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {socialLinksList.map((link) => (
                <div key={link.id} className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    {renderSocialIcon(link.platform)}
                    <span className="font-semibold capitalize text-white">{link.platform}:</span>
                    <span className="truncate text-zinc-400 text-[11px]">{link.url}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveSocialLink(link.id)}
                    className="p-1 hover:text-rose-400 text-zinc-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new link form */}
            <form onSubmit={handleAddSocialLink} className="space-y-2.5 pt-2 border-t border-zinc-800">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="url"
                    required
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSocialModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 text-xs text-zinc-300"
                >
                  বন্ধ করুন
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-cyan-400 text-black font-bold text-xs shadow"
                >
                  লিংক যুক্ত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Security Question Modal (Item 3: Requires validating current password) */}
      {isSecurityQModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                <span>নিরাপত্তা প্রশ্ন ও উত্তর পরিবর্তন</span>
              </h3>
              <button onClick={() => setIsSecurityQModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {qError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{qError}</span>
              </div>
            )}

            {qSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{qSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangeSecurityQSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  বর্তমান অ্যাকাউন্টের পাসওয়ার্ড *
                </label>
                <input
                  type="password"
                  required
                  value={currentPassForQ}
                  onChange={(e) => setCurrentPassForQ(e.target.value)}
                  placeholder="বর্তমান পাসওয়ার্ড দিয়ে নিশ্চিত করুন"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  নতুন নিরাপত্তা প্রশ্ন *
                </label>
                <input
                  type="text"
                  required
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="আপনার নতুন নিরাপত্তা প্রশ্ন লিখুন"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  নতুন নিরাপত্তা উত্তর *
                </label>
                <input
                  type="text"
                  required
                  value={newAnswerText}
                  onChange={(e) => setNewAnswerText(e.target.value)}
                  placeholder="প্রশ্নের গোপন উত্তর দিন"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsSecurityQModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 text-xs text-zinc-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isQLoading}
                  className="px-4 py-1.5 rounded-xl bg-cyan-400 text-black font-bold text-xs shadow disabled:opacity-50"
                >
                  {isQLoading ? 'যাচাই হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal (Item 7: Permanent Account Deletion Security requiring Password) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-rose-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" />
                <span>স্থায়ী অ্যাকাউন্ট মোছার নিশ্চিতকরণ</span>
              </h3>
              <button onClick={() => setIsDeleteModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
              সতর্কতা: এটি একটি অপরিবর্তনীয় পদক্ষেপ। আপনার চ্যানেল, ভিডিও, সাবস্ক্রাইবার ও সমস্ত বার্তা চিরতরে মুছে যাবে। নিশ্চিত করতে আপনার বর্তমান পাসওয়ার্ড দিন:
            </p>

            {deleteError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <form onSubmit={handleDeleteAccountSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  বর্তমান পাসওয়ার্ড দিন *
                </label>
                <input
                  type="password"
                  required
                  value={deletePass}
                  onChange={(e) => setDeletePass(e.target.value)}
                  placeholder="আপনার পাসওয়ার্ড লিখুন"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-rose-500/30 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 text-xs text-zinc-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow disabled:opacity-50"
                >
                  {isDeleting ? 'মোছা হচ্ছে...' : 'চিরতরে অ্যাকাউন্ট মুছুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply for Monetization Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  ক্রিয়েটর মনিটাইজেশন আবেদন
                </h3>
              </div>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-1.5">
                <div className="flex justify-between">
                  <span>চ্যানেলের নাম:</span>
                  <strong className="text-white">{currentUser.channelName || currentUser.displayName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>চ্যানেল হ্যান্ডেল:</span>
                  <strong className="text-cyan-400 font-mono">@{currentUser.username}</strong>
                </div>
                <div className="flex justify-between">
                  <span>মোট ভিউ:</span>
                  <strong className="text-white font-mono">{(currentUser.validViewsCount || totalViews).toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span>মোট ওয়াচ টাইম:</span>
                  <strong className="text-white font-mono">{(currentUser.validWatchTimeHours || 0).toFixed(1)} ঘণ্টা</strong>
                </div>
                <div className="flex justify-between">
                  <span>মোট ফলোয়ার:</span>
                  <strong className="text-white font-mono">{(currentUser.followersCount || 0).toLocaleString()}</strong>
                </div>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!originalCertified) {
                  alert('অরিজিনাল কন্টেন্টের শর্তে সম্মতি প্রদান করতে হবে।');
                  return;
                }
                setIsApplying(true);
                const res = await applyForMonetization({
                  originalContentCertified: true,
                  note: applyNote.trim()
                });
                setIsApplying(false);
                setIsApplyModalOpen(false);
                setMonetizationFeedback({ text: res.message || 'আবেদন জমা হয়েছে!', isError: !res.success });
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    অতিরিক্ত নোট / বার্তা (ঐচ্ছিক)
                  </label>
                  <textarea
                    rows={2}
                    value={applyNote}
                    onChange={(e) => setApplyNote(e.target.value)}
                    placeholder="আপনার চ্যানেল কন্টেন্ট সম্পর্কে সংক্ষেপে কিছু লিখুন..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                {/* Mandatory Original Content Certification */}
                <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={originalCertified}
                    onChange={(e) => setOriginalCertified(e.target.checked)}
                    className="mt-0.5 accent-cyan-400 w-4 h-4 rounded"
                  />
                  <span className="text-xs text-zinc-300 leading-snug">
                    আমি প্রত্যয়ন করছি যে আমার চ্যানেলে আপলোডকৃত সমস্ত ভিডিও সম্পূর্ণ নিজস্ব, মৌলিক ও অরিজিনাল কন্টেন্ট। অন্যের কপি করা ভিডিও পাওয়া গেলে যেকোনো সময় মনিটাইজেশন বাতিল ও অ্যাকাউন্ট স্থগিত করা হতে পারে।
                  </span>
                </label>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsApplyModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isApplying || !originalCertified}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-black font-black text-xs hover:brightness-110 active:scale-95 transition shadow-lg shadow-cyan-500/25 disabled:opacity-50"
                  >
                    {isApplying ? 'জমা দেওয়া হচ্ছে...' : 'আবেদন নিশ্চিত করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* bKash Withdrawal Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-pink-400" />
                <h3 className="text-base font-bold text-white">
                  বিকাশ ক্যাশআউট রিকোয়েস্ট
                </h3>
              </div>
              <button onClick={() => setIsWithdrawModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">উত্তোলনযোগ্য ব্যালেন্স:</span>
                <strong className="text-cyan-400 font-mono text-sm">৳{(currentUser.availableBalance || 0).toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">সর্বনিম্ন ক্যাশআউট:</span>
                <span className="text-pink-400 font-mono">৳১০,০০০</span>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (withdrawAmount < 10000) {
                alert('সর্বনিম্ন উত্তোলনের পরিমাণ ৳১০,০০০ টাকা।');
                return;
              }
              if (withdrawAmount > (currentUser.availableBalance || 0)) {
                alert('পর্যাপ্ত ব্যালেন্স নেই।');
                return;
              }
              setIsWithdrawing(true);
              const res = await requestBKashWithdrawal(withdrawAmount, bKashNum, bKashType);
              setIsWithdrawing(false);
              setIsWithdrawModalOpen(false);
              setMonetizationFeedback({ text: res.message || 'ক্যাশআউট রিকোয়েস্ট সফল হয়েছে!', isError: !res.success });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  টাকার পরিমাণ (৳) — সর্বনিম্ন ১০,০০০
                </label>
                <input
                  type="number"
                  required
                  min={10000}
                  max={currentUser.availableBalance || 0}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-mono text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  বিকাশ মোবাইল নম্বর (১১ ডিজিট)
                </label>
                <input
                  type="tel"
                  required
                  value={bKashNum}
                  onChange={(e) => setBKashNum(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  অ্যাকাউন্টের ধরন
                </label>
                <select
                  value={bKashType}
                  onChange={(e) => setBKashType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500"
                >
                  <option value="personal">পার্সোনাল (Personal)</option>
                  <option value="agent">এজেন্ট (Agent)</option>
                  <option value="merchant">মার্চেন্ট (Merchant)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isWithdrawing || (currentUser.availableBalance || 0) < 10000}
                  className="px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-black font-black text-xs transition shadow-lg shadow-pink-500/25 disabled:opacity-40"
                >
                  {isWithdrawing ? 'অনুরোধ পাঠানো হচ্ছে...' : 'রিকোয়েস্ট নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
