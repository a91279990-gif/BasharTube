import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Film, 
  Lock, 
  Globe, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useVideo } from '../../context/VideoContext';
import { VideoVisibility } from '../../types';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth
}) => {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();
  const { uploadVideo } = useVideo();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Travel & Nature');
  const [visibility, setVisibility] = useState<VideoVisibility>('public');
  const [generateAiSubtitles, setGenerateAiSubtitles] = useState<boolean>(true);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-7 text-center animate-in zoom-in-95 font-['Hind_Siliguri'] shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 stroke-[2]" />
          </div>
          <h3 className="text-xl font-black text-white mb-2 font-['Plus_Jakarta_Sans']">
            লগইন আবশ্যক (Login Required)
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mb-6 leading-relaxed">
            বাশারটিউবে নতুন ভিডিও আপলোড করতে অনুগ্রহ করে আপনার চ্যানেলে লগইন করুন অথবা নাম, লোগো ও চ্যানেলের নাম দিয়ে নতুন অ্যাকাউন্ট খুলুন।
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-zinc-800 text-zinc-300 font-bold text-xs hover:bg-zinc-700 transition"
            >
              {t('cancel')}
            </button>
            <button
              onClick={() => { onClose(); onOpenAuth(); }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-cyan-400 text-white font-black text-xs hover:brightness-110 active:scale-95 transition shadow-lg shadow-pink-500/25"
            >
              লগইন / সাইন আপ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format (MP4 required per spec)
    if (!file.type.includes('mp4') && !file.name.toLowerCase().endsWith('.mp4')) {
      setErrorMessage(t('invalidFormatError'));
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Load video element to inspect duration and generate automatic canvas thumbnail
    const tempVideo = document.createElement('video');
    tempVideo.src = objectUrl;
    tempVideo.crossOrigin = 'anonymous';
    tempVideo.muted = true;

    tempVideo.onloadedmetadata = () => {
      const dur = Math.round(tempVideo.duration);
      setDuration(dur);

      // Validate duration (Max 10 minutes = 600 seconds)
      if (dur > 600) {
        setErrorMessage(t('maxDurationError'));
        setSelectedFile(null);
        setPreviewUrl('');
        return;
      }

      // Capture automatic thumbnail at 1 second
      tempVideo.currentTime = Math.min(1, dur / 2);
    };

    tempVideo.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 854;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          const thumb = canvas.toDataURL('image/jpeg', 0.8);
          setThumbnailUrl(thumb);
        }
      } catch (err) {
        console.warn("Canvas capture notice:", err);
      }
    };
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewUrl && !selectedFile) {
      setErrorMessage(t('selectFile'));
      return;
    }
    if (!title.trim()) {
      setErrorMessage(language === 'bn' ? 'ভিডিওর একটি আকর্ষণীয় শিরোনাম দিন।' : 'Please enter a video title.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setUploadStage(language === 'bn' ? 'ভিডিও ফাইল প্রসেসিং ও এনকোডিং...' : 'Encoding video format...');
    setErrorMessage(null);
    setSuccessMessage(null);

    // AI generated subtitles simulation if enabled
    const generatedSubtitles = generateAiSubtitles ? {
      bn: `00:01 ${title}\n00:15 বাশারটিউবে স্বাগতম! চমৎকার ভিডিওটি উপভোগ করুন।\n00:30 ভালো লাগলে লাইক ও শেয়ার করুন।`,
      en: `00:01 ${title}\n00:15 Welcome to BasharTube! Enjoy this high quality share.\n00:30 Follow for more updates.`
    } : undefined;

    try {
      await new Promise(r => setTimeout(r, 300));
      setUploadProgress(45);
      setUploadStage(language === 'bn' ? 'আল্ট্রা-এইচডি স্ট্রিমিং ও রেজোলিউশন অপ্টিমাইজেশন...' : 'HD stream optimization...');

      await new Promise(r => setTimeout(r, 350));
      setUploadProgress(78);
      setUploadStage(language === 'bn' ? 'থাম্বনেইল ও প্রিভিউ ফ্রেম প্রস্তুত হচ্ছে...' : 'Generating preview frames...');

      await new Promise(r => setTimeout(r, 350));
      setUploadProgress(95);
      setUploadStage(language === 'bn' ? 'ক্লাউড স্টোরেজে সফলভাবে সংরক্ষিত ও প্রকাশিত হচ্ছে...' : 'Finalizing upload...');

      await uploadVideo({
        authorId: currentUser.id,
        authorName: currentUser.displayName,
        authorUsername: currentUser.username,
        authorAvatar: currentUser.avatarUrl,
        isAuthorVerified: currentUser.isVerified,
        title: title.trim(),
        description: description.trim(),
        videoUrl: previewUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=1200&fit=crop',
        duration: duration || 45,
        category,
        visibility,
        commentsEnabled: true,
        musicTitle: 'Original Audio',
        musicArtist: currentUser.displayName,
        hasSubtitles: generateAiSubtitles,
        subtitles: generatedSubtitles,
        aiModerationStatus: 'approved',
        isKidsSafe: false
      });

      setUploadProgress(100);
      setUploadStage(language === 'bn' ? 'সম্পন্ন! ভিডিও সফলভাবে প্রকাশিত।' : 'Completed! Video published.');
      setSuccessMessage(t('uploadSuccess'));
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStage('');
        setSelectedFile(null);
        setPreviewUrl('');
        setThumbnailUrl('');
        setTitle('');
        setDescription('');
        onClose();
      }, 1000);
    } catch {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStage('');
      setErrorMessage('Upload error occurred. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl animate-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-pink-500 p-[2px]">
              <div className="w-full h-full bg-zinc-900 rounded-[10px] flex items-center justify-center text-cyan-400">
                <Film className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
                {t('uploadTitle')}
              </h2>
              <p className="text-[11px] text-zinc-400">{t('uploadSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Progress Bar when uploading */}
        {isUploading && (
          <div className="mt-4 p-4 rounded-2xl bg-zinc-950 border border-cyan-500/40 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-white flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>{uploadStage || (language === 'bn' ? 'ভিডিও আপলোড হচ্ছে...' : 'Uploading video...')}</span>
              </span>
              <span className="font-mono font-black text-cyan-400">{uploadProgress}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden p-[2px]">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-pink-500 transition-all duration-300 relative shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                style={{ width: `${uploadProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* Error / Success Banners */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="mt-5 space-y-4">
          {/* File Selector & Drag-Drop */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
              selectedFile ? 'border-cyan-500/60 bg-cyan-500/5' : 'border-zinc-700/80 hover:border-zinc-500 bg-zinc-950/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4"
              onChange={handleFileChange}
              className="hidden"
            />
            {previewUrl ? (
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-44 rounded-xl overflow-hidden bg-black border border-zinc-700 shadow-md mb-2">
                  <video src={previewUrl} className="w-full h-full object-cover" />
                </div>
                <p className="text-xs font-semibold text-cyan-400 truncate max-w-xs">{selectedFile?.name || 'Selected MP4'}</p>
                <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {duration}s (Max 600s)
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-cyan-400 mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-white mb-1">{t('dropVideoHere')}</p>
                <p className="text-xs text-zinc-500 mb-3">{t('uploadSubtitle')}</p>

                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
                    setSelectedFile(new File([''], 'bangladesh_tour.mp4', { type: 'video/mp4' }));
                    setTitle(language === 'bn' ? 'সুন্দরবনের নৈসর্গিক রূপ ও রয়েল বেঙ্গল টাইগার 🐅🌿' : 'Sundarbans Mangrove Sunset in 4K');
                    setDescription('#bangladesh #sundarbans #nature #travel #bashartube');
                    setDuration(64);
                    setThumbnailUrl('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=1200&fit=crop');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-zinc-700/80 hover:border-cyan-500/50 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'বাস্তব টেস্ট ক্লিপ নির্বাচন করুন (১-ক্লিক)' : 'Select Ready Sample Clip (1-Click)'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {t('videoTitleInput')} *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={language === 'bn' ? 'যেমন: সুন্দরবনের নৈসর্গিক রূপ...' : 'e.g., Hidden Gems of Sylhet...'}
              maxLength={200}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none transition"
            />
          </div>

          {/* Description & Hashtags */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {t('videoDescInput')}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="#bangladesh #travel #nature #bashartube"
              maxLength={1000}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none transition resize-none"
            />
          </div>

          {/* Category & Visibility Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {t('videoCategoryInput')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-medium text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="Travel & Nature">Travel & Nature (ভ্রমণ ও প্রকৃতি)</option>
                <option value="Food & Cooking">Food & Cooking (খাবার ও রেসিপি)</option>
                <option value="Technology & Science">Technology & Science (প্রযুক্তি)</option>
                <option value="Entertainment">Entertainment (বিনোদন)</option>
                <option value="Comedy & Funny">Comedy & Funny (কৌতুক)</option>
                <option value="Education & Learning">Education & Learning (শিক্ষা ও জ্ঞান)</option>
                <option value="Culture & Lifestyle">Culture & Lifestyle (সংস্কৃতি ও জীবনধারা)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {t('visibility')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition ${
                    visibility === 'public'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Public</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition ${
                    visibility === 'private'
                      ? 'bg-pink-500/20 text-pink-300 border-pink-500'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private</span>
                </button>
              </div>
            </div>
          </div>

          {/* AI Subtitles Checkbox */}
          <div className="pt-2 border-t border-zinc-800">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={generateAiSubtitles}
                onChange={(e) => setGenerateAiSubtitles(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500/50 bg-zinc-900 border-zinc-700"
              />
              <span className="text-xs text-zinc-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                {t('generateSubtitlesAi')}
              </span>
            </label>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isUploading || (!selectedFile && !previewUrl)}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition shadow-lg shadow-cyan-500/25"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('uploading')}</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>{t('upload')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
