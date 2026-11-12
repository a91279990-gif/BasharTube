import React, { useState, useRef } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Tv,
  Image as ImageIcon,
  ShieldCheck,
  Upload,
  ArrowRight,
  AtSign,
  Camera,
  Check,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { normalizeHandle, validateHandleFormat } from '../../utils/handleValidation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

const PRESET_LOGOS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
];

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose,
  defaultMode = 'login'
}) => {
  const { language } = useLanguage();
  const { 
    registerAccount, 
    loginWithCredentials, 
    loginWithGoogle, 
    getSecurityQuestionByEmail, 
    resetPasswordWithSecurityQuestion,
    checkHandleAvailability
  } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(defaultMode);
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign up fields: নাম, হ্যান্ডেল (@handle), লোগো, চ্যানেলের নাম, জিমেইল, পাসওয়ার্ড, সিকিউরিটি প্রশ্ন ও উত্তর
  const [fullName, setFullName] = useState('');
  const [channelName, setChannelName] = useState('');
  const [handle, setHandle] = useState('');
  const [isCustomHandle, setIsCustomHandle] = useState(false);
  const [handleStatus, setHandleStatus] = useState<{ available?: boolean; message?: string; suggestions?: string[] } | null>(null);
  const [channelLogo, setChannelLogo] = useState(PRESET_LOGOS[0]);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState('আপনার প্রথম স্কুলের নাম কী?');
  const [customQuestion, setCustomQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [retrievedQuestion, setRetrievedQuestion] = useState('');
  const [forgotAnswer, setForgotAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // Calculate password strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: '', color: 'bg-zinc-800' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 25, text: 'দুর্বল (Weak)', color: 'bg-rose-500' };
    if (score === 2) return { score: 50, text: 'মোটামুটি (Fair)', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, text: 'ভালো (Good)', color: 'bg-cyan-500' };
    return { score: 100, text: 'খুব শক্তিশালী (Very Strong)', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(mode === 'register' ? regPassword : newPassword);

  const PRESET_QUESTIONS = [
    'আপনার প্রথম স্কুলের নাম কী?',
    'আপনার প্রিয় শিক্ষকের নাম কী?',
    'আপনার প্রিয় শৈশবের বই কোনটি?',
    'আপনার জন্মস্থান বা প্রিয় শহরের নাম কী?',
    'আপনার প্রিয় পোষা প্রাণীর নাম কী?',
    'custom'
  ];

  // Process direct logo file from device (No link/URL needed)
  const handleProcessLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('অনুগ্রহ করে শুধুমাত্র ইমেজ ফাইল (PNG, JPG, WEBP) আপলোড করুন।');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('লোগো ফাইলের সাইজ সর্বোচ্চ ৫ মেগাবাইট (5MB) হতে পারে।');
      return;
    }

    setErrorMessage(null);
    setLogoFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setChannelLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessLogoFile(file);
    }
  };

  const handleLogoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessLogoFile(file);
    }
  };

  const handleLogoDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLogo(true);
  };

  const handleLogoDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLogo(false);
  };

  // Handle unique validation (Prefix with @ and prevent duplicates/copies)
  const handleHandleChange = (val: string) => {
    let clean = val.trim().toLowerCase();
    if (!clean.startsWith('@')) {
      clean = `@${clean.replace(/^@*/, '')}`;
    }
    setHandle(clean);
    setIsCustomHandle(true);

    if (clean.length <= 1) {
      setHandleStatus(null);
      return;
    }

    const check = checkHandleAvailability(clean);
    setHandleStatus(check);
  };

  const handleApplySuggestion = (sug: string) => {
    setHandle(sug);
    setIsCustomHandle(true);
    const check = checkHandleAvailability(sug);
    setHandleStatus(check);
  };

  const handleChannelNameChange = (val: string) => {
    setChannelName(val);
    if (!isCustomHandle) {
      const generated = normalizeHandle(`@${val.replace(/[^a-zA-Z0-9_]/g, '_')}`);
      if (generated && generated.length >= 4) {
        setHandle(generated);
        const check = checkHandleAvailability(generated);
        setHandleStatus(check);
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await loginWithCredentials(loginEmail, loginPassword);
      if (res.success) {
        setSuccessMessage('লগইন সফল হয়েছে! স্বাগতম বাশারটিউবে।');
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setErrorMessage(res.message || 'ভুল জিমেইল অথবা পাসওয়ার্ড।');
      }
    } catch {
      setErrorMessage('লগইন ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate Handle
    const finalHandle = handle.trim();
    const handleValidation = validateHandleFormat(finalHandle);
    if (!handleValidation.isValid) {
      setErrorMessage(handleValidation.error || 'হ্যান্ডেলের প্রথমে অবশ্যই @ থাকতে হবে এবং সঠিক ফরম্যাট হতে হবে।');
      return;
    }

    const check = checkHandleAvailability(finalHandle);
    if (!check.available) {
      setErrorMessage(check.message || 'এই হ্যান্ডেলটি ইতিমধ্যে অন্য একজন ব্যবহারকারী নিয়েছেন। সেম টু সেম কপি করা নিষিদ্ধ। অন্য একটি ইউনিক হ্যান্ডেল নির্বাচন করুন।');
      return;
    }

    if (regPassword !== confirmPassword) {
      setErrorMessage('উভয় পাসওয়ার্ড একই হতে হবে।');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    const finalQuestion = securityQuestion === 'custom' ? customQuestion.trim() : securityQuestion.trim();
    if (!finalQuestion) {
      setErrorMessage('অনুগ্রহ করে একটি নিরাপত্তা প্রশ্ন লিখুন।');
      return;
    }
    if (!securityAnswer.trim()) {
      setErrorMessage('অনুগ্রহ করে নিরাপত্তা প্রশ্নের উত্তর লিখুন।');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerAccount({
        fullName,
        channelName,
        handle: finalHandle,
        channelLogo,
        email: regEmail,
        password: regPassword,
        securityQuestion: finalQuestion,
        securityAnswer: securityAnswer.trim(),
      });

      if (res.success) {
        setSuccessMessage('আপনার নতুন চ্যানেল ও অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!');
        setTimeout(() => {
          onClose();
        }, 700);
      } else {
        setErrorMessage(res.message || 'অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchSecurityQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!forgotEmail.trim()) {
      setErrorMessage('অনুগ্রহ করে আপনার নিবন্ধিত জিমেইল দিন।');
      return;
    }

    const res = getSecurityQuestionByEmail(forgotEmail.trim());
    if (res.error || !res.question) {
      setErrorMessage(res.error || 'এই জিমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি।');
      return;
    }

    setRetrievedQuestion(res.question);
    setForgotStep(2);
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('উভয় নতুন পাসওয়ার্ড একই হতে হবে।');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    const res = resetPasswordWithSecurityQuestion(forgotEmail.trim(), forgotAnswer.trim(), newPassword);
    if (!res.success) {
      setErrorMessage(res.message || 'নিরাপত্তা উত্তর ভুল হয়েছে।');
      return;
    }

    setSuccessMessage('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে! নতুন পাসওয়ার্ড দিয়ে লগইন করুন।');
    setTimeout(() => {
      setLoginEmail(forgotEmail);
      setMode('login');
      setForgotStep(1);
      setForgotAnswer('');
      setNewPassword('');
      setConfirmNewPassword('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-900/95 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-pink-500 p-[2px] shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight">
              BasharTube <span className="text-cyan-400 text-xs font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 ml-1">Official</span>
            </h2>
            <p className="text-xs text-zinc-400 font-['Hind_Siliguri']">
              {mode === 'login' 
                ? 'আপনার অ্যাকাউন্টে লগইন করুন' 
                : mode === 'register' 
                  ? 'নতুন চ্যানেল ও অ্যাকাউন্ট খুলুন' 
                  : 'নিরাপত্তা প্রশ্নের মাধ্যমে পাসওয়ার্ড পুনরুদ্ধার'}
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs (only shown for login/register) */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950 rounded-2xl border border-zinc-800 mb-6 font-['Hind_Siliguri']">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black shadow-md shadow-cyan-500/25'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              লগইন (Sign In)
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-md shadow-pink-500/25'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              নতুন অ্যাকাউন্ট (Sign Up)
            </button>
          </div>
        )}

        {/* Alert Messages */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs mb-4 animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-['Hind_Siliguri']">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs mb-4 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-['Hind_Siliguri']">{successMessage}</span>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 font-['Hind_Siliguri']">
            {/* Gmail Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>জিমেইল (Gmail Address) *</span>
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="আপনার জিমেইল লিখুন (e.g. name@gmail.com)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition font-sans"
              />
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-pink-400" />
                  <span>পাসওয়ার্ড (Password) *</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setForgotEmail(loginEmail);
                    setForgotStep(1);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline transition"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="আপনার পাসওয়ার্ড দিন"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-pink-500 text-black font-black text-sm hover:brightness-110 active:scale-95 disabled:opacity-50 transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 mt-2"
            >
              <span>{isLoading ? 'যাচাই করা হচ্ছে...' : 'লগইন করুন'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Google Sign-in Alternative */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={loginWithGoogle}
                className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Google একাউন্ট দিয়ে সরাসরি লগইন</span>
              </button>
            </div>
          </form>
        )}

        {/* 2. SIGN UP / REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 font-['Hind_Siliguri'] max-h-[70vh] overflow-y-auto pr-1">
            {/* 1. নাম (Full Name) */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>আপনার পূর্ণ নাম (Full Name) *</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="যেমন: তানভীর আহমেদ"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition font-sans"
              />
            </div>

            {/* 2. চ্যানেলের নাম (Channel Name) */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-pink-400" />
                <span>চ্যানেলের নাম (Channel Name) *</span>
              </label>
              <input
                type="text"
                required
                value={channelName}
                onChange={(e) => handleChannelNameChange(e.target.value)}
                placeholder="যেমন: তানভীর ভ্লগস BD"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition font-sans"
              />
            </div>

            {/* 3. ইউনিক হ্যান্ডেল (@handle) - সেম টু সেম বা কপি করা যাবে না */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ইউনিক হ্যান্ডেল (Unique Handle - @handle) *</span>
                </label>
                <span className="text-[10px] text-zinc-400 font-mono">শুরুতে @ আবশ্যক</span>
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400 font-bold font-mono text-sm">
                  @
                </div>
                <input
                  type="text"
                  required
                  value={handle.startsWith('@') ? handle.slice(1) : handle}
                  onChange={(e) => handleHandleChange(`@${e.target.value}`)}
                  placeholder="আপনার_অনন্য_হ্যান্ডেল"
                  className={`w-full pl-8 pr-10 py-2 rounded-xl bg-zinc-950 border text-sm text-white placeholder:text-zinc-600 focus:outline-none transition font-mono ${
                    handleStatus
                      ? handleStatus.available
                        ? 'border-emerald-500/80 focus:border-emerald-400 bg-emerald-950/10'
                        : 'border-rose-500/80 focus:border-rose-400 bg-rose-950/10'
                      : 'border-zinc-800 focus:border-cyan-500'
                  }`}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {handleStatus && (
                    handleStatus.available ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )
                  )}
                </div>
              </div>

              {/* Real-time Handle Status Feedback */}
              {handleStatus && (
                <div className="mt-1.5 space-y-1">
                  <p className={`text-[11px] font-medium flex items-center gap-1.5 ${
                    handleStatus.available ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {handleStatus.available ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{handleStatus.message}</span>
                  </p>

                  {/* Smart Suggestions when taken */}
                  {handleStatus.suggestions && handleStatus.suggestions.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] text-zinc-400 block mb-1">অনন্য বিকল্প সাজেশন (ক্লিক করে বেছে নিন):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {handleStatus.suggestions.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => handleApplySuggestion(sug)}
                            className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-900 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:text-white transition font-mono"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <p className="text-[10px] text-zinc-500 mt-1">
                হ্যান্ডেলটি প্ল্যাটফর্মে আপনার চ্যানেলের পরিচয়। এটি সেম টু সেম কপি করা যাবে না।
              </p>
            </div>

            {/* 4. চ্যানেল লোগো সরাসরি আপলোড (Direct Device Upload - No Link Needed) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                  <span>চ্যানেল লোগো সরাসরি আপলোড *</span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  কোনো লিংক লাগবে না
                </span>
              </div>

              {/* Dedicated Drag & Drop / Direct Device File Upload Box */}
              <div
                onDrop={handleLogoDrop}
                onDragOver={handleLogoDragOver}
                onDragLeave={handleLogoDragLeave}
                className={`p-3.5 rounded-2xl border-2 border-dashed transition flex flex-col items-center justify-center text-center relative ${
                  isDraggingLogo 
                    ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01]' 
                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-4 w-full">
                  {/* Circular Avatar Preview with Cyberpunk Glow */}
                  <div className="relative group shrink-0">
                    <img
                      src={channelLogo}
                      alt="Channel Logo Preview"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-400 shadow-lg ring-4 ring-cyan-500/20"
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer text-white"
                      title="ছবি পরিবর্তন"
                    >
                      <Camera className="w-5 h-5 text-cyan-400" />
                    </div>
                  </div>

                  {/* Upload Controls & Instructions */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 text-black font-bold text-xs hover:brightness-110 transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                      >
                        <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>ডিভাইস থেকে ছবি আপলোড</span>
                      </button>

                      {logoFileName && (
                        <button
                          type="button"
                          onClick={() => {
                            setChannelLogo(PRESET_LOGOS[0]);
                            setLogoFileName(null);
                          }}
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition"
                          title="লোগো রিসেট করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400">
                      {logoFileName ? (
                        <span className="text-cyan-300 font-mono truncate block max-w-[200px]">✓ {logoFileName}</span>
                      ) : (
                        'ফাইল ড্রপ করুন অথবা ডিভাইস গ্যালারি থেকে সিলেক্ট করুন (PNG, JPG, WEBP)'
                      )}
                    </p>
                  </div>
                </div>

                {/* Hidden Native File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />

                {/* Preset Avatars Fallback Strip */}
                <div className="w-full pt-2.5 mt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500">অথবা ডিফল্ট লোগো বেছে নিন:</span>
                  <div className="flex items-center gap-1.5">
                    {PRESET_LOGOS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setChannelLogo(url); setLogoFileName(null); }}
                        className={`w-5 h-5 rounded-full overflow-hidden border transition shrink-0 ${
                          channelLogo === url ? 'border-cyan-400 scale-125 shadow-sm' : 'border-zinc-700 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt="preset" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Channel Preview Badge */}
            <div className="p-2.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 flex items-center gap-3">
              <img
                src={channelLogo}
                alt="preview"
                className="w-8 h-8 rounded-xl object-cover border border-cyan-500/50"
              />
              <div className="overflow-hidden">
                <span className="text-xs font-bold text-white truncate block">
                  {channelName || 'আপনার চ্যানেলের নাম'}
                </span>
                <span className="text-[10px] text-cyan-400 font-mono font-semibold block truncate">
                  {handle || '@আপনার_হ্যান্ডেল'}
                </span>
              </div>
            </div>

            {/* 4. জিমেইল (Gmail Address) */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>জিমেইল (Gmail Address) *</span>
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="আপনার নিজস্ব জিমেইল (যেমন: tanvir@gmail.com)"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition font-sans"
              />
            </div>

            {/* 5. পাসওয়ার্ড (Password) */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-pink-400" />
                  <span>পাসওয়ার্ড (Password) *</span>
                </span>
                {regPassword && (
                  <span className="text-[10px] font-bold text-zinc-400">{strength.text}</span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="অন্তত ৬ অক্ষরের শক্তিশালী পাসওয়ার্ড"
                  className="w-full px-3.5 py-2 pr-10 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {regPassword && (
                <div className="w-full h-1 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className={`h-full ${strength.color} transition-all duration-300`} 
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>পাসওয়ার্ড নিশ্চিত করুন *</span>
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="পুনরায় একই পাসওয়ার্ড দিন"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition font-sans"
              />
            </div>

            {/* 6. Security Question (Item 2) */}
            <div className="pt-1 border-t border-zinc-800/80">
              <label className="block text-xs font-semibold text-zinc-200 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>নিরাপত্তা প্রশ্ন (Security Question) *</span>
                </span>
                <span className="text-[10px] text-zinc-500">রিকভারির জন্য</span>
              </label>
              <select
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500 mb-2"
              >
                {PRESET_QUESTIONS.map((q, idx) => (
                  <option key={idx} value={q}>
                    {q === 'custom' ? '✏️ নিজের মতো প্রশ্ন লিখুন (Custom Question)' : q}
                  </option>
                ))}
              </select>

              {securityQuestion === 'custom' && (
                <input
                  type="text"
                  required
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="আপনার নিজের নিরাপত্তা প্রশ্নটি এখানে লিখুন"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-cyan-500/40 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition mb-2"
                />
              )}

              {/* 7. Security Answer */}
              <input
                type="text"
                required
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="নিরাপত্তা প্রশ্নের গোপন উত্তর লিখুন *"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition"
              />
              <p className="text-[10px] text-zinc-500 mt-1">পাসওয়ার্ড ভুলে গেলে এই প্রশ্নের উত্তর দিয়েই কেবল অ্যাকাউন্ট পুনরুদ্ধার করা যাবে।</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-cyan-400 text-white font-black text-sm hover:brightness-110 active:scale-95 disabled:opacity-50 transition shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 mt-3"
            >
              <span>{isLoading ? 'চ্যানেল তৈরি হচ্ছে...' : 'অ্যাকাউন্ট তৈরি ও চ্যানেলে প্রবেশ'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* 3. FORGOT PASSWORD RECOVERY FLOW (Item 2) */}
        {mode === 'forgot' && (
          <div className="font-['Hind_Siliguri']">
            {forgotStep === 1 ? (
              <form onSubmit={handleFetchSecurityQuestion} className="space-y-4">
                <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs">
                  আপনার নিবন্ধিত জিমেইল লিখুন। আপনার সেট করা নিরাপত্তা প্রশ্নটি প্রদর্শিত হবে।
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    <span>নিবন্ধিত জিমেইল (Registered Gmail) *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. name@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition font-sans"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setErrorMessage(null); }}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition"
                  >
                    ফিরে যান
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-black shadow-lg shadow-cyan-500/20 transition"
                  >
                    নিরাপত্তা প্রশ্ন দেখুন
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                <div className="p-3 rounded-2xl bg-zinc-950 border border-cyan-500/30">
                  <span className="text-[10px] text-cyan-400 uppercase font-black tracking-wider block mb-1">
                    নিরাপত্তা প্রশ্ন (Security Question)
                  </span>
                  <p className="text-sm font-bold text-white">{retrievedQuestion}</p>
                </div>

                {/* Answer */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    সঠিক উত্তর লিখুন (Security Answer) *
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotAnswer}
                    onChange={(e) => setForgotAnswer(e.target.value)}
                    placeholder="নিরাপত্তা প্রশ্নের উত্তর দিন"
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition font-sans"
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                    <span>নতুন পাসওয়ার্ড (New Password) *</span>
                    {newPassword && (
                      <span className="text-[10px] font-bold text-zinc-400">{strength.text}</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড"
                      className="w-full px-3.5 py-2 pr-10 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    নতুন পাসওয়ার্ড নিশ্চিত করুন *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="পুনরায় নতুন পাসওয়ার্ড দিন"
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition font-sans"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition"
                  >
                    আগের ধাপ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:brightness-110 text-black text-xs font-black shadow-lg shadow-emerald-500/20 transition"
                  >
                    পাসওয়ার্ড রিসেট করুন
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer Policy Note */}
        <p className="text-[11px] text-zinc-500 text-center mt-5 font-['Hind_Siliguri'] leading-tight">
          বাশারটিউবে কোনো 2FA প্রয়োজন নেই। জিমেইল ও পাসওয়ার্ড দিয়ে নিরাপদে চ্যানেল পরিচালনা করুন।
        </p>
      </div>
    </div>
  );
};

