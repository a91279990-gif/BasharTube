import React, { createContext, useContext, useState } from 'react';
import { CommentItem, CommentReply, ReactionType, CommentReaction } from '../types';
import { INITIAL_COMMENTS } from '../data/mockData';
import { useAuth } from './AuthContext';

interface CommentContextType {
  comments: CommentItem[];
  replies: Record<string, CommentReply[]>;
  reactions: Record<string, CommentReaction[]>;
  getCommentsForVideo: (videoId: string) => CommentItem[];
  addComment: (videoId: string, data: {
    text: string;
    mediaImages?: string[];
    mediaVideoUrl?: string;
    voiceUrl?: string;
    voiceDuration?: number;
    voiceTranscription?: string;
  }) => Promise<CommentItem | null>;
  editComment: (commentId: string, newText: string) => Promise<void>;
  deleteComment: (commentId: string, isCreatorDelete?: boolean) => Promise<void>;
  togglePinComment: (commentId: string) => Promise<void>;
  toggleCreatorHeart: (commentId: string) => Promise<void>;
  reactToComment: (commentId: string, reaction: ReactionType) => Promise<void>;
  addReply: (commentId: string, videoId: string, text: string) => Promise<CommentReply | null>;
  editReply: (replyId: string, commentId: string, newText: string) => Promise<void>;
  deleteReply: (replyId: string, commentId: string) => Promise<void>;
  updateTranscription: (commentId: string, transcription: string) => void;
  deleteTranscription: (commentId: string) => void;
  reviewCommentAction: (commentId: string, action: 'approve' | 'hide' | 'delete') => void;
}

const CommentContext = createContext<CommentContextType | undefined>(undefined);

export const CommentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>(INITIAL_COMMENTS);
  const [replies, setReplies] = useState<Record<string, CommentReply[]>>({
    com_1: [
      {
        id: 'rep_1',
        commentId: 'com_1',
        videoId: 'vid_1',
        authorId: 'user_creator_tanvir',
        authorName: 'Tanvir Ahmed 🎬',
        authorUsername: 'tanvir_vlogs',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
        text: 'ধন্যবাদ বাশার ভাই! ইনশাআল্লাহ আগামী সপ্তাহে সাজেক ও বান্দরবানের ভিডিও আসছে।',
        isEdited: false,
        createdAt: '2026-03-01T15:30:00Z'
      }
    ]
  });
  const [reactions, setReactions] = useState<Record<string, CommentReaction[]>>({
    com_1: [
      {
        id: 'cr_1',
        commentId: 'com_1',
        userId: 'user_creator_tanvir',
        username: 'tanvir_vlogs',
        userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
        reactionType: 'love',
        createdAt: '2026-03-01T15:05:00Z'
      }
    ]
  });

  const getCommentsForVideo = (videoId: string): CommentItem[] => {
    return comments
      .filter(c => c.videoId === videoId && c.aiModerationStatus !== 'hidden')
      .sort((a, b) => {
        // Pinned comment always on top
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // Top comments sorting based on Like count
        return (b.likesCount || 0) - (a.likesCount || 0);
      });
  };

  const addComment = async (
    videoId: string,
    data: {
      text: string;
      mediaImages?: string[];
      mediaVideoUrl?: string;
      voiceUrl?: string;
      voiceDuration?: number;
      voiceTranscription?: string;
    }
  ): Promise<CommentItem | null> => {
    if (!currentUser) return null;

    // AI moderation check (detect abusive words or spam)
    const badWords = ['spam', 'abuse', 'hack', 'fake'];
    const isSuspicious = badWords.some(w => data.text.toLowerCase().includes(w));

    const newComment: CommentItem = {
      id: 'com_' + Date.now(),
      videoId,
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      authorUsername: currentUser.username,
      authorAvatar: currentUser.avatarUrl,
      isAuthorVerified: currentUser.isVerified,
      text: data.text,
      isEdited: false,
      isPinned: false,
      hasCreatorHeart: false,
      likesCount: 0,
      repliesCount: 0,
      reactions: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
      mediaImages: data.mediaImages,
      mediaVideoUrl: data.mediaVideoUrl,
      voiceUrl: data.voiceUrl,
      voiceDuration: data.voiceDuration,
      voiceTranscription: data.voiceTranscription,
      aiModerationStatus: isSuspicious ? 'flagged' : 'approved',
      createdAt: new Date().toISOString()
    };

    setComments(prev => [newComment, ...prev]);
    return newComment;
  };

  const editComment = async (commentId: string, newText: string) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, text: newText, isEdited: true, updatedAt: new Date().toISOString() };
      }
      return c;
    }));
  };

  const deleteComment = async (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    // Cascade delete replies
    setReplies(prev => {
      const copy = { ...prev };
      delete copy[commentId];
      return copy;
    });
  };

  const togglePinComment = async (commentId: string) => {
    const target = comments.find(c => c.id === commentId);
    if (!target) return;
    const targetVideoId = target.videoId;

    // Only 1 pinned comment per video allowed
    setComments(prev => prev.map(c => {
      if (c.videoId === targetVideoId) {
        if (c.id === commentId) {
          return { ...c, isPinned: !c.isPinned };
        }
        // Unpin others
        return { ...c, isPinned: false };
      }
      return c;
    }));
  };

  const toggleCreatorHeart = async (commentId: string) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, hasCreatorHeart: !c.hasCreatorHeart };
      }
      return c;
    }));
  };

  const reactToComment = async (commentId: string, reaction: ReactionType) => {
    if (!currentUser) return;
    const existingList = reactions[commentId] || [];
    const userPrevReaction = existingList.find(r => r.userId === currentUser.id);

    let updatedList: CommentReaction[];
    if (userPrevReaction && userPrevReaction.reactionType === reaction) {
      // Toggle off
      updatedList = existingList.filter(r => r.userId !== currentUser.id);
    } else {
      // Add or change
      const filtered = existingList.filter(r => r.userId !== currentUser.id);
      updatedList = [
        ...filtered,
        {
          id: 'cr_' + Date.now(),
          commentId,
          userId: currentUser.id,
          username: currentUser.username,
          userAvatar: currentUser.avatarUrl,
          reactionType: reaction,
          createdAt: new Date().toISOString()
        }
      ];
    }

    setReactions(prev => ({ ...prev, [commentId]: updatedList }));

    // Recompute reaction counts
    const counts = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
    updatedList.forEach(r => {
      counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
    });
    const totalLikes = Object.values(counts).reduce((a, b) => a + b, 0);

    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, reactions: counts, likesCount: totalLikes };
      }
      return c;
    }));
  };

  const addReply = async (commentId: string, videoId: string, text: string): Promise<CommentReply | null> => {
    if (!currentUser) return null;
    const newReply: CommentReply = {
      id: 'rep_' + Date.now(),
      commentId,
      videoId,
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      authorUsername: currentUser.username,
      authorAvatar: currentUser.avatarUrl,
      text,
      isEdited: false,
      createdAt: new Date().toISOString()
    };

    setReplies(prev => ({
      ...prev,
      [commentId]: [...(prev[commentId] || []), newReply]
    }));

    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, repliesCount: (c.repliesCount || 0) + 1 };
      }
      return c;
    }));

    return newReply;
  };

  const editReply = async (replyId: string, commentId: string, newText: string) => {
    setReplies(prev => ({
      ...prev,
      [commentId]: (prev[commentId] || []).map(r => r.id === replyId ? { ...r, text: newText, isEdited: true } : r)
    }));
  };

  const deleteReply = async (replyId: string, commentId: string) => {
    setReplies(prev => ({
      ...prev,
      [commentId]: (prev[commentId] || []).filter(r => r.id !== replyId)
    }));
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, repliesCount: Math.max(0, (c.repliesCount || 1) - 1) };
      }
      return c;
    }));
  };

  const updateTranscription = (commentId: string, transcription: string) => {
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, voiceTranscription: transcription } : c));
  };

  const deleteTranscription = (commentId: string) => {
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, voiceTranscription: undefined } : c));
  };

  const reviewCommentAction = (commentId: string, action: 'approve' | 'hide' | 'delete') => {
    if (action === 'delete') {
      deleteComment(commentId);
    } else {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, aiModerationStatus: action === 'approve' ? 'approved' : 'hidden' } : c));
    }
  };

  return (
    <CommentContext.Provider value={{
      comments,
      replies,
      reactions,
      getCommentsForVideo,
      addComment,
      editComment,
      deleteComment,
      togglePinComment,
      toggleCreatorHeart,
      reactToComment,
      addReply,
      editReply,
      deleteReply,
      updateTranscription,
      deleteTranscription,
      reviewCommentAction
    }}>
      {children}
    </CommentContext.Provider>
  );
};

export const useComment = () => {
  const context = useContext(CommentContext);
  if (!context) {
    throw new Error('useComment must be used within a CommentProvider');
  }
  return context;
};
