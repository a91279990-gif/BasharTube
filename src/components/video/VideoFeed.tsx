import React, { useRef, useState, useEffect, useCallback } from 'react';
import { VideoCard } from './VideoCard';
import { useVideo, VideoFormatFilter } from '../../context/VideoContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  ChevronUp,
  ChevronDown,
  Video,
  Sparkles,
  Smartphone,
  MonitorPlay,
  Upload,
} from 'lucide-react';
import { motion } from 'motion/react';

interface VideoFeedProps {
  onOpenComments: (videoId: string) => void;
  onOpenAuth: () => void;
  onOpenUpload: () => void;
  onOpenAiStudio?: () => void;
}

export const VideoFeed: React.FC<VideoFeedProps> = ({
  onOpenComments,
  onOpenAuth,
  onOpenUpload,
  onOpenAiStudio,
}) => {
  const {
    filteredVideos,
    formatFilter,
    setFormatFilter,
    activeVideoId,
    setActiveVideoId,
  } = useVideo();
  const { language } = useLanguage();
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  const scrollToIndex = useCallback((idx: number, instant = false) => {
    const container = feedContainerRef.current;
    if (!container) return;
    const cards = container.children;
    if (cards[idx]) {
      cards[idx].scrollIntoView({
        behavior: instant ? 'auto' : 'smooth',
        block: 'center',
      });
    } else if (idx === 0) {
      container.scrollTo({ top: 0, behavior: instant ? 'auto' : 'smooth' });
    }
  }, []);

  // Synchronize scroll & active index when activeVideoId or formatFilter changes
  useEffect(() => {
    if (filteredVideos.length === 0) {
      setActiveIndex(0);
      return;
    }
    const idx = activeVideoId
      ? filteredVideos.findIndex((v) => v.id === activeVideoId)
      : 0;
    const targetIdx = idx !== -1 ? idx : 0;
    setActiveIndex(targetIdx);
    requestAnimationFrame(() => scrollToIndex(targetIdx, targetIdx === 0));
  }, [activeVideoId, formatFilter, filteredVideos.length, scrollToIndex]);

  const scrollNext = useCallback(() => {
    if (activeIndex < filteredVideos.length - 1) {
      const nextIdx = activeIndex + 1;
      setActiveIndex(nextIdx);
      if (filteredVideos[nextIdx]) setActiveVideoId(filteredVideos[nextIdx].id);
      scrollToIndex(nextIdx);
    }
  }, [activeIndex, filteredVideos, setActiveVideoId, scrollToIndex]);

  const scrollPrev = useCallback(() => {
    if (activeIndex > 0) {
      const prevIdx = activeIndex - 1;
      setActiveIndex(prevIdx);
      if (filteredVideos[prevIdx]) setActiveVideoId(filteredVideos[prevIdx].id);
      scrollToIndex(prevIdx);
    }
  }, [activeIndex, filteredVideos, setActiveVideoId, scrollToIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollNext, scrollPrev]);

  useEffect(() => {
    const container = feedContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const indexAttr = entry.target.getAttribute('data-index');
            if (indexAttr !== null) {
              const parsed = parseInt(indexAttr, 10);
              setActiveIndex(parsed);
            }
          }
        });
      },
      { threshold: 0.55 }
    );

    Array.from(container.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [filteredVideos]);

  // Strictly two format buttons — ZERO counts displayed anywhere
  const filterButtons: Array<{
    id: VideoFormatFilter;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'short',
      label: language === 'bn' ? 'শর্ট ভিডিও' : 'Short Videos',
      icon: Smartphone,
    },
    {
      id: 'long',
      label: language === 'bn' ? 'লং ভিডিও' : 'Long Videos',
      icon: MonitorPlay,
    },
  ];

  const handleSelectFormat = (id: VideoFormatFilter) => {
    setFormatFilter(id);
    setActiveIndex(0);
    setActiveVideoId(null);
    requestAnimationFrame(() => scrollToIndex(0, true));
  };

  const renderFormatSwitcher = (layoutId: string) => (
    <div
      role="tablist"
      aria-label="Video format switcher"
      className="inline-flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md p-1 rounded-2xl border border-zinc-800/90"
    >
      {filterButtons.map((btn) => {
        const Icon = btn.icon;
        const isSelected = formatFilter === btn.id;
        return (
          <button
            key={btn.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => handleSelectFormat(btn.id)}
            className={`relative min-h-[40px] flex items-center gap-2 px-4 sm:px-5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              isSelected ? 'text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {isSelected && (
              <motion.span
                layoutId={layoutId}
                className={`absolute inset-0 rounded-xl shadow-sm ${
                  btn.id === 'short'
                    ? 'bg-gradient-to-r from-cyan-400 to-sky-400'
                    : 'bg-gradient-to-r from-pink-500 to-rose-400'
                }`}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              />
            )}
            <Icon className="w-4 h-4 relative z-10" />
            <span className="relative z-10">{btn.label}</span>
          </button>
        );
      })}
    </div>
  );

  // Clean empty stage when no videos exist in the selected format (Short or Long)
  if (filteredVideos.length === 0) {
    return (
      <div
        data-testid="empty-feed-state"
        className="flex flex-col items-center justify-center min-h-[calc(100vh-70px)] text-center px-4 py-8 animate-in fade-in duration-500"
      >
        <div className="mb-8">{renderFormatSwitcher('homeEmptyFormatIndicator')}</div>

        <div className="max-w-lg w-full rounded-3xl bg-zinc-950/90 border border-zinc-800/90 p-8 sm:p-10 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-xl flex items-center justify-center mx-auto mb-5">
            {formatFilter === 'long' ? (
              <MonitorPlay className="w-8 h-8 text-pink-400 stroke-[1.75]" />
            ) : (
              <Video className="w-8 h-8 text-cyan-400 stroke-[1.75]" />
            )}
          </div>

          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-400 mb-2">
            BasharTube Creator Stage
          </p>

          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 font-['Plus_Jakarta_Sans'] tracking-tight leading-snug">
            {formatFilter === 'long'
              ? language === 'bn'
                ? 'এখনো কোনো লং ভিডিও আপলোড করা হয়নি'
                : 'No Long Videos Uploaded Yet'
              : language === 'bn'
              ? 'এখনো কোনো শর্ট ভিডিও আপলোড করা হয়নি'
              : 'No Short Videos Uploaded Yet'}
          </h2>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mb-7 font-['Hind_Siliguri'] leading-relaxed">
            {formatFilter === 'long'
              ? language === 'bn'
                ? 'কোনো নকল বা ডেমো ভিডিও নেই। ১৬:৯ লং ভিডিও আপলোড করলে তা লং ভিডিও ফিডে যুক্ত হবে।'
                : 'Zero demo clips. Upload a real 16:9 Long video to publish it in Long Videos.'
              : language === 'bn'
              ? 'কোনো নকল বা ডেমো ভিডিও নেই। ৯:১৬ শর্ট ভিডিও আপলোড করলে তা শর্ট ভিডিও ফিডে যুক্ত হবে।'
              : 'Zero demo clips. Upload a real 9:16 Short video to publish it in Short Videos.'}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenUpload}
              className="min-h-[48px] flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-pink-500 text-black font-extrabold text-sm hover:brightness-110 active:scale-[0.98] transition shadow-xl shadow-cyan-500/20 whitespace-nowrap"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span>
                {language === 'bn' ? 'ভিডিও আপলোড করুন' : 'Upload Video'}
              </span>
            </button>

            {onOpenAiStudio && (
              <button
                type="button"
                onClick={onOpenAiStudio}
                className="min-h-[48px] flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-cyan-300 font-bold text-sm transition whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>BasharTube AI Studio</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-61px)] flex flex-col items-center overflow-hidden">
      {/* Sleek Home Feed Bar: Strictly Short vs Long switcher (Zero video counts revealed) */}
      <div className="w-full max-w-6xl px-3 sm:px-6 pt-3 pb-1.5 z-20 flex items-center justify-between gap-3 shrink-0">
        {renderFormatSwitcher('homeFormatTabIndicator')}

        <button
          type="button"
          onClick={onOpenUpload}
          className="min-h-[40px] hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-cyan-300 transition whitespace-nowrap"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'নতুন ভিডিও' : 'Upload'}</span>
        </button>
      </div>

      {/* Scrollable Vertical Feed displaying ONLY the selected format (Short OR Long) */}
      <div
        ref={feedContainerRef}
        className="w-full flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar flex flex-col items-center px-1"
      >
        {filteredVideos.map((video, idx) => (
          <motion.div
            key={video.id}
            data-index={idx}
            className="w-full min-h-full snap-center flex items-center justify-center py-3 shrink-0"
            initial={{ opacity: 0.9, scale: 0.985, y: 12 }}
            animate={{
              opacity: idx === activeIndex ? 1 : 0.85,
              scale: idx === activeIndex ? 1 : 0.98,
              y: 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 290,
              damping: 26,
              mass: 0.8,
            }}
          >
            <VideoCard
              video={video}
              isActive={idx === activeIndex}
              onOpenComments={onOpenComments}
              onOpenAuth={onOpenAuth}
            />
          </motion.div>
        ))}
      </div>

      {/* Floating vertical navigation arrows */}
      {filteredVideos.length > 1 && (
        <div className="hidden xl:flex flex-col gap-2 absolute right-5 bottom-6 z-30">
          <button
            type="button"
            onClick={scrollPrev}
            disabled={activeIndex === 0}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-zinc-900/90 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-white border border-zinc-700/70 shadow-xl backdrop-blur-md transition"
            aria-label="Previous video"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            disabled={activeIndex >= filteredVideos.length - 1}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-zinc-900/90 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-white border border-zinc-700/70 shadow-xl backdrop-blur-md transition"
            aria-label="Next video"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
