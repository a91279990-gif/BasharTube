import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { VideoItem, VideoVisibility } from '../types';
import { INITIAL_VIDEOS, DEFAULT_PLATFORM_SETTINGS } from '../data/mockData';
import { useAuth } from './AuthContext';

export type FeedType = 'foryou' | 'following' | 'explore' | 'trending' | 'profile';

interface VideoContextType {
  videos: VideoItem[];
  filteredVideos: VideoItem[];
  activeFeed: FeedType;
  setActiveFeed: (feed: FeedType) => void;
  activeVideoId: string | null;
  setActiveVideoId: (id: string | null) => void;
  likedVideoIds: Set<string>;
  toggleLikeVideo: (videoId: string) => Promise<void>;
  incrementShare: (videoId: string) => Promise<void>;
  incrementViews: (videoId: string) => Promise<void>;
  followedCreatorIds: Set<string>;
  toggleFollowCreator: (creatorId: string) => void;
  uploadVideo: (videoData: Omit<VideoItem, 'id' | 'viewsCount' | 'likesCount' | 'sharesCount' | 'commentsCount' | 'createdAt'>) => Promise<VideoItem>;
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
  const [videos, setVideos] = useState<VideoItem[]>(() => {
    try {
      const saved = localStorage.getItem('bashartube_uploaded_videos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeFeed, setActiveFeed] = useState<FeedType>('foryou');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [likedVideoIds, setLikedVideoIds] = useState<Set<string>>(new Set());
  const [followedCreatorIds, setFollowedCreatorIds] = useState<Set<string>>(new Set());
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto (1080p)');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeSubtitleLang, setActiveSubtitleLang] = useState<'off' | 'bn' | 'en'>('bn');

  // Real-time listener for Firestore /videos
  useEffect(() => {
    try {
      const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const firestoreVideos: VideoItem[] = [];
        snapshot.forEach((docSnap) => {
          firestoreVideos.push({ id: docSnap.id, ...docSnap.data() } as VideoItem);
        });
        if (firestoreVideos.length > 0) {
          setVideos(firestoreVideos);
          try {
            localStorage.setItem('bashartube_uploaded_videos', JSON.stringify(firestoreVideos));
          } catch {}
          if (!activeVideoId && firestoreVideos[0]) {
            setActiveVideoId(firestoreVideos[0].id);
          }
        }
      }, (error) => {
        console.warn("Firestore videos listener notice:", error.message);
      });
      return () => unsubscribe();
    } catch {
      // Local fallback
    }
  }, [activeVideoId]);

  // Filter videos based on Active Feed, Visibility, Blocked Users, and Preferences
  const filteredVideos = videos.filter((video) => {
    // 1. Private video rule: Only author or superadmin can view!
    if (video.visibility === 'private') {
      const isAuthor = currentUser && currentUser.id === video.authorId;
      if (!isAuthor && !isSuperAdmin) {
        return false;
      }
    }

    // 2. Blocked users rule:
    if (preferences.blockedUserIds.includes(video.authorId)) {
      return false;
    }


    if (activeFeed === 'following') {
      return followedCreatorIds.has(video.authorId);
    }

    if (activeFeed === 'trending') {
      // Don't recommend list
      if (preferences.dontRecommendCreatorIds.includes(video.authorId)) {
        return false;
      }
      return video.likesCount > 1000 || video.viewsCount > 50000;
    }

    if (activeFeed === 'foryou') {
      // Respect Don't Recommend filter
      if (preferences.dontRecommendCreatorIds.includes(video.authorId)) {
        return false;
      }
      return true;
    }

    return true;
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

    setVideos(prev => prev.map(v => {
      if (v.id === videoId) {
        return { ...v, likesCount: Math.max(0, v.likesCount + (isLiked ? -1 : 1)) };
      }
      return v;
    }));

    try {
      const videoRef = doc(db, 'videos', videoId);
      const target = videos.find(v => v.id === videoId);
      if (target) {
        await updateDoc(videoRef, {
          likesCount: Math.max(0, target.likesCount + (isLiked ? -1 : 1))
        });
      }
    } catch {
      // state updated optimistically
    }
  };

  const incrementShare = async (videoId: string) => {
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, sharesCount: v.sharesCount + 1 } : v));
    try {
      const videoRef = doc(db, 'videos', videoId);
      const target = videos.find(v => v.id === videoId);
      if (target) {
        await updateDoc(videoRef, { sharesCount: target.sharesCount + 1 });
      }
    } catch {
      // state updated
    }
  };

  const incrementViews = async (videoId: string) => {
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, viewsCount: v.viewsCount + 1 } : v));
    try {
      const videoRef = doc(db, 'videos', videoId);
      const target = videos.find(v => v.id === videoId);
      if (target) {
        await updateDoc(videoRef, { viewsCount: target.viewsCount + 1 });
      }
    } catch {
      // state updated
    }
  };

  const toggleFollowCreator = (creatorId: string) => {
    setFollowedCreatorIds(prev => {
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
    videoData: Omit<VideoItem, 'id' | 'viewsCount' | 'likesCount' | 'sharesCount' | 'commentsCount' | 'createdAt'>
  ): Promise<VideoItem> => {
    const newVideo: VideoItem = {
      ...videoData,
      id: 'vid_' + Date.now(),
      viewsCount: 1,
      likesCount: 0,
      sharesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString()
    };

    setVideos(prev => {
      const updated = [newVideo, ...prev];
      try {
        localStorage.setItem('bashartube_uploaded_videos', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setActiveVideoId(newVideo.id);
    setActiveFeed('foryou');

    try {
      const docRef = await addDoc(collection(db, 'videos'), {
        authorId: newVideo.authorId,
        authorName: newVideo.authorName,
        authorUsername: newVideo.authorUsername,
        authorAvatar: newVideo.authorAvatar,
        isAuthorVerified: newVideo.isAuthorVerified,
        title: newVideo.title,
        description: newVideo.description,
        videoUrl: newVideo.videoUrl,
        thumbnailUrl: newVideo.thumbnailUrl,
        duration: newVideo.duration,
        category: newVideo.category,
        visibility: newVideo.visibility,
        viewsCount: 1,
        likesCount: 0,
        sharesCount: 0,
        commentsCount: 0,
        commentsEnabled: newVideo.commentsEnabled,
        musicTitle: newVideo.musicTitle || '',
        musicArtist: newVideo.musicArtist || '',
        hasSubtitles: newVideo.hasSubtitles,
        subtitles: newVideo.subtitles || {},
        aiModerationStatus: 'approved',
        isKidsSafe: newVideo.isKidsSafe,
        createdAt: newVideo.createdAt
      });
      newVideo.id = docRef.id;
    } catch (err) {
      console.warn("Firestore video upload notice:", err);
    }

    return newVideo;
  };

  const deleteVideo = async (videoId: string) => {
    setVideos(prev => {
      const updated = prev.filter(v => v.id !== videoId);
      try {
        localStorage.setItem('bashartube_uploaded_videos', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await deleteDoc(doc(db, 'videos', videoId));
    } catch (err) {
      console.warn("Delete video error:", err);
    }
  };

  const updateVideoVisibility = async (videoId: string, visibility: VideoVisibility) => {
    setVideos(prev => {
      const updated = prev.map(v => v.id === videoId ? { ...v, visibility } : v);
      try {
        localStorage.setItem('bashartube_uploaded_videos', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await updateDoc(doc(db, 'videos', videoId), { visibility });
    } catch (err) {
      console.warn("Update visibility error:", err);
    }
  };

  const toggleVideoComments = async (videoId: string, enabled: boolean) => {
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, commentsEnabled: enabled } : v));
    try {
      await updateDoc(doc(db, 'videos', videoId), { commentsEnabled: enabled });
    } catch (err) {
      console.warn("Toggle video comments error:", err);
    }
  };

  return (
    <VideoContext.Provider value={{
      videos,
      filteredVideos,
      activeFeed,
      setActiveFeed,
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
      setActiveSubtitleLang
    }}>
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
