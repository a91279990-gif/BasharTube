import React, { useRef, useState, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Download,
  Volume2,
  VolumeX,
  Play,
  Plus,
  Check,
  CheckCircle,
  MoreVertical,
  Lock,
  Gauge,
  Subtitles,
  Trash2,
  MessageSquareOff,
  Sparkles,
  Maximize2,
  Send,
  Loader2,
  MonitorPlay,
  Smartphone,
  X,
  Globe,
} from 'lucide-react';
import { VideoItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useVideo } from '../../context/VideoContext';
import { useLanguage } from '../../context/LanguageContext';
import { useMonetization } from '../../context/MonetizationContext';
import { formatVideoDuration, resolveVideoFormat } from '../../utils/videoFormat';
import { askBasharTubeAi } from '../../utils/bashartubeAiClient';

interface VideoCardProps {
  video: VideoItem;
  isActive: boolean;
  onOpenComments: (videoId: string) => void;
  onOpenAuth: () => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isActive,
  onOpenComments,
  onOpenAuth,
}) => {
  const { t, language } = useLanguage();
  const { currentUser, preferences } = useAuth();
  const {
    likedVideoIds,
    toggleLikeVideo,
    incrementShare,
    incrementViews,
    followedCreatorIds,
    toggleFollowCreator,
    isMuted,
    setIsMuted,
    playbackSpeed,
    setPlaybackSpeed,
    activeSubtitleLang,
    setActiveSubtitleLang,
    deleteVideo,
    updateVideoVisibility,
    toggleVideoComments,
  } = useVideo();
  const { recordRealEngagement } = useMonetization();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(video.duration || 0);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [showShareToast, setShowShareToast] = useState<boolean>(false);
  const [showDownloadToast, setShowDownloadToast] = useState<string | null>(null);

  const [showShortSideAi, setShowShortSideAi] = useState<boolean>(false);
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [aiReply, setAiReply] = useState<string>('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiAsking, setIsAiAsking] = useState<boolean>(false);

  const watchSecondsRef = useRef<number>(0);
  const hasRecordedInitialViewRef = useRef<boolean>(false);

  const format = resolveVideoFormat(video);
  const isLong = format === 'long';
  const isLiked = likedVideoIds.has(video.id);
  const isFollowing = followedCreatorIds.has(video.authorId);
  const isAuthor = currentUser?.id === video.authorId;
  const cleanHandle = video.authorUsername?.startsWith('@')
    ? video.authorUsername
    : `@${video.authorUsername || 'creator'}`;

  useEffect(() => {
    watchSecondsRef.current = 0;
    hasRecordedInitialViewRef.current = false;
    setCurrentTime(0);
    setAiReply('');
    setAiError(null);
  }, [video.id]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && isPlaying) {
      interval = setInterval(() => {
        watchSecondsRef.current += 1;
        if (watchSecondsRef.current === 5 || watchSecondsRef.current % 15 === 0) {
          const isInitial = !hasRecordedInitialViewRef.current;
          if (isInitial) hasRecordedInitialViewRef.current = true;
          recordRealEngagement(
            video.id,
            video.authorId,
            video.title,
            watchSecondsRef.current,
            isInitial
          ).catch(() => {});
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPlaying, video.id, video.authorId, video.title, recordRealEngagement]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !video.videoUrl) return;
    el.playbackRate = playbackSpeed;
    el.muted = isMuted;

    if (isActive) {
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            incrementViews(video.id);
          })
          .catch(() => {
            el.muted = true;
            el.play()
              .then(() => setIsPlaying(true))
              .catch(() => {});
          });
      }
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, [isActive, playbackSpeed, isMuted, video.id, video.videoUrl]);

  const togglePlayPause = () => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const handleSeek = (seconds: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = seconds;
    setCurrentTime(seconds);
    if (!isPlaying) {
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const handleFullscreen = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  };

  const handleShare = () => {
    incrementShare(video.id);
    navigator.clipboard?.writeText(window.location.origin + '?v=' + video.id);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2500);
  };

  const handleDownload = () => {
    if (!currentUser) {
      setShowDownloadToast(t('guestWatchNotice'));
      setTimeout(() => {
        setShowDownloadToast(null);
        onOpenAuth();
      }, 1500);
      return;
    }
    const link = document.createElement('a');
    link.href = video.videoUrl;
    link.download = `BasharTube_${video.title.slice(0, 20)}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowDownloadToast(
      language === 'bn' ? 'ভিডিও ডাউনলোড শুরু হয়েছে...' : 'Downloading video...'
    );
    setTimeout(() => setShowDownloadToast(null), 2500);
  };

  const handleAskVideoAi = async (e?: React.FormEvent, quickPrompt?: string) => {
    if (e) e.preventDefault();
    const questionText = (quickPrompt ?? aiQuestion).trim();
    if (!questionText || isAiAsking) return;

    setAiError(null);
    setIsAiAsking(true);
    if (!quickPrompt) setAiQuestion('');

    try {
      const reply = await askBasharTubeAi({
        mode: 'video-qa',
        videoTitle: video.title,
        videoDescription: video.description,
        videoCategory: video.category,
        duration: totalDuration || video.duration,
        videoFormat: format,
        aiSummary: video.aiSummary,
        question: questionText,
        language,
      });
      setAiReply(reply);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : language === 'bn'
          ? 'BasharTube AI সংযোগ ব্যর্থ হয়েছে।'
          : 'BasharTube AI unavailable.'
      );
    } finally {
      setIsAiAsking(false);
    }
  };

  const renderSettingsDropdown = () =>
    showSettingsMenu && (
      <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900/95 border border-zinc-800 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl z-30 animate-in fade-in">
        <div className="mb-2">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('speed')}</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[0.5, 1, 1.5, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setPlaybackSpeed(s);
                  setShowSettingsMenu(false);
                }}
                className={`text-xs py-1.5 rounded-lg font-semibold transition ${
                  playbackSpeed === s
                    ? 'bg-cyan-500 text-black'
                    : 'bg-zinc-800 text-zinc-300 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="mb-2 border-t border-zinc-800 pt-2">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Subtitles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('subtitles')}</span>
          </div>
          <div className="flex gap-1">
            {[
              { id: 'off', label: 'Off' },
              { id: 'bn', label: 'বাংলা' },
              { id: 'en', label: 'EN' },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  setActiveSubtitleLang(sub.id as 'off' | 'bn' | 'en');
                  setShowSettingsMenu(false);
                }}
                className={`text-xs flex-1 py-1.5 rounded-lg font-semibold transition ${
                  activeSubtitleLang === sub.id
                    ? 'bg-cyan-500 text-black'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>

        {isAuthor && (
          <div className="border-t border-zinc-800 pt-2 space-y-1">
            <button
              type="button"
              onClick={() => {
                updateVideoVisibility(
                  video.id,
                  video.visibility === 'public' ? 'private' : 'public'
                );
                setShowSettingsMenu(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            >
              {video.visibility === 'public' ? (
                <Lock className="w-3.5 h-3.5 text-pink-400" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>{video.visibility === 'public' ? 'Make Private' : 'Make Public'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                toggleVideoComments(video.id, !video.commentsEnabled);
                setShowSettingsMenu(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            >
              <MessageSquareOff className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {video.commentsEnabled ? t('turnOffComments') : t('turnOnComments')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                deleteVideo(video.id);
                setShowSettingsMenu(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('deleteVideo')}</span>
            </button>
          </div>
        )}
      </div>
    );

  // ==========================================================
  // LONG VIDEO LAYOUT (16:9 Cinema Frame + Side Inspector Panel)
  // ==========================================================
  if (isLong) {
    return (
      <article
        data-testid="video-card-long"
        data-format="long"
        className="w-full max-w-6xl mx-auto px-3 sm:px-6 flex flex-col lg:flex-row gap-4 items-stretch select-none"
      >
        {/* Left: Widescreen 16:9 Cinema Video Player */}
        <div className="relative flex-1 aspect-video rounded-3xl overflow-hidden bg-black ring-1 ring-white/10 shadow-2xl flex items-center justify-center">
          <video
            ref={videoRef}
            src={video.videoUrl || undefined}
            poster={video.thumbnailUrl || undefined}
            loop
            playsInline
            preload={preferences.dataSaver ? 'metadata' : 'auto'}
            onLoadedMetadata={(e) => {
              const dur = e.currentTarget.duration;
              if (Number.isFinite(dur) && dur > 0) setTotalDuration(Math.round(dur));
            }}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onClick={togglePlayPause}
            className="w-full h-full object-contain bg-black cursor-pointer"
          />

          {!isPlaying && (
            <button
              type="button"
              onClick={togglePlayPause}
              aria-label="Play long video"
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
            >
              <span className="w-16 h-16 rounded-full bg-cyan-400/95 text-black flex items-center justify-center shadow-2xl hover:scale-105 transition">
                <Play className="w-8 h-8 fill-black ml-1" />
              </span>
            </button>
          )}

          {/* Minimal Top HUD (unboxed metadata strip + crisp action buttons) */}
          <div className="absolute top-3 left-4 right-3 flex items-center justify-between z-20 pointer-events-none">
            <div className="flex items-center gap-2 bg-black/55 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] font-semibold text-zinc-200 border border-white/10">
              <MonitorPlay className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <span>{language === 'bn' ? 'লং ভিডিও' : 'Long Video'}</span>
              <span className="text-zinc-400">·</span>
              <span className="font-mono text-cyan-300">
                {formatVideoDuration(totalDuration || video.duration)}
              </span>
              {video.visibility === 'private' && (
                <>
                  <span className="text-zinc-400">·</span>
                  <Lock className="w-3 h-3 text-pink-400" />
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                aria-label={isMuted ? t('soundOff') : t('soundOn')}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-black/65 hover:bg-black/90 text-white border border-white/10 backdrop-blur-md transition"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-pink-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                )}
              </button>
              <button
                type="button"
                onClick={handleFullscreen}
                aria-label="Fullscreen"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-black/65 hover:bg-black/90 text-white border border-white/10 backdrop-blur-md transition"
              >
                <Maximize2 className="w-4 h-4 text-zinc-200" />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  aria-label="Video settings"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-black/65 hover:bg-black/90 text-white border border-white/10 backdrop-blur-md transition"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {renderSettingsDropdown()}
              </div>
            </div>
          </div>

          {/* Subtitles */}
          {activeSubtitleLang !== 'off' && video.hasSubtitles && video.subtitles && (
            <div className="absolute bottom-14 left-4 right-4 pointer-events-none z-20 text-center">
              <p className="inline-block bg-black/80 text-cyan-300 px-3 py-1 rounded-xl text-xs font-medium border border-cyan-500/20">
                {activeSubtitleLang === 'bn'
                  ? video.subtitles.bn?.split('\n')[0] || video.title
                  : video.subtitles.en?.split('\n')[0] || video.title}
              </p>
            </div>
          )}

          {/* Timeline Scrubber */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-4 py-3 z-20 flex items-center gap-3">
            <span className="text-[11px] font-mono text-zinc-200 w-11 tabular-nums">
              {formatVideoDuration(currentTime)}
            </span>
            <input
              type="range"
              aria-label="Seek video timeline"
              min={0}
              max={Math.max(1, totalDuration || video.duration || 1)}
              step={0.5}
              value={Math.min(currentTime, totalDuration || video.duration || 1)}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="flex-1 accent-cyan-400 h-1.5 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-zinc-400 w-11 text-right tabular-nums">
              {formatVideoDuration(totalDuration || video.duration)}
            </span>
          </div>

          {showShareToast && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-2xl bg-cyan-500 text-black font-bold text-xs shadow-2xl z-30">
              {language === 'bn' ? 'ভিডিও লিংক কপি হয়েছে!' : 'Video link copied!'}
            </div>
          )}
          {showDownloadToast && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2.5 rounded-2xl bg-zinc-900/95 border border-zinc-700 text-white font-medium text-xs shadow-2xl z-30">
              {showDownloadToast}
            </div>
          )}
        </div>

        {/* Right: Dedicated Studio Companion Side Panel (লং ভিডিওর সাইডে) */}
        <aside
          data-testid="long-video-side-panel"
          className="w-full lg:w-[370px] shrink-0 rounded-3xl bg-zinc-900/95 border border-zinc-800/90 p-5 flex flex-col justify-between gap-4 shadow-2xl max-h-[460px] lg:max-h-[540px] overflow-y-auto"
        >
          <div className="space-y-4">
            {/* Creator Identity Row */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-800/90">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={video.authorAvatar}
                  alt={video.authorName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-cyan-400/70 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white flex items-center gap-1 truncate">
                    <span className="truncate">{video.authorName}</span>
                    {video.isAuthorVerified && (
                      <CheckCircle className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400 shrink-0" />
                    )}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">{cleanHandle}</p>
                </div>
              </div>
              {!isAuthor && (
                <button
                  type="button"
                  onClick={() => toggleFollowCreator(video.authorId)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap ${
                    isFollowing
                      ? 'bg-zinc-800 text-cyan-300 border border-zinc-700'
                      : 'bg-pink-500 hover:bg-pink-600 text-white'
                  }`}
                >
                  {isFollowing
                    ? language === 'bn'
                      ? 'ফলোয়িং'
                      : 'Following'
                    : language === 'bn'
                    ? 'ফলো'
                    : 'Follow'}
                </button>
              )}
            </div>

            {/* Title, Description & Unboxed Metadata */}
            <div>
              <h3 className="text-base font-extrabold text-white leading-snug mb-1.5">
                {video.title}
              </h3>
              {video.description && (
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                  {video.description}
                </p>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
                <span>
                  {video.viewsCount.toLocaleString()} {language === 'bn' ? 'ভিউ' : 'views'}
                </span>
                <span>·</span>
                <span className="text-zinc-300">{video.category}</span>
                <span>·</span>
                <span className="font-mono text-cyan-400">
                  {formatVideoDuration(totalDuration || video.duration)}
                </span>
              </div>
            </div>

            {/* Engagement Action Bar */}
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                data-testid="like-button"
                aria-label="Like video"
                onClick={() => toggleLikeVideo(video.id)}
                className={`min-h-[52px] flex flex-col items-center justify-center rounded-2xl border transition ${
                  isLiked
                    ? 'bg-pink-500/15 border-pink-500/40 text-pink-400'
                    : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                }`}
              >
                <Heart
                  className={`w-4 h-4 mb-0.5 ${
                    isLiked ? 'fill-pink-500 text-pink-500' : 'text-zinc-200'
                  }`}
                />
                <span className="text-[11px] font-bold tabular-nums">{video.likesCount}</span>
              </button>

              <button
                type="button"
                data-testid="comment-button"
                aria-label="Open comments"
                onClick={() => onOpenComments(video.id)}
                className="min-h-[52px] flex flex-col items-center justify-center rounded-2xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition"
              >
                <MessageCircle className="w-4 h-4 mb-0.5" />
                <span className="text-[11px] font-bold tabular-nums">{video.commentsCount}</span>
              </button>

              <button
                type="button"
                data-testid="share-button"
                aria-label="Share video"
                onClick={handleShare}
                className="min-h-[52px] flex flex-col items-center justify-center rounded-2xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition"
              >
                <Share2 className="w-4 h-4 mb-0.5" />
                <span className="text-[11px] font-bold tabular-nums">{video.sharesCount}</span>
              </button>

              <button
                type="button"
                data-testid="download-button"
                aria-label="Download video"
                onClick={handleDownload}
                className="min-h-[52px] flex flex-col items-center justify-center rounded-2xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-cyan-400 transition"
              >
                <Download className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] font-semibold text-zinc-300">{t('download')}</span>
              </button>
            </div>

            {/* BasharTube AI Companion Section */}
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-cyan-500/25 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>BasharTube AI</span>
                </span>
                {!aiReply && (
                  <button
                    type="button"
                    onClick={() =>
                      handleAskVideoAi(
                        undefined,
                        language === 'bn'
                          ? 'এই ভিডিওর মূল সারসংক্ষেপ এবং ৩টি গুরুত্বপূর্ণ পয়েন্ট বলো।'
                          : 'Summarize this video and list 3 key takeaways.'
                      )
                    }
                    className="text-[11px] font-bold text-pink-400 hover:text-pink-300 transition py-1"
                  >
                    {language === 'bn' ? 'সারাংশ দেখুন' : 'Summarize'}
                  </button>
                )}
              </div>

              {video.aiSummary && (
                <p className="text-[11px] text-zinc-300 leading-relaxed">{video.aiSummary}</p>
              )}

              {video.aiChapters && video.aiChapters.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {language === 'bn' ? 'ভিডিও চ্যাপ্টার' : 'Chapters'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {video.aiChapters.map((ch, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSeek(ch.seconds)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-cyan-500/15 border border-zinc-800 hover:border-cyan-500/40 text-zinc-300 transition text-left"
                      >
                        <span className="text-cyan-400 font-mono mr-1">{ch.time}</span>
                        <span>{ch.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {aiReply && (
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {aiReply}
                </div>
              )}
              {aiError && <p className="text-[11px] text-rose-400">{aiError}</p>}

              <form onSubmit={(e) => handleAskVideoAi(e)} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'ভিডিও নিয়ে AI-কে প্রশ্ন করুন...'
                      : 'Ask BasharTube AI about this video...'
                  }
                  className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!aiQuestion.trim() || isAiAsking}
                  aria-label="Ask BasharTube AI"
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-cyan-500 text-black hover:brightness-110 disabled:opacity-40 transition"
                >
                  {isAiAsking ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </aside>
      </article>
    );
  }

  // ==========================================================
  // SHORT VIDEO LAYOUT (9:16 Vertical Cinema + Side Action Rail & AI Drawer)
  // ==========================================================
  return (
    <article
      data-testid="video-card-short"
      data-format="short"
      className="w-full flex flex-col md:flex-row items-center md:items-end justify-center gap-3.5 sm:gap-4 px-2 select-none"
    >
      {/* Centered 9:16 Vertical Short Player */}
      <div className="relative w-full max-w-[390px] h-[74vh] sm:h-[78vh] max-h-[740px] aspect-[9/16] rounded-3xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10 group shrink-0">
        <video
          ref={videoRef}
          src={video.videoUrl || undefined}
          poster={video.thumbnailUrl || undefined}
          loop
          playsInline
          preload={preferences.dataSaver ? 'metadata' : 'auto'}
          onClick={togglePlayPause}
          className="w-full h-full object-cover cursor-pointer"
        />

        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlayPause}
            aria-label="Play short video"
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          >
            <span className="w-16 h-16 rounded-full bg-cyan-400/95 text-black flex items-center justify-center shadow-2xl hover:scale-105 transition">
              <Play className="w-8 h-8 fill-black ml-1" />
            </span>
          </button>
        )}

        {/* Minimal Top HUD (unboxed metadata strip + crisp mute/settings controls) */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none z-20">
          <div className="flex items-center gap-1.5 bg-black/55 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] font-semibold text-zinc-200 border border-white/10">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{language === 'bn' ? 'শর্ট' : 'Short'}</span>
            <span className="text-zinc-400">·</span>
            <span className="truncate max-w-[125px] text-zinc-300">
              {video.category || 'BasharTube'}
            </span>
            {video.visibility === 'private' && (
              <>
                <span className="text-zinc-400">·</span>
                <Lock className="w-3 h-3 text-pink-400 shrink-0" />
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              aria-label={isMuted ? t('soundOff') : t('soundOn')}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-black/60 hover:bg-black/85 text-white backdrop-blur-md border border-white/10 transition"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-pink-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                aria-label="Short video settings"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-black/60 hover:bg-black/85 text-white backdrop-blur-md border border-white/10 transition"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {renderSettingsDropdown()}
            </div>
          </div>
        </div>

        {/* Subtitles Overlay */}
        {activeSubtitleLang !== 'off' && video.hasSubtitles && video.subtitles && (
          <div className="absolute bottom-24 left-4 right-16 md:right-4 pointer-events-none z-20 text-center">
            <p className="inline-block bg-black/80 text-cyan-300 px-3 py-1.5 rounded-xl text-xs font-medium backdrop-blur-md border border-cyan-500/20 shadow-lg">
              {activeSubtitleLang === 'bn'
                ? video.subtitles.bn?.split('\n')[0] || video.title
                : video.subtitles.en?.split('\n')[0] || video.title}
            </p>
          </div>
        )}

        {/* High-Contrast Bottom Scrim & Creator Info */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-12 p-4 pr-16 md:pr-4 pointer-events-none z-20 flex flex-col gap-1 text-white">
          <div className="flex items-center gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            <span className="font-bold text-sm tracking-wide flex items-center gap-1 truncate">
              {video.authorName}
              {video.isAuthorVerified && (
                <CheckCircle className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400 shrink-0" />
              )}
            </span>
            <span className="text-xs text-zinc-200 font-medium shrink-0">{cleanHandle}</span>
          </div>
          <h3 className="text-sm font-semibold line-clamp-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
            {video.title}
          </h3>
          {video.description && (
            <p className="text-xs text-zinc-200 line-clamp-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {video.description}
            </p>
          )}
        </div>

        {/* Mobile Overlay Right Action Rail (< md screens, 44px+ touch hitboxes) */}
        <div className="md:hidden absolute bottom-4 right-2 flex flex-col items-center gap-2 z-20">
          <button
            type="button"
            aria-label="Like video"
            onClick={() => toggleLikeVideo(video.id)}
            className="flex flex-col items-center"
          >
            <span className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-black/65 border border-white/10 text-white backdrop-blur-md">
              <Heart
                className={`w-5 h-5 ${isLiked ? 'fill-pink-500 text-pink-500' : 'text-white'}`}
              />
            </span>
            <span className="text-[11px] font-bold text-white mt-0.5 tabular-nums drop-shadow">
              {video.likesCount}
            </span>
          </button>

          <button
            type="button"
            aria-label="Open comments"
            onClick={() => onOpenComments(video.id)}
            className="flex flex-col items-center"
          >
            <span className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-black/65 border border-white/10 text-white backdrop-blur-md">
              <MessageCircle className="w-5 h-5 text-white" />
            </span>
            <span className="text-[11px] font-bold text-white mt-0.5 tabular-nums drop-shadow">
              {video.commentsCount}
            </span>
          </button>

          <button
            type="button"
            aria-label="Share video"
            onClick={handleShare}
            className="flex flex-col items-center"
          >
            <span className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-black/65 border border-white/10 text-white backdrop-blur-md">
              <Share2 className="w-5 h-5 text-white" />
            </span>
            <span className="text-[11px] font-bold text-white mt-0.5 tabular-nums drop-shadow">
              {video.sharesCount}
            </span>
          </button>

          <button
            type="button"
            aria-label="Toggle BasharTube AI side panel"
            onClick={() => setShowShortSideAi(!showShortSideAi)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-cyan-500/25 border border-cyan-400/60 text-cyan-300 backdrop-blur-md"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>

        {showShareToast && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-2xl bg-cyan-500 text-black font-bold text-xs shadow-2xl z-30">
            {language === 'bn' ? 'ভিডিও লিংক কপি হয়েছে!' : 'Video link copied!'}
          </div>
        )}
        {showDownloadToast && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2.5 rounded-2xl bg-zinc-900/95 border border-zinc-700 text-white font-medium text-xs shadow-2xl z-30 text-center max-w-[260px]">
            {showDownloadToast}
          </div>
        )}
      </div>

      {/* Desktop Side Action Rail Beside the Short Video (শর্ট ভিডিওর সাইডেই) */}
      <div
        data-testid="short-video-side-rail"
        className="hidden md:flex flex-col items-center gap-3 pb-2 shrink-0"
      >
        <div className="relative mb-1">
          <img
            src={video.authorAvatar}
            alt={video.authorName}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-cyan-400/80 shadow-xl"
          />
          {!isAuthor && (
            <button
              type="button"
              aria-label="Follow creator"
              onClick={() => toggleFollowCreator(video.authorId)}
              className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md transition ${
                isFollowing ? 'bg-zinc-700' : 'bg-pink-500 hover:bg-pink-600'
              }`}
            >
              {isFollowing ? (
                <Check className="w-3.5 h-3.5 text-cyan-300" />
              ) : (
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              )}
            </button>
          )}
        </div>

        <div className="flex flex-col items-center">
          <button
            type="button"
            data-testid="like-button"
            aria-label="Like video"
            onClick={() => toggleLikeVideo(video.id)}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white active:scale-105 transition"
          >
            <Heart
              className={`w-6 h-6 transition ${
                isLiked ? 'fill-pink-500 text-pink-500 scale-105' : 'text-white'
              }`}
            />
          </button>
          <span className="text-[11px] font-bold text-zinc-300 mt-1 tabular-nums">
            {video.likesCount}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <button
            type="button"
            data-testid="comment-button"
            aria-label="Open comments"
            onClick={() => onOpenComments(video.id)}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white active:scale-105 transition"
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </button>
          <span className="text-[11px] font-bold text-zinc-300 mt-1 tabular-nums">
            {video.commentsCount}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <button
            type="button"
            data-testid="share-button"
            aria-label="Share video"
            onClick={handleShare}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white active:scale-105 transition"
          >
            <Share2 className="w-6 h-6 text-white" />
          </button>
          <span className="text-[11px] font-bold text-zinc-300 mt-1 tabular-nums">
            {video.sharesCount}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <button
            type="button"
            data-testid="download-button"
            aria-label="Download video"
            onClick={handleDownload}
            title={t('download')}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white active:scale-105 transition"
          >
            <Download className="w-5 h-5 text-cyan-400" />
          </button>
          <span className="text-[10px] font-medium text-zinc-400 mt-0.5">{t('download')}</span>
        </div>

        <div className="flex flex-col items-center">
          <button
            type="button"
            data-testid="short-ai-toggle"
            aria-label="Toggle BasharTube AI insights"
            onClick={() => setShowShortSideAi(!showShortSideAi)}
            className={`min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full border transition ${
              showShortSideAi
                ? 'bg-cyan-500 text-black border-cyan-400'
                : 'bg-zinc-900 hover:bg-zinc-800 border-cyan-500/40 text-cyan-400'
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <span className="text-[10px] font-bold text-cyan-400 mt-0.5">AI</span>
        </div>
      </div>

      {/* Expandable BasharTube AI Side Companion for Short Video */}
      {showShortSideAi && (
        <aside
          data-testid="short-video-ai-panel"
          className="w-full max-w-[390px] md:w-[310px] rounded-3xl bg-zinc-900/95 border border-cyan-500/30 p-4 space-y-3 shadow-2xl self-center md:self-end"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>BasharTube AI</span>
            </span>
            <button
              type="button"
              onClick={() => setShowShortSideAi(false)}
              aria-label="Close AI side panel"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {video.aiSummary && (
            <p className="text-xs text-zinc-300 leading-relaxed">{video.aiSummary}</p>
          )}

          {!aiReply && (
            <button
              type="button"
              onClick={() =>
                handleAskVideoAi(
                  undefined,
                  language === 'bn'
                    ? 'এই শর্ট ভিডিওটি সংক্ষেপে ব্যাখ্যা করো।'
                    : 'Briefly explain this short video.'
                )
              }
              className="w-full min-h-[40px] py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-cyan-400 transition"
            >
              {language === 'bn' ? 'AI দিয়ে সারাংশ দেখুন' : 'Summarize with BasharTube AI'}
            </button>
          )}

          {aiReply && (
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {aiReply}
            </div>
          )}
          {aiError && <p className="text-[11px] text-rose-400">{aiError}</p>}

          <form onSubmit={(e) => handleAskVideoAi(e)} className="flex items-center gap-1.5">
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder={
                language === 'bn' ? 'AI-কে প্রশ্ন করুন...' : 'Ask BasharTube AI...'
              }
              className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!aiQuestion.trim() || isAiAsking}
              aria-label="Ask BasharTube AI"
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-cyan-500 text-black hover:brightness-110 disabled:opacity-40 transition"
            >
              {isAiAsking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </form>
        </aside>
      )}
    </article>
  );
};
