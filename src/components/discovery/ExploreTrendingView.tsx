import React, { useState } from 'react';
import { 
  Search, 
  Flame, 
  Sparkles, 
  Compass, 
  Eye, 
  Heart, 
  Users, 
  CheckCircle,
  Play
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useVideo } from '../../context/VideoContext';
import { DEFAULT_PLATFORM_SETTINGS } from '../../data/mockData';
import { VideoItem, UserProfile } from '../../types';

interface ExploreTrendingViewProps {
  onSelectVideo: (videoId: string) => void;
  onOpenUpload: () => void;
}

const CATEGORIES = [
  'All',
  'Travel & Nature',
  'Food & Cooking',
  'Technology & Science',
  'Entertainment',
  'Comedy & Funny',
  'Education & Learning',
  'Culture & Lifestyle'
];

export const ExploreTrendingView: React.FC<ExploreTrendingViewProps> = ({
  onSelectVideo,
  onOpenUpload
}) => {
  const { t, language } = useLanguage();
  const { videos } = useVideo();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'relevance' | 'popular' | 'latest'>('popular');

  // Filter public videos
  const publicVideos = videos.filter(v => v.visibility === 'public');

  const filteredVideos = publicVideos.filter(v => {
    const matchesCategory = selectedCategory === 'All' || v.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() || 
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'popular') return (b.likesCount + b.viewsCount) - (a.likesCount + a.viewsCount);
    if (sortBy === 'latest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return 0; // relevance
  });

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 w-full animate-in fade-in pb-16">
      {/* Top Banner */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-pink-950/40 border border-zinc-800 shadow-xl mb-6">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold mb-3 border border-cyan-500/30">
            <Flame className="w-3.5 h-3.5" />
            <span>Trending in Bangladesh</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-white font-['Plus_Jakarta_Sans'] leading-tight mb-2">
            {language === 'bn' ? 'সোশ্যাল ট্রেন্ডিং ও এক্সপ্লোর' : 'Discover Trending Shorts & Creators'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 font-['Hind_Siliguri']">
            {language === 'bn' 
              ? 'বাংলাদেশের ৬৪ জেলার সংস্কৃতি, ঐতিহ্য, ভ্রমণ এবং শীর্ষ ভাইরাল ভিডিও মুহূর্ত।' 
              : 'Explore viral videos, Bangladeshi culture, travel, and inspiring creators.'}
          </p>
        </div>
      </div>

      {/* Trending Search Chips (Super Admin Managed) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Tags:
        </span>
        {DEFAULT_PLATFORM_SETTINGS.trendingSearchTerms.map((term) => (
          <button
            key={term}
            onClick={() => setSearchQuery(term)}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition border ${
              searchQuery === term 
                ? 'bg-cyan-500 text-black font-bold border-cyan-400' 
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
          >
            {term}
          </button>
        ))}
      </div>

      {/* Search Input & Sort Selector */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'bn' ? 'ভিডিও, ক্যাটাগরি বা ক্রিয়েটর খুঁজুন...' : 'Search videos, tags or creators...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
          />
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-2xl border border-zinc-800 self-stretch sm:self-auto">
          {[
            { id: 'popular', label: 'Most Popular' },
            { id: 'latest', label: 'Latest' },
            { id: 'relevance', label: 'Relevance' }
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSortBy(s.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                sortBy === s.id ? 'bg-cyan-500 text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition border ${
              selectedCategory === cat
                ? 'bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-bold border-transparent shadow-md shadow-cyan-500/20'
                : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border-zinc-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Creator Discovery Section */}
      {(() => {
        const registeredUsers: UserProfile[] = (() => {
          try {
            const saved = localStorage.getItem('bashartube_registered_accounts');
            return saved ? JSON.parse(saved) : [];
          } catch {
            return [];
          }
        })();

        if (registeredUsers.length === 0) return null;

        return (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
              <Users className="w-4 h-4 text-pink-400" />
              <span>{language === 'bn' ? 'নতুন ক্রিয়েটর ও চ্যানেলসমূহ' : 'Featured Creators & Channels'}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {registeredUsers.slice(0, 4).map((usr) => (
                <div
                  key={usr.id}
                  className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col items-center text-center hover:border-cyan-500/40 transition group"
                >
                  <img
                    src={usr.avatarUrl}
                    alt={usr.displayName}
                    className="w-14 h-14 rounded-full object-cover border-2 border-cyan-400/50 mb-2 group-hover:scale-105 transition"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-white truncate max-w-[120px]">
                      {usr.channelName || usr.displayName}
                    </span>
                    {usr.isVerified && <CheckCircle className="w-3 h-3 text-cyan-400 fill-cyan-400" />}
                  </div>
                  <span className="text-[10px] text-zinc-500">@{usr.username}</span>
                  <span className="text-[10px] font-semibold text-cyan-400 mt-1">
                    {usr.followersCount} followers
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Video Grid */}
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
        <Compass className="w-4 h-4 text-cyan-400" />
        <span>{language === 'bn' ? 'ট্রেন্ডিং ভিডিও সংগ্রহ' : 'Trending Videos'} ({filteredVideos.length})</span>
      </h3>

      {filteredVideos.length === 0 ? (
        <div className="py-14 px-4 rounded-3xl bg-zinc-900/50 border border-zinc-800 text-center max-w-md mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center mx-auto mb-3 text-cyan-400 shadow-xl">
            <Compass className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">
            {language === 'bn' ? 'কোনো ভিডিও পাওয়া যায়নি' : 'No Videos Found'}
          </h4>
          <p className="text-xs text-zinc-400 mb-4 font-['Hind_Siliguri']">
            {language === 'bn' 
              ? 'বাশারটিউবে আপনার প্রথম ভিডিওটি আপলোড করুন এবং ট্রেন্ডিংয়ে স্থান করে নিন!' 
              : 'Be the first to upload and trend on BasharTube!'}
          </p>
          <button
            onClick={onOpenUpload}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-bold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/20 transition"
          >
            {t('upload')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredVideos.map((vid) => (
            <div
              key={vid.id}
              onClick={() => onSelectVideo(vid.id)}
              className="relative group rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 aspect-[9/16] shadow-lg flex flex-col justify-end p-3 cursor-pointer"
            >
              <img
                src={vid.thumbnailUrl}
                alt={vid.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

              {/* Play icon overlay on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10">
                <div className="w-12 h-12 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-2xl">
                  <Play className="w-6 h-6 fill-black ml-0.5" />
                </div>
              </div>

              {/* Video metadata */}
              <div className="relative z-10">
                <div className="flex items-center gap-1 text-[10px] text-zinc-300 font-semibold mb-1">
                  <span>{vid.authorName}</span>
                  {vid.isAuthorVerified && <CheckCircle className="w-3 h-3 text-cyan-400 fill-cyan-400" />}
                </div>
                <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight drop-shadow mb-1">
                  {vid.title}
                </h4>
                <div className="flex items-center gap-3 text-[10px] text-zinc-300 font-medium">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-cyan-400" />
                    {vid.viewsCount > 1000 ? (vid.viewsCount / 1000).toFixed(0) + 'k' : vid.viewsCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-pink-400" />
                    {vid.likesCount > 1000 ? (vid.likesCount / 1000).toFixed(0) + 'k' : vid.likesCount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
