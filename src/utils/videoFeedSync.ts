import { VideoItem, VideoVisibility } from '../types';
import { isDemoOrFakeVideoUrl, resolveVideoFormat } from './videoFormat';

export type FeedType = 'foryou' | 'following' | 'explore' | 'trending' | 'profile';
export type VideoFormatFilter = 'short' | 'long';

export function isPlayableVideoUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || isDemoOrFakeVideoUrl(trimmed)) return false;
  return (
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/api/videos/stream/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:video/')
  );
}

export function sanitizeStoredVideos(list: VideoItem[]): VideoItem[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((v) => v && typeof v.id === 'string' && !isDemoOrFakeVideoUrl(v.videoUrl))
    .map((v) => {
      const rawUrl = typeof v.videoUrl === 'string' ? v.videoUrl.trim() : '';
      const isPersistedDeadBlob = rawUrl.startsWith('blob:');
      return {
        ...v,
        videoUrl: isPersistedDeadBlob ? '' : rawUrl,
        hasStoredBlob: Boolean(v.hasStoredBlob || isPersistedDeadBlob),
        videoFormat: resolveVideoFormat(v),
      };
    });
}

export function mergeRemoteVideosWithLocalMedia(
  remoteRaw: VideoItem[],
  prevVideos: VideoItem[],
  localMediaMap: Map<string, string>,
  pendingLocalIds?: Set<string>
): VideoItem[] {
  const cleanedRemote = remoteRaw
    .filter((v) => v && typeof v.id === 'string' && !isDemoOrFakeVideoUrl(v.videoUrl))
    .map((v) => {
      const remoteUrl = typeof v.videoUrl === 'string' ? v.videoUrl.trim() : '';
      const localUrl = localMediaMap.get(v.id);
      const prevMatch = prevVideos.find((p) => p.id === v.id);
      const prevLiveUrl =
        prevMatch && isPlayableVideoUrl(prevMatch.videoUrl) ? prevMatch.videoUrl : '';

      // Prefer a real persistent remote URL (non-blob, e.g. /api/videos/stream/... or https://),
      // otherwise keep live local blob/stream URL from ref or previous state.
      const resolvedUrl =
        remoteUrl && !remoteUrl.startsWith('blob:')
          ? remoteUrl
          : localUrl || prevLiveUrl || '';

      return {
        ...v,
        videoUrl: resolvedUrl,
        hasStoredBlob: Boolean(v.hasStoredBlob || resolvedUrl.startsWith('blob:')),
        videoFormat: resolveVideoFormat(v),
      };
    });

  const remoteIdSet = new Set(cleanedRemote.map((v) => v.id));

  // Preserve optimistic local uploads whose Firestore write hasn't echoed back in snapshot yet
  const optimisticOnly = prevVideos.filter(
    (p) =>
      !remoteIdSet.has(p.id) &&
      !isDemoOrFakeVideoUrl(p.videoUrl) &&
      (localMediaMap.has(p.id) || pendingLocalIds?.has(p.id)) &&
      isPlayableVideoUrl(localMediaMap.get(p.id) || p.videoUrl)
  ).map((p) => ({
    ...p,
    videoUrl: localMediaMap.get(p.id) || p.videoUrl,
    videoFormat: resolveVideoFormat(p),
  }));

  return [...optimisticOnly, ...cleanedRemote];
}

export interface FilterHomeFeedOptions {
  activeFeed: FeedType;
  formatFilter: VideoFormatFilter;
  currentUserId?: string | null;
  isSuperAdmin?: boolean;
  followedCreatorIds: Set<string>;
  blockedUserIds: string[];
  dontRecommendCreatorIds: string[];
}

export function filterHomeFeedVideos(
  videos: VideoItem[],
  opts: FilterHomeFeedOptions
): VideoItem[] {
  return videos.filter((video) => {
    if (!isPlayableVideoUrl(video.videoUrl)) {
      return false;
    }

    const visibility: VideoVisibility = video.visibility || 'public';
    if (visibility === 'private') {
      const isAuthor = Boolean(opts.currentUserId && opts.currentUserId === video.authorId);
      if (!isAuthor && !opts.isSuperAdmin) {
        return false;
      }
    }

    if (opts.blockedUserIds.includes(video.authorId)) {
      return false;
    }

    if (resolveVideoFormat(video) !== opts.formatFilter) {
      return false;
    }

    if (opts.activeFeed === 'following') {
      return opts.followedCreatorIds.has(video.authorId);
    }

    if (opts.activeFeed === 'trending') {
      if (opts.dontRecommendCreatorIds.includes(video.authorId)) {
        return false;
      }
      return video.likesCount > 1000 || video.viewsCount > 50000;
    }

    if (opts.activeFeed === 'foryou') {
      if (opts.dontRecommendCreatorIds.includes(video.authorId)) {
        return false;
      }
      return true;
    }

    return true;
  });
}

export function resolveActiveVideoId(
  playableVideos: VideoItem[],
  preferredId: string | null
): string | null {
  if (playableVideos.length === 0) return null;
  if (preferredId && playableVideos.some((v) => v.id === preferredId)) {
    return preferredId;
  }
  return playableVideos[0].id;
}
