import { VideoItem, MusicTrack, UserProfile, CommentItem, PlatformSettings } from '../types';

export const SUPER_ADMIN_EMAIL = 'a91279990@gmail.com';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  maxVideoDurationSeconds: 600, // 10 minutes
  maxVideoUploadSizeMB: 500,
  maxCommentLength: 5000,
  trendingSearchTerms: [
    '#bangladesh',
    '#dhaka',
    '#coxsbazar',
    '#sundarbans',
    '#banglafood',
    '#techbd',
    '#bashartube',
    '#eidvlog',
    '#cricketbd'
  ],
  aiModerationStrictness: 'medium'
};

export const SUPER_ADMIN_PASSWORD = 'Fahmida3421';

export const INITIAL_USERS: UserProfile[] = [];

export const INITIAL_MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'music_1',
    title: 'Ami Banglay Gaan Gai (Acoustic)',
    artist: 'Dhaka Acoustic Ensemble',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-relaxing-in-nature-522.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&h=150&fit=crop',
    duration: 180,
    useCount: 1420,
    isAvailable: true
  },
  {
    id: 'music_2',
    title: 'Bhatiyali Riverside Breeze',
    artist: 'Padma River Strings',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150&h=150&fit=crop',
    duration: 145,
    useCount: 980,
    isAvailable: true
  },
  {
    id: 'music_3',
    title: 'Chalo Dhaka Metro (Urban Beat)',
    artist: 'Bengali Synthwave Lab',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=150&h=150&fit=crop',
    duration: 210,
    useCount: 2310,
    isAvailable: true
  },
  {
    id: 'music_4',
    title: 'Kids Fun Alphabet & Animals Beat',
    artist: 'BasharTube Kids Studio',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-game-level-music-689.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1566140967404-b8b3932483f5?w=150&h=150&fit=crop',
    duration: 90,
    useCount: 450,
    isAvailable: true
  }
];

export const INITIAL_VIDEOS: VideoItem[] = [];

export const INITIAL_COMMENTS: CommentItem[] = [];

