import { CommentItem, CommentReply, UserProfile, VideoItem } from '../types';
import { normalizeHandle } from './handleValidation';
import { resolveVideoFormat } from './videoFormat';

/**
 * Normalizes a website URL cleanly (prepends https:// if missing protocol, allows empty string).
 */
export function formatWebsiteUrl(raw?: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Generates a deterministic crisp inline SVG Data URL avatar so avatars never depend on external domains.
 */
export function generateDefaultAvatarDataUrl(name?: string, seed = 'BT'): string {
  const cleanName = (name || seed || 'B').trim();
  const firstChar = cleanName.charAt(0).toUpperCase() || 'B';
  const palettes = [
    ['#0891b2', '#ec4899'],
    ['#0284c7', '#6366f1'],
    ['#0d9488', '#06b6d4'],
    ['#db2777', '#8b5cf6'],
    ['#2563eb', '#06b6d4'],
  ];
  let hash = 0;
  for (let i = 0; i < cleanName.length; i += 1) {
    hash = (hash * 31 + cleanName.charCodeAt(i)) % 997;
  }
  const [c1, c2] = palettes[Math.abs(hash) % palettes.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}" />
      <stop offset="100%" stop-color="${c2}" />
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="48" fill="#09090b" />
  <rect x="8" y="8" width="224" height="224" rx="42" fill="url(#g)" fill-opacity="0.22" stroke="url(#g)" stroke-width="4" />
  <text x="120" y="142" text-anchor="middle" fill="#f4f4f5" font-family="Plus Jakarta Sans, sans-serif" font-size="96" font-weight="800">${firstChar}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Merges Firestore user records and local user records cleanly by ID,
 * preserving the freshest profile metadata while keeping local password credentials if remote omitted them.
 */
export function mergeUserDirectories(
  firestoreUsers: UserProfile[],
  localUsers: UserProfile[]
): UserProfile[] {
  const byId = new Map<string, UserProfile>();

  const upsert = (user: UserProfile) => {
    if (!user || !user.id) return;
    const normHandle = user.handle
      ? normalizeHandle(user.handle)
      : user.username
      ? normalizeHandle(user.username)
      : '';
    const normalized: UserProfile = {
      ...user,
      handle: normHandle || user.handle,
      username: normHandle ? normHandle.slice(1) : user.username,
    };

    const existing = byId.get(user.id);
    if (!existing) {
      byId.set(user.id, normalized);
      return;
    }

    const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
    const nextTime = new Date(normalized.updatedAt || normalized.createdAt || 0).getTime();
    const newer = nextTime >= existingTime ? normalized : existing;
    const older = nextTime >= existingTime ? existing : normalized;

    byId.set(user.id, {
      ...older,
      ...newer,
      password: newer.password || older.password,
      securityQuestion: newer.securityQuestion || older.securityQuestion,
      securityAnswer: newer.securityAnswer || older.securityAnswer,
      sessions:
        newer.sessions && newer.sessions.length > 0 ? newer.sessions : older.sessions || [],
    });
  };

  localUsers.forEach(upsert);
  firestoreUsers.forEach(upsert);

  const byHandle = new Map<string, UserProfile>();
  Array.from(byId.values()).forEach((user) => {
    const key = (user.handle || `@${user.username || user.id}`).toLowerCase();
    const prev = byHandle.get(key);
    if (!prev) {
      byHandle.set(key, user);
      return;
    }
    const prevTime = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
    const nextTime = new Date(user.updatedAt || user.createdAt || 0).getTime();
    byHandle.set(key, nextTime >= prevTime ? user : prev);
  });

  return Array.from(byHandle.values());
}

/**
 * Propagates updated creator profile details (channelName/displayName, handle/username, avatar, verification)
 * to all videos authored by that user.
 */
export function propagateProfileToVideos(
  videos: VideoItem[],
  updatedUser: UserProfile
): VideoItem[] {
  const nextAuthorName = (updatedUser.channelName || updatedUser.displayName || '').trim();
  const nextUsername = (
    updatedUser.username ||
    normalizeHandle(updatedUser.handle || '').slice(1)
  ).trim();

  return videos.map((video) => {
    if (video.authorId !== updatedUser.id) return video;
    return {
      ...video,
      authorName: nextAuthorName || video.authorName,
      authorUsername: nextUsername || video.authorUsername,
      authorAvatar: updatedUser.avatarUrl || video.authorAvatar,
      isAuthorVerified: updatedUser.isVerified,
    };
  });
}

/**
 * Propagates updated creator profile details to all comments authored by that user.
 */
export function propagateProfileToComments(
  comments: CommentItem[],
  updatedUser: UserProfile
): CommentItem[] {
  const nextAuthorName = (updatedUser.displayName || updatedUser.channelName || '').trim();
  const nextUsername = (
    updatedUser.username ||
    normalizeHandle(updatedUser.handle || '').slice(1)
  ).trim();

  return comments.map((comment) => {
    if (comment.authorId !== updatedUser.id) return comment;
    return {
      ...comment,
      authorName: nextAuthorName || comment.authorName,
      authorUsername: nextUsername || comment.authorUsername,
      authorAvatar: updatedUser.avatarUrl || comment.authorAvatar,
      isAuthorVerified: updatedUser.isVerified,
    };
  });
}

/**
 * Propagates updated creator profile details to all comment replies authored by that user.
 */
export function propagateProfileToReplies(
  replies: Record<string, CommentReply[]>,
  updatedUser: UserProfile
): Record<string, CommentReply[]> {
  const nextAuthorName = (updatedUser.displayName || updatedUser.channelName || '').trim();
  const nextUsername = (
    updatedUser.username ||
    normalizeHandle(updatedUser.handle || '').slice(1)
  ).trim();

  const updatedEntries: Record<string, CommentReply[]> = {};
  for (const [commentId, list] of Object.entries(replies)) {
    updatedEntries[commentId] = list.map((reply) => {
      if (reply.authorId !== updatedUser.id) return reply;
      return {
        ...reply,
        authorName: nextAuthorName || reply.authorName,
        authorUsername: nextUsername || reply.authorUsername,
        authorAvatar: updatedUser.avatarUrl || reply.authorAvatar,
      };
    });
  }
  return updatedEntries;
}

export interface CreatorVideoAnalytics {
  totalVideos: number;
  shortVideos: number;
  longVideos: number;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  engagementRatePercent: number;
  topVideos: Array<{
    id: string;
    title: string;
    format: 'short' | 'long';
    views: number;
    likes: number;
    shares: number;
    relativeScalePercent: number;
  }>;
}

/**
 * Computes strictly real, zero-fake-data analytics from the creator's actual uploaded videos.
 */
export function computeCreatorAnalytics(videos: VideoItem[]): CreatorVideoAnalytics {
  let shortVideos = 0;
  let longVideos = 0;
  let totalViews = 0;
  let totalLikes = 0;
  let totalShares = 0;
  let totalComments = 0;

  for (const vid of videos) {
    const fmt = resolveVideoFormat(vid);
    if (fmt === 'long') longVideos += 1;
    else shortVideos += 1;
    totalViews += vid.viewsCount || 0;
    totalLikes += vid.likesCount || 0;
    totalShares += vid.sharesCount || 0;
    totalComments += vid.commentsCount || 0;
  }

  const totalInteractions = totalLikes + totalShares + totalComments;
  const engagementRatePercent =
    totalViews > 0 ? Number(((totalInteractions / totalViews) * 100).toFixed(1)) : 0;

  const sorted = [...videos]
    .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
    .slice(0, 8);
  const maxViews = Math.max(1, ...sorted.map((v) => v.viewsCount || 0));

  const topVideos = sorted.map((v) => ({
    id: v.id,
    title: v.title,
    format: resolveVideoFormat(v),
    views: v.viewsCount || 0,
    likes: v.likesCount || 0,
    shares: v.sharesCount || 0,
    relativeScalePercent: Math.max(10, Math.round(((v.viewsCount || 0) / maxViews) * 100)),
  }));

  return {
    totalVideos: videos.length,
    shortVideos,
    longVideos,
    totalViews,
    totalLikes,
    totalShares,
    totalComments,
    engagementRatePercent,
    topVideos,
  };
}
