export type UserRole = 'user' | 'creator' | 'admin' | 'superadmin';

export interface SocialMediaLink {
  id: string;
  platform: 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'other';
  url: string;
  label?: string;
}

export interface UserSession {
  id: string;
  deviceName: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  ipAddress?: string;
  lastActive: string;
  loginAt?: string;
  isCurrent: boolean;
  sessionToken?: string;
  tokenExpiresAt?: string;
  tokenStatus?: 'active' | 'revoked';
}


export interface UserProfile {
  id: string; // Auth UID
  email: string;
  password?: string; // Stored securely in accounts
  username: string;
  handle?: string; // Always starts with @, e.g. @tanvir_vlogs
  displayName: string; // Owner Name
  channelName?: string; // Official Channel Name
  birthdate?: string; // Strictly private
  bio: string;
  avatarUrl: string; // Channel Logo / Avatar (publicly downloadable)
  coverUrl?: string; // Optional/legacy
  websiteUrl: string;
  role: UserRole;
  isVerified: boolean;
  isKidsAccount: boolean;
  parentUid?: string;
  followersCount: number;
  followingCount: number;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  isSuspended: boolean;
  suspensionExpiresAt?: string;
  createdAt: string;
  updatedAt?: string;

  // Security Question & Answer (Item 2 & 3)
  securityQuestion?: string;
  securityAnswer?: string;

  // Social Media Links (Item 9)
  socialLinks?: SocialMediaLink[];

  // Device & Session Management (Item 4 & 5)
  sessions?: UserSession[];

  // Creator Income & Monetization System
  monetizationStatus?: 'not_eligible' | 'eligible' | 'pending_review' | 'monetized' | 'rejected' | 'suspended';
  monetizationRejectionReason?: string;
  monetizationApprovedAt?: string;
  bKashNumber?: string;
  bKashAccountType?: 'personal' | 'agent' | 'merchant';
  availableBalance?: number; // ৳ BDT
  pendingWithdrawalBalance?: number; // ৳ BDT
  totalWithdrawnBalance?: number; // ৳ BDT
  lifetimeEarnings?: number; // ৳ BDT
  validViewsCount?: number; // Validated views count
  validWatchTimeHours?: number; // Validated watch time in hours
}

export type VideoVisibility = 'public' | 'private';

export interface VideoSubtitles {
  bn?: string;
  en?: string;
}

export interface VideoItem {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  isAuthorVerified: boolean;
  title: string;
  description: string;
  videoUrl: string;
  originalVideoUrl?: string;
  compressedVideoUrl?: string;
  thumbnailUrl: string;
  duration: number; // in seconds, max 600
  category: string;
  visibility: VideoVisibility;
  viewsCount: number;
  likesCount: number;
  sharesCount: number;
  commentsCount: number;
  commentsEnabled: boolean;
  musicId?: string;
  musicTitle?: string;
  musicArtist?: string;
  musicCover?: string;
  hasSubtitles: boolean;
  subtitles?: VideoSubtitles;
  aiModerationStatus: 'approved' | 'flagged' | 'removed';
  isKidsSafe: boolean;
  validViewsCount?: number;
  validWatchTimeHours?: number;
  totalEarnings?: number; // ৳ BDT
  createdAt: string;
}

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface CommentReaction {
  id: string;
  commentId: string;
  userId: string;
  username: string;
  userAvatar: string;
  reactionType: ReactionType;
  createdAt: string;
}

export interface CommentReply {
  id: string;
  commentId: string;
  videoId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  text: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CommentItem {
  id: string;
  videoId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  isAuthorVerified: boolean;
  text: string;
  isEdited: boolean;
  isPinned: boolean;
  hasCreatorHeart: boolean;
  likesCount: number;
  repliesCount: number;
  reactions: {
    like: number;
    love: number;
    haha: number;
    wow: number;
    sad: number;
    angry: number;
  };
  mediaImages?: string[]; // max 5
  mediaVideoUrl?: string; // max 1
  voiceUrl?: string; // max 1
  voiceDuration?: number;
  voiceTranscription?: string;
  aiModerationStatus: 'approved' | 'flagged' | 'hidden';
  createdAt: string;
  updatedAt?: string;
}

export type MessageType = 'text' | 'image' | 'video' | 'voice' | 'file';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'seen';

export interface MessageItem {
  id: string;
  chatId: string;
  senderId: string;
  recipientId: string;
  text: string;
  messageType: MessageType;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  voiceDuration?: number;
  status: MessageStatus;
  isEdited: boolean;
  editHistory?: { text: string; editedAt: string }[];
  isDeletedForEveryone?: boolean;
  deletedForUserIds?: string[];
  isOfflineQueued?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatItem {
  id: string;
  userAId: string;
  userBId: string;
  otherUser?: UserProfile;
  lastMessageText: string;
  lastMessageSenderId: string;
  lastMessageAt: string;
  unreadCount?: number;
  isPinned?: boolean;
  wallpaper?: string;
  updatedAt: string;
}

export type CallType = 'voice' | 'video';
export type CallStatus = 'calling' | 'accepted' | 'declined' | 'missed' | 'ended';

export interface CallItem {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  type: CallType;
  status: CallStatus;
  duration: number; // in seconds
  createdAt: string;
  endedAt?: string;
}

export type NotificationType =
  | 'like'
  | 'comment'
  | 'reply'
  | 'reaction'
  | 'creator_heart'
  | 'follow'
  | 'comment_deleted'
  | 'message'
  | 'call_missed'
  | 'verification_update'
  | 'ai_moderation';

export interface NotificationItem {
  id: string;
  userId: string;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl: string;
  duration: number;
  useCount: number;
  isAvailable: boolean;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  reason: string;
  supportingDocUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewerId?: string;
}

export interface PlatformSettings {
  maxVideoDurationSeconds: number; // default 600 (10 min)
  maxVideoUploadSizeMB: number;
  maxCommentLength: number;
  trendingSearchTerms: string[];
  aiModerationStrictness: 'low' | 'medium' | 'high';
}

export interface NotificationCategorySettings {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  messages: boolean;
  calls: boolean;
  videoUploads: boolean;
}

export interface UserPreferences {
  dataSaver: boolean;
  soundEnabled: boolean;
  typingIndicatorEnabled: boolean;
  seenStatusEnabled: boolean; // Item 13: Messenger Seen Status toggle
  chatWallpaper: string;
  blockedUserIds: string[];
  dontRecommendCreatorIds: string[];
  notificationCategories: NotificationCategorySettings; // Item 12: Advanced Notification Settings
}

// ==========================================
// CREATOR INCOME & MONETIZATION SYSTEM TYPES
// ==========================================

export type MonetizationStatus = 
  | 'not_eligible' 
  | 'eligible' 
  | 'pending_review' 
  | 'monetized' 
  | 'rejected' 
  | 'suspended';

export interface MonetizationApplication {
  id: string;
  creatorId: string;
  creatorName: string;
  channelName: string;
  creatorEmail: string;
  creatorAvatar: string;
  handle: string;
  appliedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  validViews: number; // Threshold: >= 100,000,000 (10 Crore)
  validWatchTimeHours: number; // Threshold: >= 10,000 Hours
  followersCount: number; // Threshold: >= 10,000
  originalContentCertified: boolean;
  reviewedAt?: string;
  reviewerId?: string;
  rejectionReason?: string;
}

export type EarningTransactionType = 
  | 'views_income' 
  | 'watch_time_income' 
  | 'withdrawal' 
  | 'adjustment' 
  | 'bonus';

export interface EarningTransaction {
  id: string;
  creatorId: string;
  videoId?: string;
  videoTitle?: string;
  type: EarningTransactionType;
  amount: number; // BDT ৳
  validUnits: number; // e.g. 5,000 views or 12 hours
  rateApplied: string; // e.g. "৳১০ / ১,০০০ ভিউ" or "৳১ / ১ ঘণ্টা ওয়াচ টাইম"
  status: 'completed' | 'pending' | 'rejected';
  timestamp: string;
  bKashNumber?: string;
  bKashTrxId?: string;
  note?: string;
}

export interface WithdrawalRequest {
  id: string;
  creatorId: string;
  creatorName: string;
  channelName: string;
  handle: string;
  amount: number; // Min ৳10,000
  bKashNumber: string;
  bKashAccountType: 'personal' | 'agent' | 'merchant';
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  bKashTrxId?: string;
  rejectionReason?: string;
}

export interface AntiFraudLog {
  id: string;
  creatorId?: string;
  videoId?: string;
  videoTitle?: string;
  type: 'bot_detection' | 'loop_spam' | 'ip_burst' | 'watch_time_anomaly';
  actionTaken: 'discarded' | 'flagged' | 'quarantined';
  details: string;
  timestamp: string;
}

