import { VideoItem, MusicTrack, UserProfile, CommentItem, PlatformSettings } from '../types';

export const SUPER_ADMIN_EMAIL = 'a91279990@gmail.com';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  maxVideoDurationSeconds: 3600, // 60 minutes (supports both Short & Long videos)
  maxVideoUploadSizeMB: 1024,
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

export const INITIAL_MUSIC_TRACKS: MusicTrack[] = [];

export const INITIAL_VIDEOS: VideoItem[] = [];

export const INITIAL_COMMENTS: CommentItem[] = [];

