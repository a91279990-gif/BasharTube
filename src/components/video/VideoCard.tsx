import React, { useRef, useState, useEffect } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Download, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Plus, 
  Check, 
  CheckCircle,
  MoreVertical,
  Lock,
  Globe,
  Sliders,
  Gauge,
  Subtitles,
  Trash2,
  MessageSquareOff
} from 'lucide-react';
import { VideoItem, VideoVisibility } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useVideo } from '../../context/VideoContext';
import { useLanguage } from '../../context/LanguageContext';
import { useMonetization } from '../../context/MonetizationContext';

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
  onOpenAuth
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
    selectedQuality,
    setSelectedQuality,
    activeSubtitleLang,
    setActiveSubtitleLang,
    deleteVideo,
    updateVideoVisibility,
    toggleVideoComments
  } = useVideo();
  const { recordRealEngagement } = useMonetization();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [showShareToast, setShowShareToast] = useState<boolean>(false);
  const [showDownloadToast, setShowDownloadToast] = useState<string | null>(null);

  const watchSecondsRef = useRef<number>(0);
  const hasRecordedInitialViewRef = useRef<boolean>(false);

  useEffect(() => {
    watchSecondsRef.current = 0;
    hasRecordedInitialViewRef.current = false;
  }, [video.id]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && isPlaying) {
      interval = setInterval(() => {
        watchSecondsRef.current += 1;
        // At 5 seconds and subsequently every 15s, register real valid engagement
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

  const isLiked = likedVideoIds.has(video.id);
  const isFollowing = followedCreatorIds.has(video.authorId);
  const isAuthor = currentUser?.id === video.authorId;

  // Handle video autoplay / pause based on active visibility
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.muted = isMuted;

      if (isActive) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              incrementViews(video.id);
            })
            .catch(() => {
              // Browser may require user gesture for sound-on autoplay
              if (videoRef.current) {
                videoRef.current.muted = true;
                videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
              }
            });
        }
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive, playbackSpeed, isMuted, video.id]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
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
    // Simulate real download trigger
    const link = document.createElement('a');
    link.href = video.videoUrl;
    link.download = `BasharTube_${video.title.slice(0, 20)}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowDownloadToast(language === 'bn' ? 'ভিডিও ডাউনলোড শুরু হয়েছে...' : 'Downloading video...');
    setTimeout(() => setShowDownloadToast(null), 2500);
  };

  return (
    <div className="relative w-full h-[85vh] sm:h-[88vh] max-w-[460px] mx-auto rounded-3xl overflow-hidden bg-black shadow-2xl border border-zinc-800/80 group select-none">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl}
        loop
        playsInline
        preload={preferences.dataSaver ? 'metadata' : 'auto'}
        onClick={togglePlayPause}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Play/Pause Overlay indicator when paused */}
      {!isPlaying && (
        <div 
          onClick={togglePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer pointer-events-auto"
        >
          <div className="w-16 h-16 rounded-full bg-cyan-500/80 text-black flex items-center justify-center shadow-2xl backdrop-blur-sm animate-in zoom-in-75">
            <Play className="w-8 h-8 fill-black ml-1" />
          </div>
        </div>
      )}

      {/* Top badges: Visibility, Data Saver, Subtitle Indicator */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-2">
          {video.visibility === 'private' ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-pink-500/80 text-white backdrop-blur-md shadow">
              <Lock className="w-3 h-3" />
              <span>{t('privateVideo')}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/50 text-cyan-400 backdrop-blur-md border border-cyan-500/30">
              <Globe className="w-3 h-3" />
              <span>{video.category || 'BasharTube'}</span>
            </span>
          )}

          {preferences.dataSaver && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/80 text-black">
              DATA SAVER
            </span>
          )}
        </div>

        {/* Top Right Quick Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Mute/Unmute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-zinc-700/50 transition"
            title={isMuted ? t('soundOff') : t('soundOn')}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-pink-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Quick Settings (Speed, Quality, Subtitles) */}
          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-zinc-700/50 transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showSettingsMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900/95 border border-zinc-800 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl z-30 animate-in fade-in">
                {/* Playback speed */}
                <div className="mb-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-cyan-400" />
                    <span>{t('speed')}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[0.5, 1, 1.5, 2].map((s) => (
                      <button
                        key={s}
                        onClick={() => { setPlaybackSpeed(s); setShowSettingsMenu(false); }}
                        className={`text-xs py-1 rounded-lg font-semibold transition ${
                          playbackSpeed === s ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-300 hover:text-white'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subtitle Selector */}
                <div className="mb-2 border-t border-zinc-800 pt-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Subtitles className="w-3 h-3 text-cyan-400" />
                    <span>{t('subtitles')}</span>
                  </div>
                  <div className="flex gap-1">
                    {[
                      { id: 'off', label: 'Off' },
                      { id: 'bn', label: 'বাংলা' },
                      { id: 'en', label: 'EN' }
                    ].map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => { setActiveSubtitleLang(sub.id as any); setShowSettingsMenu(false); }}
                        className={`text-xs flex-1 py-1 rounded-lg font-semibold transition ${
                          activeSubtitleLang === sub.id ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Creator specific controls */}
                {isAuthor && (
                  <div className="border-t border-zinc-800 pt-2 space-y-1">
                    <button
                      onClick={() => {
                        updateVideoVisibility(video.id, video.visibility === 'public' ? 'private' : 'public');
                        setShowSettingsMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                    >
                      {video.visibility === 'public' ? <Lock className="w-3.5 h-3.5 text-pink-400" /> : <Globe className="w-3.5 h-3.5 text-cyan-400" />}
                      <span>{video.visibility === 'public' ? 'Make Private' : 'Make Public'}</span>
                    </button>

                    <button
                      onClick={() => {
                        toggleVideoComments(video.id, !video.commentsEnabled);
                        setShowSettingsMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                    >
                      <MessageSquareOff className="w-3.5 h-3.5 text-amber-400" />
                      <span>{video.commentsEnabled ? t('turnOffComments') : t('turnOnComments')}</span>
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(t('deleteVideoConfirm'))) {
                          deleteVideo(video.id);
                        }
                        setShowSettingsMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('deleteVideo')}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subtitles Overlay if enabled */}
      {activeSubtitleLang !== 'off' && video.hasSubtitles && video.subtitles && (
        <div className="absolute bottom-28 left-6 right-16 pointer-events-none z-20 text-center">
          <p className="inline-block bg-black/80 text-cyan-300 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium backdrop-blur-md border border-cyan-500/20 shadow-lg">
            {activeSubtitleLang === 'bn' ? (video.subtitles.bn?.split('\n')[0] || video.title) : (video.subtitles.en?.split('\n')[0] || video.title)}
          </p>
        </div>
      )}

      {/* Bottom Info: Creator, Title, Music */}
      <div className="absolute bottom-4 left-4 right-16 pointer-events-none z-20 flex flex-col gap-1.5 text-white">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="font-bold text-sm tracking-wide hover:underline cursor-pointer flex items-center gap-1">
            {video.authorName}
            {video.isAuthorVerified && (
              <CheckCircle className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
            )}
          </span>
          <span className="text-xs text-zinc-400">@{video.authorUsername}</span>
        </div>

        <h3 className="text-sm font-semibold line-clamp-2 drop-shadow-md pr-2">
          {video.title}
        </h3>

        {video.description && (
          <p className="text-xs text-zinc-300 line-clamp-1 drop-shadow-sm">
            {video.description}
          </p>
        )}

        {/* Audio Track */}
        <div className="flex items-center gap-1.5 text-xs text-cyan-400 mt-1 pointer-events-auto">
          <Volume2 className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-medium max-w-[220px] truncate">
            {video.musicTitle || 'Original Audio'} • @{video.authorUsername}
          </span>
        </div>
      </div>

      {/* Right Action Bar (Heart, Comments, Share, Download, Creator Avatar) */}
      <div className="absolute bottom-6 right-3 flex flex-col items-center gap-3.5 z-20 pointer-events-auto">
        {/* Creator Avatar with Follow Button */}
        <div className="relative group/avatar">
          <img
            src={video.authorAvatar}
            alt={video.authorName}
            className="w-11 h-11 rounded-full object-cover border-2 border-cyan-400 shadow-xl"
          />
          {!isAuthor && (
            <button
              onClick={() => toggleFollowCreator(video.authorId)}
              className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md transition ${
                isFollowing ? 'bg-zinc-700' : 'bg-pink-500 hover:bg-pink-600 scale-105'
              }`}
            >
              {isFollowing ? <Check className="w-3 h-3 text-cyan-300" /> : <Plus className="w-3 h-3 stroke-[3]" />}
            </button>
          )}
        </div>

        {/* Like Button */}
        <div className="flex flex-col items-center">
          <button
            data-testid="like-button"
            aria-label="Like video"
            onClick={() => toggleLikeVideo(video.id)}
            className="p-2.5 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-zinc-800 text-white active:scale-125 transition"
          >
            <Heart className={`w-6 h-6 transition ${isLiked ? 'fill-pink-500 text-pink-500 scale-110' : 'text-white'}`} />
          </button>
          <span className="text-[11px] font-bold text-white mt-0.5">
            {video.likesCount > 1000 ? (video.likesCount / 1000).toFixed(1) + 'k' : video.likesCount}
          </span>
        </div>

        {/* Comment Button */}
        <div className="flex flex-col items-center">
          <button
            data-testid="comment-button"
            aria-label="Open comments"
            onClick={() => onOpenComments(video.id)}
            className="p-2.5 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-zinc-800 text-white active:scale-110 transition"
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </button>
          <span className="text-[11px] font-bold text-white mt-0.5">
            {video.commentsCount}
          </span>
        </div>

        {/* Share Button */}
        <div className="flex flex-col items-center">
          <button
            data-testid="share-button"
            aria-label="Share video"
            onClick={handleShare}
            className="p-2.5 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-zinc-800 text-white active:scale-110 transition"
          >
            <Share2 className="w-6 h-6 text-white" />
          </button>
          <span className="text-[11px] font-bold text-white mt-0.5">
            {video.sharesCount}
          </span>
        </div>

        {/* Download Button (Must be logged in per requirement) */}
        <div className="flex flex-col items-center">
          <button
            data-testid="download-button"
            aria-label="Download video"
            onClick={handleDownload}
            title={t('download')}
            className="p-2.5 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-zinc-800 text-white active:scale-110 transition"
          >
            <Download className="w-5 h-5 text-cyan-400" />
          </button>
          <span className="text-[10px] font-medium text-zinc-400 mt-0.5">
            {t('download')}
          </span>
        </div>

        {/* Spinning Music Disc */}
        <div className="mt-1 w-9 h-9 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center animate-spin [animation-duration:4s]">
          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-cyan-400 to-pink-500" />
        </div>
      </div>

      {/* Share Toast */}
      {showShareToast && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-2xl bg-cyan-500 text-black font-bold text-xs shadow-2xl backdrop-blur-md animate-in fade-in zoom-in z-30">
          {language === 'bn' ? 'ভিডিও লিংক কপি হয়েছে!' : 'Video link copied to clipboard!'}
        </div>
      )}

      {/* Download Toast */}
      {showDownloadToast && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2.5 rounded-2xl bg-zinc-900/95 border border-zinc-700 text-white font-medium text-xs shadow-2xl backdrop-blur-md animate-in fade-in zoom-in z-30 text-center max-w-[280px]">
          {showDownloadToast}
        </div>
      )}
    </div>
  );
};
