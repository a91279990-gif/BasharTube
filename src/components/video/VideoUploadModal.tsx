import React, { useState, useRef, useEffect } from 'react';
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
  Loader2,
  Smartphone,
  MonitorPlay,
  Wand2,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useVideo } from '../../context/VideoContext';
import { VideoChapter, VideoFormat, VideoVisibility } from '../../types';
import { DEFAULT_PLATFORM_SETTINGS } from '../../data/mockData';
import {
  detectVideoFormat,
  formatVideoDuration,
  isValidRealVideoFile,
} from '../../utils/videoFormat';
import { analyzeVideoWithAi } from '../../utils/bashartubeAiClient';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

interface ExtractedVideoMeta {
  duration: number;
  width: number;
  height: number;
  format: VideoFormat;
  thumbnailUrl: string;
}

function createStudioPosterFallback(titleLabel: string, format: VideoFormat): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = format === 'long' ? 640 : 360;
    canvas.height = format === 'long' ? 360 : 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#09090b');
    grad.addColorStop(0.55, '#0f172a');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BasharTube', canvas.width / 2, canvas.height / 2 - 8);
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '14px sans-serif';
    ctx.fillText(titleLabel.slice(0, 28) || 'Video', canvas.width / 2, canvas.height / 2 + 18);
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    return '';
  }
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
}) => {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();
  const { uploadVideo } = useVideo();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const metadataPromiseRef = useRef<Promise<ExtractedVideoMeta | null> | null>(null);
  const previewUrlRef = useRef<string>('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [videoWidth, setVideoWidth] = useState<number>(0);
  const [videoHeight, setVideoHeight] = useState<number>(0);
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('short');
  const [formatManuallyChosen, setFormatManuallyChosen] = useState<boolean>(false);

  const [topicHint, setTopicHint] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Travel & Nature');
  const [visibility, setVisibility] = useState<VideoVisibility>('public');
  const [generateAiSubtitles, setGenerateAiSubtitles] = useState<boolean>(true);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiChapters, setAiChapters] = useState<VideoChapter[]>([]);
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [aiSubtitlesData, setAiSubtitlesData] = useState<{ bn?: string; en?: string } | null>(null);

  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetModalState = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    metadataPromiseRef.current = null;
    setSelectedFile(null);
    setPreviewUrl('');
    setThumbnailUrl('');
    setDuration(0);
    setVideoWidth(0);
    setVideoHeight(0);
    setVideoFormat('short');
    setFormatManuallyChosen(false);
    setTopicHint('');
    setTitle('');
    setDescription('');
    setAiSummary('');
    setAiChapters([]);
    setAiTags([]);
    setAiSubtitlesData(null);
    setIsAiGenerating(false);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStage('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  useEffect(() => {
    if (!isOpen) {
      resetModalState();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (!currentUser) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Login Required"
      >
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-7 text-center animate-in zoom-in-95 font-['Hind_Siliguri'] shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 stroke-[2]" />
          </div>
          <h3 className="text-xl font-black text-white mb-2 font-['Plus_Jakarta_Sans']">
            লগইন আবশ্যক (Login Required)
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mb-6 leading-relaxed">
            বাশারটিউবে শর্ট বা লং ভিডিও আপলোড করতে অনুগ্রহ করে আপনার চ্যানেলে লগইন করুন অথবা নাম, লোগো ও চ্যানেলের নাম দিয়ে নতুন অ্যাকাউন্ট খুলুন।
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] py-3 rounded-2xl bg-zinc-800 text-zinc-300 font-bold text-xs hover:bg-zinc-700 transition"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="flex-1 min-h-[44px] py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-cyan-400 text-white font-black text-xs hover:brightness-110 active:scale-95 transition shadow-lg shadow-pink-500/25"
            >
              লগইন / সাইন আপ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const captureFrameFromElement = (vidEl: HTMLVideoElement): string => {
    try {
      const w = vidEl.videoWidth || 720;
      const h = vidEl.videoHeight || 1280;
      const maxDim = 640;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(160, Math.round(w * scale));
      canvas.height = Math.max(160, Math.round(h * scale));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(vidEl, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.82);
      }
    } catch {
      // Ignore canvas taint/decode issues
    }
    return '';
  };

  const processSelectedFile = (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setFormatManuallyChosen(false);

    if (!isValidRealVideoFile(file)) {
      setErrorMessage(
        language === 'bn'
          ? 'অনুগ্রহ করে একটি বৈধ MP4, WebM অথবা MOV ভিডিও ফাইল নির্বাচন করুন।'
          : 'Please select a valid MP4, WebM, or MOV video file.'
      );
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setSelectedFile(file);
    setPreviewUrl(objectUrl);

    metadataPromiseRef.current = new Promise<ExtractedVideoMeta | null>((resolve) => {
      const tempVideo = document.createElement('video');
      tempVideo.src = objectUrl;
      tempVideo.muted = true;
      tempVideo.playsInline = true;
      tempVideo.preload = 'auto';

      let settled = false;
      let capturedThumb = '';

      const finish = (meta: ExtractedVideoMeta | null) => {
        if (settled) return;
        settled = true;
        resolve(meta);
      };

      const timeoutId = window.setTimeout(() => {
        const w = tempVideo.videoWidth || 720;
        const h = tempVideo.videoHeight || 1280;
        const dur = Number.isFinite(tempVideo.duration) && tempVideo.duration > 0 ? Math.round(tempVideo.duration) : 10;
        const fmt = detectVideoFormat({ width: w, height: h, durationSeconds: dur });
        const thumb = capturedThumb || captureFrameFromElement(tempVideo) || createStudioPosterFallback(file.name, fmt);
        setDuration(dur);
        setVideoWidth(w);
        setVideoHeight(h);
        setVideoFormat(fmt);
        if (thumb) setThumbnailUrl(thumb);
        finish({ duration: dur, width: w, height: h, format: fmt, thumbnailUrl: thumb });
      }, 1200);

      tempVideo.onloadedmetadata = () => {
        const rawDur = Number.isFinite(tempVideo.duration) ? tempVideo.duration : 10;
        const dur = Math.max(1, Math.round(rawDur));
        const w = tempVideo.videoWidth || 720;
        const h = tempVideo.videoHeight || 1280;

        if (dur > DEFAULT_PLATFORM_SETTINGS.maxVideoDurationSeconds) {
          window.clearTimeout(timeoutId);
          setErrorMessage(
            language === 'bn'
              ? `ভিডিওর দৈর্ঘ্য সর্বোচ্চ ${Math.round(DEFAULT_PLATFORM_SETTINGS.maxVideoDurationSeconds / 60)} মিনিট হতে পারবে।`
              : `Video exceeds max duration of ${Math.round(DEFAULT_PLATFORM_SETTINGS.maxVideoDurationSeconds / 60)} minutes.`
          );
          setSelectedFile(null);
          setPreviewUrl('');
          finish(null);
          return;
        }

        const fmt = detectVideoFormat({ width: w, height: h, durationSeconds: dur });
        setDuration(dur);
        setVideoWidth(w);
        setVideoHeight(h);
        setVideoFormat(fmt);

        tempVideo.currentTime = Math.min(0.6, dur / 2);
      };

      tempVideo.onloadeddata = () => {
        if (!capturedThumb) {
          const frame = captureFrameFromElement(tempVideo);
          if (frame) {
            capturedThumb = frame;
            setThumbnailUrl(frame);
          }
        }
      };

      tempVideo.onseeked = () => {
        window.clearTimeout(timeoutId);
        const frame = captureFrameFromElement(tempVideo) || capturedThumb;
        const w = tempVideo.videoWidth || 720;
        const h = tempVideo.videoHeight || 1280;
        const dur = Math.max(1, Math.round(Number.isFinite(tempVideo.duration) ? tempVideo.duration : 10));
        const fmt = detectVideoFormat({ width: w, height: h, durationSeconds: dur });
        const thumb = frame || createStudioPosterFallback(file.name, fmt);
        if (thumb) setThumbnailUrl(thumb);
        finish({ duration: dur, width: w, height: h, format: fmt, thumbnailUrl: thumb });
      };

      tempVideo.onerror = () => {
        window.clearTimeout(timeoutId);
        const fallbackThumb = createStudioPosterFallback(file.name, 'short');
        setThumbnailUrl(fallbackThumb);
        finish({ duration: 10, width: 720, height: 1280, format: 'short', thumbnailUrl: fallbackThumb });
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
    e.target.value = '';
  };

  const handleGenerateWithAi = async () => {
    if (!selectedFile) {
      setErrorMessage(
        language === 'bn'
          ? 'প্রথমে আপনার ডিভাইস থেকে একটি ভিডিও ফাইল নির্বাচন করুন।'
          : 'Please select a video file first.'
      );
      return;
    }

    setErrorMessage(null);
    setIsAiGenerating(true);

    try {
      const meta = metadataPromiseRef.current ? await metadataPromiseRef.current : null;
      const result = await analyzeVideoWithAi({
        thumbnailBase64: thumbnailUrl || meta?.thumbnailUrl || undefined,
        filename: selectedFile.name,
        durationSeconds: duration || meta?.duration || 30,
        videoFormat: formatManuallyChosen ? videoFormat : meta?.format || videoFormat,
        topicHint: topicHint.trim() || title.trim(),
        language,
      });

      if (result.title) setTitle(result.title);
      if (result.description) setDescription(result.description);
      if (result.category) setCategory(result.category);
      if (result.aiSummary) setAiSummary(result.aiSummary);
      if (result.aiChapters.length > 0) setAiChapters(result.aiChapters);
      if (result.aiTags.length > 0) setAiTags(result.aiTags);
      if (result.subtitlesBn || result.subtitlesEn) {
        setAiSubtitlesData({
          bn: result.subtitlesBn,
          en: result.subtitlesEn,
        });
        setGenerateAiSubtitles(true);
      }
      setSuccessMessage(
        language === 'bn'
          ? 'BasharTube AI ভিডিওর শিরোনাম, বিবরণ, সারাংশ ও সাবটাইটেল তৈরি করেছে!'
          : 'BasharTube AI generated title, description, summary & subtitles!'
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : language === 'bn'
          ? 'BasharTube AI কাজ করতে পারেনি।'
          : 'BasharTube AI analysis failed.'
      );
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !previewUrl) {
      setErrorMessage(
        language === 'bn'
          ? 'অনুগ্রহ করে আপনার ডিভাইস থেকে একটি আসল ভিডিও ফাইল নির্বাচন করুন।'
          : 'Please select a real video file from your device.'
      );
      return;
    }
    if (!title.trim()) {
      setErrorMessage(
        language === 'bn' ? 'ভিডিওর একটি আকর্ষণীয় শিরোনাম দিন।' : 'Please enter a video title.'
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(22);
    setUploadStage(
      language === 'bn' ? 'ভিডিও ফাইল যাচাই ও বিশ্লেষণ হচ্ছে...' : 'Analyzing video file...'
    );
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const meta = metadataPromiseRef.current ? await metadataPromiseRef.current : null;
      const finalDuration = duration || meta?.duration || 15;
      const finalWidth = videoWidth || meta?.width || 0;
      const finalHeight = videoHeight || meta?.height || 0;
      const finalFormat = formatManuallyChosen
        ? videoFormat
        : meta?.format || videoFormat;
      const finalThumb =
        thumbnailUrl ||
        meta?.thumbnailUrl ||
        createStudioPosterFallback(title.trim(), finalFormat);

      setUploadProgress(58);
      setUploadStage(
        language === 'bn' ? 'হোম ফিড ও মিডিয়া সার্ভারে সংরক্ষণ হচ্ছে...' : 'Saving to media server...'
      );

      const subtitlesPayload = generateAiSubtitles
        ? aiSubtitlesData || {
            bn: `00:00 ${title.trim()}`,
            en: `00:00 ${title.trim()}`,
          }
        : undefined;

      await uploadVideo(
        {
          authorId: currentUser.id,
          authorName: currentUser.channelName || currentUser.displayName,
          authorUsername: currentUser.username,
          authorAvatar: currentUser.avatarUrl,
          isAuthorVerified: currentUser.isVerified,
          title: title.trim(),
          description: description.trim(),
          videoUrl: '',
          thumbnailUrl: finalThumb,
          duration: finalDuration,
          videoFormat: finalFormat,
          videoWidth: finalWidth || undefined,
          videoHeight: finalHeight || undefined,
          aspectRatio: finalHeight > 0 ? Number((finalWidth / finalHeight).toFixed(2)) : undefined,
          category,
          visibility,
          commentsEnabled: true,
          hasSubtitles: generateAiSubtitles,
          subtitles: subtitlesPayload,
          aiSummary: aiSummary || undefined,
          aiChapters: aiChapters.length > 0 ? aiChapters : undefined,
          aiTags: aiTags.length > 0 ? aiTags : undefined,
          aiModerationStatus: 'approved',
          isKidsSafe: false,
        },
        selectedFile,
        selectedFile.name
      );

      setUploadProgress(100);
      setUploadStage(
        language === 'bn' ? 'সম্পন্ন! হোম ফিডে ভিডিও যুক্ত হয়েছে।' : 'Published to Home feed!'
      );
      setSuccessMessage(t('uploadSuccess'));

      window.setTimeout(() => {
        onClose();
      }, 300);
    } catch {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStage('');
      setErrorMessage(
        language === 'bn'
          ? 'ভিডিও আপলোডে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
          : 'Upload error occurred. Please try again.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={t('uploadTitle')}
    >
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl animate-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-pink-500 p-[2px] shrink-0">
              <div className="w-full h-full bg-zinc-900 rounded-[10px] flex items-center justify-center text-cyan-400">
                <Film className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
                {t('uploadTitle')}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {language === 'bn'
                  ? 'MP4, WebM বা MOV (শর্ট ৯:১৬ অথবা লং ১৬:৯ স্বয়ংক্রিয়ভাবে শনাক্ত হবে)'
                  : 'MP4, WebM or MOV (Short 9:16 & Long 16:9 auto-detected)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upload modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="mt-4 p-4 rounded-2xl bg-zinc-950 border border-cyan-500/40 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-white flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>{uploadStage}</span>
              </span>
              <span className="font-mono font-black text-cyan-400">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-pink-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
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
          {/* File Selector */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) processSelectedFile(dropped);
            }}
            className={`border-2 border-dashed rounded-2xl p-5 text-center transition ${
              selectedFile
                ? 'border-cyan-500/60 bg-cyan-500/5'
                : 'border-zinc-700/80 hover:border-zinc-500 bg-zinc-950/50'
            }`}
          >
            <input
              ref={fileInputRef}
              id="bashartube-video-file-input"
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              onChange={handleFileChange}
              className="hidden"
            />
            {previewUrl && selectedFile ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 text-left">
                <div
                  className={`relative rounded-xl overflow-hidden bg-black border border-zinc-700 shadow-md shrink-0 ${
                    videoFormat === 'long' ? 'w-48 aspect-video' : 'w-28 aspect-[9/16]'
                  }`}
                >
                  <video src={previewUrl} className="w-full h-full object-cover" muted playsInline />
                </div>
                <div className="flex-1 min-w-0 space-y-2.5">
                  <p className="text-xs font-bold text-cyan-400 truncate">{selectedFile.name}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-300 font-medium">
                    <span className="inline-flex items-center gap-1 text-zinc-300">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      {formatVideoDuration(duration)}
                    </span>
                    {videoWidth > 0 && videoHeight > 0 && (
                      <span className="text-zinc-400">
                        · {videoWidth}×{videoHeight}
                      </span>
                    )}
                  </div>

                  {/* Format selector */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setVideoFormat('short');
                        setFormatManuallyChosen(true);
                      }}
                      className={`min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition whitespace-nowrap ${
                        videoFormat === 'short'
                          ? 'bg-cyan-500 text-black border-cyan-400'
                          : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'শর্ট ভিডিও (৯:১৬)' : 'Short (9:16)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoFormat('long');
                        setFormatManuallyChosen(true);
                      }}
                      className={`min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition whitespace-nowrap ${
                        videoFormat === 'long'
                          ? 'bg-pink-500 text-white border-pink-400'
                          : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      <MonitorPlay className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'লং ভিডিও (১৬:৯)' : 'Long (16:9)'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-zinc-400 hover:text-cyan-400 underline py-1"
                  >
                    {language === 'bn' ? 'অন্য ভিডিও ফাইল বাছাই করুন' : 'Choose another file'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-cyan-400 mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-white mb-1">{t('dropVideoHere')}</p>
                <p className="text-xs text-zinc-400 mb-4">
                  {language === 'bn'
                    ? 'আপনার ডিভাইস থেকে আসল শর্ট বা লং ভিডিও আপলোড করুন'
                    : 'Select a real Short or Long video file from your device'}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-zinc-700 hover:border-cyan-500/50 transition"
                >
                  {language === 'bn' ? 'ফাইল নির্বাচন করুন' : 'Choose Video File'}
                </button>
              </div>
            )}
          </div>

          {/* BasharTube AI Smart Studio Assistant */}
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-cyan-500/30 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                <Sparkles className="w-4 h-4" />
                <span>BasharTube AI Studio</span>
              </div>
              <button
                type="button"
                onClick={handleGenerateWithAi}
                disabled={isAiGenerating || !selectedFile}
                className="min-h-[40px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-extrabold text-xs hover:brightness-110 disabled:opacity-40 transition whitespace-nowrap"
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === 'bn' ? 'AI বিশ্লেষণ করছে...' : 'Analyzing...'}</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>
                      {language === 'bn' ? 'BasharTube AI দিয়ে সাজান' : 'Auto-Fill with AI'}
                    </span>
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              value={topicHint}
              onChange={(e) => setTopicHint(e.target.value)}
              placeholder={
                language === 'bn'
                  ? 'ঐচ্ছিক: ভিডিওটি কী নিয়ে? (যেমন: কক্সবাজার ভ্রমণ ব্লগ বা রান্নার রেসিপি)'
                  : 'Optional topic hint for BasharTube AI (e.g. Dhaka street food vlog)'
              }
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="upload-video-title"
              className="block text-xs font-semibold text-zinc-300 mb-1.5"
            >
              {t('videoTitleInput')} *
            </label>
            <input
              id="upload-video-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                language === 'bn' ? 'ভিডিওর আকর্ষণীয় শিরোনাম লিখুন...' : 'Enter a compelling title...'
              }
              maxLength={200}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none transition"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="upload-video-desc"
              className="block text-xs font-semibold text-zinc-300 mb-1.5"
            >
              {t('videoDescInput')}
            </label>
            <textarea
              id="upload-video-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="#bangladesh #bashartube"
              maxLength={1000}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none transition resize-none"
            />
          </div>

          {/* AI Generated Summary & Chapters Preview */}
          {(aiSummary || aiChapters.length > 0) && (
            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs space-y-2">
              {aiSummary && (
                <div>
                  <span className="font-bold text-cyan-400">
                    {language === 'bn' ? 'AI সারাংশ:' : 'AI Summary:'}{' '}
                  </span>
                  <span className="text-zinc-300">{aiSummary}</span>
                </div>
              )}
              {aiChapters.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {aiChapters.map((ch, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-300"
                    >
                      <span className="text-cyan-400 font-mono mr-1">{ch.time}</span>
                      {ch.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Category & Visibility Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="upload-video-category"
                className="block text-xs font-semibold text-zinc-300 mb-1.5"
              >
                {t('videoCategoryInput')}
              </label>
              <select
                id="upload-video-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-medium text-white focus:border-cyan-500 focus:outline-none"
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
              <span className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {t('visibility')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition ${
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
                  className={`min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition ${
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
            <label className="flex items-center gap-2.5 cursor-pointer select-none min-h-[40px]">
              <input
                type="checkbox"
                checked={generateAiSubtitles}
                onChange={(e) => setGenerateAiSubtitles(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500/50 bg-zinc-900 border-zinc-700"
              />
              <span className="text-xs text-zinc-300 flex items-center gap-1.5">
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
              className="min-h-[44px] px-5 py-2.5 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile || !previewUrl}
              className="min-h-[44px] flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition shadow-lg shadow-cyan-500/25"
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
