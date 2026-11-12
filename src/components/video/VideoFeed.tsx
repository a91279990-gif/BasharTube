import React, { useRef, useState, useEffect } from 'react';
import { VideoCard } from './VideoCard';
import { useVideo } from '../../context/VideoContext';
import { useLanguage } from '../../context/LanguageContext';
import { ChevronUp, ChevronDown, Video } from 'lucide-react';
import { motion } from 'motion/react';

interface VideoFeedProps {
  onOpenComments: (videoId: string) => void;
  onOpenAuth: () => void;
  onOpenUpload: () => void;
}

export const VideoFeed: React.FC<VideoFeedProps> = ({
  onOpenComments,
  onOpenAuth,
  onOpenUpload
}) => {
  const { filteredVideos, activeFeed } = useVideo();
  const { t, language } = useLanguage();
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation (ArrowUp, ArrowDown)
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
  }, [activeIndex, filteredVideos.length]);

  const scrollNext = () => {
    if (activeIndex < filteredVideos.length - 1) {
      const nextIdx = activeIndex + 1;
      setActiveIndex(nextIdx);
      scrollToIndex(nextIdx);
    }
  };

  const scrollPrev = () => {
    if (activeIndex > 0) {
      const prevIdx = activeIndex - 1;
      setActiveIndex(prevIdx);
      scrollToIndex(prevIdx);
    }
  };

  const scrollToIndex = (idx: number) => {
    if (!feedContainerRef.current) return;
    const cards = feedContainerRef.current.children;
    if (cards[idx]) {
      cards[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Intersection observer to automatically update activeIndex on user manual scroll
  useEffect(() => {
    const container = feedContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const indexAttr = entry.target.getAttribute('data-index');
            if (indexAttr !== null) {
              setActiveIndex(parseInt(indexAttr, 10));
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    Array.from(container.children).forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [filteredVideos]);

  if (filteredVideos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 py-12 animate-in fade-in duration-500">
        {/* Glowing Designer Box */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-sky-500/10 to-pink-500/20 rounded-full blur-2xl animate-pulse pointer-events-none" />
          <div className="relative w-24 h-24 rounded-3xl bg-zinc-900/90 border border-zinc-700/80 p-[2px] shadow-2xl flex items-center justify-center">
            <div className="w-full h-full rounded-[22px] bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
              <Video className="w-10 h-10 text-cyan-400 stroke-[1.75]" />
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-3 shadow">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{language === 'bn' ? 'বাশারটিউব প্রস্তুত' : 'BasharTube Platform Ready'}</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 font-['Plus_Jakarta_Sans'] tracking-tight">
          {language === 'bn' ? 'এখনো কোনো ভিডিও আপলোড করা হয়নি' : 'No Videos Uploaded Yet'}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-8 font-['Hind_Siliguri'] leading-relaxed">
          {language === 'bn' 
            ? 'প্ল্যাটফর্মটি সম্পূর্ণ পরিষ্কার রাখা হয়েছে। আপনার তৈরি করা সুন্দর ভিডিওটি আপলোড করুন এবং চমৎকার ফুল-স্ক্রিন ফিডে উপভোগ করুন!' 
            : 'Start by uploading your first high quality MP4 video to watch in the vertical full-screen feed!'}
        </p>

        {/* Primary Call to Action */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-10">
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-pink-500 text-black font-extrabold text-sm hover:brightness-110 active:scale-95 transition shadow-xl shadow-cyan-500/25"
          >
            <Video className="w-4 h-4 stroke-[2.5]" />
            <span>{language === 'bn' ? 'প্রথম ভিডিও আপলোড করুন' : 'Upload First Video'}</span>
          </button>
        </div>

        {/* Designer Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full text-left">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md">
            <div className="text-cyan-400 text-xs font-bold mb-1 flex items-center gap-1.5">
              <span>✦</span>
              <span>{language === 'bn' ? 'স্মুথ উল্লম্ব ফিড' : 'Smooth Vertical Feed'}</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {language === 'bn' ? 'স্বয়ংক্রিয় অটো-প্লে, কোয়ালিটি ও গতি নিয়ন্ত্রণ।' : 'Autoplay on scroll, speed and 1080p quality.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md">
            <div className="text-pink-400 text-xs font-bold mb-1 flex items-center gap-1.5">
              <span>✦</span>
              <span>{language === 'bn' ? 'উন্নত মন্তব্য ও রিঅ্যাকশন' : 'Rich Comments & Voice'}</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {language === 'bn' ? '৬টি ইমোজি রিঅ্যাকশন, ক্রিয়েটর হার্ট ও ভয়েস বার্তা।' : '6 reaction types, creator heart, and voice audio.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md">
            <div className="text-emerald-400 text-xs font-bold mb-1 flex items-center gap-1.5">
              <span>✦</span>
              <span>{language === 'bn' ? 'নিরাপদ ভিজিবিলিটি' : 'Public & Private'}</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {language === 'bn' ? 'পাবলিক ডিসকভারি অথবা ক্রিয়েটরের একান্ত নিজস্ব প্রাইভেট।' : 'Public discovery or strictly private videos.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-65px)] flex items-center justify-center overflow-hidden">
      {/* Scrollable feed */}
      <div
        ref={feedContainerRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar flex flex-col items-center py-4 space-y-8"
      >
        {filteredVideos.map((video, idx) => (
          <motion.div
            key={video.id}
            data-index={idx}
            className="w-full snap-center flex justify-center py-2 shrink-0"
            initial={{ opacity: 0.85, scale: 0.98, y: 16 }}
            animate={{
              opacity: idx === activeIndex ? 1 : 0.75,
              scale: idx === activeIndex ? 1 : 0.96,
              y: 0
            }}
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 26,
              mass: 0.8
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

      {/* Floating vertical navigation arrows on desktop */}
      <div className="hidden xl:flex flex-col gap-2 absolute right-8 top-1/2 -translate-y-1/2 z-30">
        <button
          onClick={scrollPrev}
          disabled={activeIndex === 0}
          className="p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-white border border-zinc-700/60 shadow-xl backdrop-blur-md transition"
          title="Previous Video (Up Arrow)"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <button
          onClick={scrollNext}
          disabled={activeIndex === filteredVideos.length - 1}
          className="p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-white border border-zinc-700/60 shadow-xl backdrop-blur-md transition"
          title="Next Video (Down Arrow)"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
