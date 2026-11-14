import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { VideoItem, VideoVisibility } from '../types';
import { useAuth } from './AuthContext';
import { resolveVideoFormat } from '../utils/videoFormat';
import { saveVideoBlob, getVideoBlobUrl, deleteVideoBlob } from '../utils/videoStorage';
import {
  FeedType,
  VideoFormatFilter,
  filterHomeFeedVideos,
  isPlayableVideoUrl,
  mergeRemoteVideosWithLocalMedia,
  resolveActiveVideoId,
  sanitizeStoredVideos,
} from '../utils/videoFeedSync';
import { propagateProfileToVideos } from '../utils/profileSync';

export type { FeedType, VideoFormatFilter };

const STORAGE_KEY = 'bashartube_uploaded_videos';

function inferExtensionFromBlob(blob: Blob, filename?: string): string {
  if (filename) {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.webm')) return 'webm';
    if (lower.endsWith('.mov')) return 'mov';
    if (lower.endsWith('.m4v')) return 'm4v';
    if (lower.endsWith('.mp4')) return 'mp4';
  }
  const type = (blob.type || '').toLowerCase();
  if (type.includes('webm')) return 'webm';
  if (type.includes('quicktime')) return 'mov';
  return 'mp4';
}

async function uploadVideoFileToServer(
  videoId: string,
  rawFile: Blob,
  filename?: string
): Promise<string | null> {
  try {
    const ext = inferExtensionFromBlob(rawFile, filename);
    const response = await fetch('/api/videos/upload', {
      method: 'POST',
      headers: {
        'Content-Type': rawFile.type || 'application/octet-stream',
        'x-video-id': videoId,
        'x-video-ext': ext,
      },
      body: rawFile,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { ok?: boolean; videoUrl?: string };
    return data?.ok && data.videoUrl ? data.videoUrl : null;
  } catch {
    return null;
  }
}

interface VideoContextType {
  videos: VideoItem[];
  filteredVideos: VideoItem[];
  activeFeed: FeedType;
  setActiveFeed: (feed: FeedType) => void;
  formatFilter: VideoFormatFilter;
  setFormatFilter: (filter: VideoFormatFilter) => void;
  activeVideoId: string | null;
  setActiveVideoId: (id: string | null) => void;
  likedVideoIds: Set<string>;
  toggleLikeVideo: (videoId: string) => Promise<void>;
  incrementShare: (videoId: string) => Promise<void>;
  incrementViews: (videoId: string) => Promise<void>;
  followedCreatorIds: Set<string>;
  toggleFollowCreator: (creatorId: string) => void;
  uploadVideo: (
    videoData: Omit<
      VideoItem,
      'id' | 'viewsCount' | 'likesCount' | 'sharesCount' | 'commentsCount' | 'createdAt'
    >,
    rawFile?: Blob | null,
    originalFilename?: string
  ) => Promise<VideoItem>;
  deleteVideo: (videoId: string) => Promise<void>;
  updateVideoVisibility: (videoId: string, visibility: VideoVisibility) => Promise<void>;
  toggleVideoComments: (videoId: string, enabled: boolean) => Promise<void>;
  selectedQuality: string;
  setSelectedQuality: (q: string) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  activeSubtitleLang: 'off' | 'bn' | 'en';
  setActiveSubtitleLang: (lang: 'off' | 'bn' | 'en') => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export const VideoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, preferences, isSuperAdmin } = useAuth();

  const localMediaUrlRef = useRef<Map<string, string>>(new Map());
  const pendingLocalIdsRef = useRef<Set<string>>(new Set());
  const attemptedHydrationIdsRef = useRef<Set<string>>(new Set());

  const [videos, setVideos] = useState<VideoItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? sanitizeStoredVideos(parsed) : [];
    } catch {
      return [];
    }
  });
  const [activeFeed, setActiveFeed] = useState<FeedType>('foryou');
  const [formatFilter, setFormatFilter] = useState<VideoFormatFilter>('short');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [likedVideoIds, setLikedVideoIds] = useState<Set<string>>(new Set());
  const [followedCreatorIds, setFollowedCreatorIds] = useState<Set<string>>(new Set());
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto (1080p)');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeSubtitleLang, setActiveSubtitleLang] = useState<'off' | 'bn' | 'en'>('bn');

  const persistVideos = (updated: VideoItem[]) => {
    try {
      const serializable = updated.map((v) => ({
        ...v,
        videoUrl: v.videoUrl?.startsWith('blob:') ? '' : v.videoUrl,
        hasStoredBlob: Boolean(v.hasStoredBlob || v.videoUrl?.startsWith('blob:')),
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch {}
  };

  // Re-hydrate any videos missing an active URL from IndexedDB
  useEffect(() => {
    let cancelled = false;
    const candidates = videos.filter(
      (v) =>
        !isPlayableVideoUrl(v.videoUrl) &&
        v.hasStoredBlob &&
        !localMediaUrlRef.current.has(v.id) &&
        !attemptedHydrationIdsRef.current.has(v.id)
    );
    if (candidates.length === 0) return;

    (async () => {
      const updates = new Map<string, string>();
      for (const vid of candidates) {
        attemptedHydrationIdsRef.current.add(vid.id);
        const freshUrl = await getVideoBlobUrl(vid.id);
        if (freshUrl) {
          localMediaUrlRef.current.set(vid.id, freshUrl);
          updates.set(vid.id, freshUrl);
        }
      }
      if (cancelled || updates.size === 0) return;
      setVideos((prev) =>
        prev.map((v) => (updates.has(v.id) ? { ...v, videoUrl: updates.get(v.id)! } : v))
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [videos]);

  // Real-time listener for Firestore /videos (only real uploaded videos)
  useEffect(() => {
    try {
      const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const firestoreVideos: VideoItem[] = [];
          snapshot.forEach((docSnap) => {
            firestoreVideos.push({ id: docSnap.id, ...docSnap.data() } as VideoItem);
          });

          setVideos((prev) => {
            const merged = mergeRemoteVideosWithLocalMedia(
              firestoreVideos,
              prev,
              localMediaUrlRef.current,
              pendingLocalIdsRef.current
            );
            persistVideos(merged);
            const playable = merged.filter((m) => isPlayableVideoUrl(m.videoUrl));
            setActiveVideoId((prevActive) => resolveActiveVideoId(playable, prevActive));
            return merged;
          });
        },
        (error) => {
          console.warn('Firestore videos listener notice:', error.message);
        }
      );
      return () => unsubscribe();
    } catch {
      // Local fallback
    }
  }, []);

  // Automatically propagate profile updates (channelName/displayName, handle, avatar) to author's videos
  useEffect(() => {
    if (!currentUser) return;
    const expectedAuthorName = (currentUser.channelName || currentUser.displayName || '').trim();
    const expectedUsername = (currentUser.username || '').trim();
    const expectedAvatar = currentUser.avatarUrl || '';

    const videosToUpdate = videos.filter(
      (v) =>
        v.authorId === currentUser.id &&
        (v.authorName !== expectedAuthorName ||
          v.authorUsername !== expectedUsername ||
          v.authorAvatar !== expectedAvatar ||
          v.isAuthorVerified !== currentUser.isVerified)
    );

    if (videosToUpdate.length === 0) return;

    setVideos((prev) => {
      const next = propagateProfileToVideos(prev, currentUser);
      persistVideos(next);
      return next;
    });

    videosToUpdate.forEach((vid) => {
      updateDoc(doc(db, 'videos', vid.id), {
        authorName: expectedAuthorName || vid.authorName,
        authorUsername: expectedUsername || vid.authorUsername,
        authorAvatar: expectedAvatar || vid.authorAvatar,
        isAuthorVerified: currentUser.isVerified,
      }).catch(() => {});
    });
  }, [
    currentUser?.id,
    currentUser?.displayName,
    currentUser?.channelName,
    currentUser?.username,
    currentUser?.handle,
    currentUser?.avatarUrl,
    currentUser?.isVerified,
    videos.length,
  ]);

  const filteredVideos = filterHomeFeedVideos(videos, {
    activeFeed,
    formatFilter,
    currentUserId: currentUser?.id,
    isSuperAdmin,
    followedCreatorIds,
    blockedUserIds: preferences.blockedUserIds,
    dontRecommendCreatorIds: preferences.dontRecommendCreatorIds,
  });

  const toggleLikeVideo = async (videoId: string) => {
    const isLiked = likedVideoIds.has(videoId);
    const newLiked = new Set(likedVideoIds);
    if (isLiked) {
      newLiked.delete(videoId);
    } else {
      newLiked.add(videoId);
    }
    setLikedVideoIds(newLiked);

    let nextLikesCount = 0;
    setVideos((prev) => {
      const updated = prev.map((v) => {
        if (v.id === videoId) {
          nextLikesCount = Math.max(0, v.likesCount + (isLiked ? -1 : 1));
          return { ...v, likesCount: nextLikesCount };
        }
        return v;
      });
      persistVideos(updated);
      return updated;
    });

    try {
      await updateDoc(doc(db, 'videos', videoId), { likesCount: nextLikesCount });
    } catch {
      // Optimistically updated locally
    }
  };

  const incrementShare = async (videoId: string) => {
    let nextShares = 0;
    setVideos((prev) => {
      const updated = prev.map((v) => {
        if (v.id === videoId) {
          nextShares = v.sharesCount + 1;
          return { ...v, sharesCount: nextShares };
        }
        return v;
      });
      persistVideos(updated);
      return updated;
    });
    try {
      await updateDoc(doc(db, 'videos', videoId), { sharesCount: nextShares });
    } catch {
      // Optimistically updated locally
    }
  };

  const incrementViews = async (videoId: string) => {
    let nextViews = 0;
    setVideos((prev) => {
      const updated = prev.map((v) => {
        if (v.id === videoId) {
          nextViews = v.viewsCount + 1;
          return { ...v, viewsCount: nextViews };
        }
        return v;
      });
      persistVideos(updated);
      return updated;
    });
    try {
      await updateDoc(doc(db, 'videos', videoId), { viewsCount: nextViews });
    } catch {
      // Optimistically updated locally
    }
  };

  const toggleFollowCreator = (creatorId: string) => {
    setFollowedCreatorIds((prev) => {
      const next = new Set(prev);
      if (next.has(creatorId)) {
        next.delete(creatorId);
      } else {
        next.add(creatorId);
      }
      return next;
    });
  };

  const uploadVideo = async (
    videoData: Omit<
      VideoItem,
      'id' | 'viewsCount' | 'likesCount' | 'sharesCount' | 'commentsCount' | 'createdAt'
    >,
    rawFile?: Blob | null,
    originalFilename?: string
  ): Promise<VideoItem> => {
    let stableId = 'vid_' + Date.now();
    try {
      stableId = doc(collection(db, 'videos')).id;
    } catch {
      // fallback ID
    }

    pendingLocalIdsRef.current.add(stableId);

    // 1. Create an immediate live playback URL (never reuse a modal-ephemeral blob URL that could be revoked)
    let immediatePlayableUrl = videoData.videoUrl || '';
    let hasStoredBlob = Boolean(videoData.hasStoredBlob);

    if (rawFile && rawFile.size > 0) {
      immediatePlayableUrl = URL.createObjectURL(rawFile);
      hasStoredBlob = true;
      await saveVideoBlob(stableId, rawFile);
    }

    if (immediatePlayableUrl) {
      localMediaUrlRef.current.set(stableId, immediatePlayableUrl);
      attemptedHydrationIdsRef.current.add(stableId);
    }

    const optimisticVideo: VideoItem = {
      ...videoData,
      id: stableId,
      videoUrl: immediatePlayableUrl,
      videoFormat: resolveVideoFormat(videoData),
      hasStoredBlob,
      viewsCount: 1,
      likesCount: 0,
      sharesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    };

    // 2. Immediately show on Home Feed under its own format ('short' or 'long') and activate this video
    const targetFormat = resolveVideoFormat(videoData);
    setVideos((prev) => {
      const updated = [optimisticVideo, ...prev.filter((p) => p.id !== stableId)];
      persistVideos(updated);
      return updated;
    });
    setFormatFilter(targetFormat);
    setActiveVideoId(stableId);
    setActiveFeed('foryou');

    // 3. Persist real video binary to server media storage so it survives reloads/origins/devices
    let persistentUrl =
      immediatePlayableUrl && !immediatePlayableUrl.startsWith('blob:')
        ? immediatePlayableUrl
        : '';

    if (rawFile && rawFile.size > 0) {
      const uploadedServerUrl = await uploadVideoFileToServer(
        stableId,
        rawFile,
        originalFilename
      );
      if (uploadedServerUrl) {
        persistentUrl = uploadedServerUrl;
        localMediaUrlRef.current.set(stableId, persistentUrl);
        setVideos((prev) => {
          const updated = prev.map((v) =>
            v.id === stableId ? { ...v, videoUrl: persistentUrl } : v
          );
          persistVideos(updated);
          return updated;
        });
      }
    }

    // 4. Write metadata + persistent videoUrl to Firestore
    try {
      await setDoc(doc(db, 'videos', stableId), {
        authorId: optimisticVideo.authorId,
        authorName: optimisticVideo.authorName,
        authorUsername: optimisticVideo.authorUsername,
        authorAvatar: optimisticVideo.authorAvatar,
        isAuthorVerified: optimisticVideo.isAuthorVerified,
        title: optimisticVideo.title,
        description: optimisticVideo.description,
        videoUrl: persistentUrl,
        hasStoredBlob,
        thumbnailUrl: optimisticVideo.thumbnailUrl || '',
        duration: optimisticVideo.duration,
        videoFormat: optimisticVideo.videoFormat,
        videoWidth: optimisticVideo.videoWidth || 0,
        videoHeight: optimisticVideo.videoHeight || 0,
        aspectRatio: optimisticVideo.aspectRatio || 0,
        category: optimisticVideo.category,
        visibility: optimisticVideo.visibility,
        viewsCount: 1,
        likesCount: 0,
        sharesCount: 0,
        commentsCount: 0,
        commentsEnabled: optimisticVideo.commentsEnabled,
        hasSubtitles: optimisticVideo.hasSubtitles,
        subtitles: optimisticVideo.subtitles || {},
        aiSummary: optimisticVideo.aiSummary || '',
        aiChapters: optimisticVideo.aiChapters || [],
        aiTags: optimisticVideo.aiTags || [],
        aiModerationStatus: 'approved',
        isKidsSafe: false,
        createdAt: optimisticVideo.createdAt,
      });
    } catch (err) {
      console.warn('Firestore video upload notice:', err);
    } finally {
      pendingLocalIdsRef.current.delete(stableId);
    }

    return {
      ...optimisticVideo,
      videoUrl: persistentUrl || immediatePlayableUrl,
    };
  };

  const deleteVideo = async (videoId: string) => {
    const existing = videos.find((v) => v.id === videoId);
    localMediaUrlRef.current.delete(videoId);
    pendingLocalIdsRef.current.delete(videoId);

    setVideos((prev) => {
      const updated = prev.filter((v) => v.id !== videoId);
      persistVideos(updated);
      const playable = updated.filter((m) => isPlayableVideoUrl(m.videoUrl));
      setActiveVideoId((curr) => (curr === videoId ? resolveActiveVideoId(playable, null) : curr));
      return updated;
    });

    await deleteVideoBlob(videoId);
    if (existing?.videoUrl?.startsWith('/api/videos/stream/')) {
      const fname = existing.videoUrl.split('/').pop();
      if (fname) {
        fetch(`/api/videos/stream/${encodeURIComponent(fname)}`, { method: 'DELETE' }).catch(
          () => {}
        );
      }
    }
    try {
      await deleteDoc(doc(db, 'videos', videoId));
    } catch (err) {
      console.warn('Delete video error:', err);
    }
  };

  const updateVideoVisibility = async (videoId: string, visibility: VideoVisibility) => {
    setVideos((prev) => {
      const updated = prev.map((v) => (v.id === videoId ? { ...v, visibility } : v));
      persistVideos(updated);
      return updated;
    });
    try {
      await updateDoc(doc(db, 'videos', videoId), { visibility });
    } catch (err) {
      console.warn('Update visibility error:', err);
    }
  };

  const toggleVideoComments = async (videoId: string, enabled: boolean) => {
    setVideos((prev) => {
      const updated = prev.map((v) => (v.id === videoId ? { ...v, commentsEnabled: enabled } : v));
      persistVideos(updated);
      return updated;
    });
    try {
      await updateDoc(doc(db, 'videos', videoId), { commentsEnabled: enabled });
    } catch (err) {
      console.warn('Toggle video comments error:', err);
    }
  };

  return (
    <VideoContext.Provider
      value={{
        videos,
        filteredVideos,
        activeFeed,
        setActiveFeed,
        formatFilter,
        setFormatFilter,
        activeVideoId,
        setActiveVideoId,
        likedVideoIds,
        toggleLikeVideo,
        incrementShare,
        incrementViews,
        followedCreatorIds,
        toggleFollowCreator,
        uploadVideo,
        deleteVideo,
        updateVideoVisibility,
        toggleVideoComments,
        selectedQuality,
        setSelectedQuality,
        playbackSpeed,
        setPlaybackSpeed,
        isMuted,
        setIsMuted,
        activeSubtitleLang,
        setActiveSubtitleLang,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
};

export const useVideo = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
};
