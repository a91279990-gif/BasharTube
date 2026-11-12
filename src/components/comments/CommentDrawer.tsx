import React, { useState, useRef } from 'react';
import { 
  X, 
  Heart, 
  Send, 
  Image, 
  Video, 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Trash2, 
  Edit3, 
  Pin, 
  PinOff, 
  CheckCircle, 
  Sparkles, 
  Smile, 
  Download, 
  Volume2, 
  FileAudio, 
  Lock, 
  MessageSquareOff,
  Users,
  CornerDownRight
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useComment } from '../../context/CommentContext';
import { useVideo } from '../../context/VideoContext';
import { useNotification } from '../../context/NotificationContext';
import { CommentItem, ReactionType, CommentReply } from '../../types';

interface CommentDrawerProps {
  videoId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

const REACTION_ICONS: { type: ReactionType; emoji: string; label: string; color: string }[] = [
  { type: 'like', emoji: '👍', label: 'Like', color: 'text-cyan-400' },
  { type: 'love', emoji: '❤️', label: 'Love', color: 'text-pink-500' },
  { type: 'haha', emoji: '😆', label: 'Haha', color: 'text-amber-400' },
  { type: 'wow', emoji: '😮', label: 'Wow', color: 'text-emerald-400' },
  { type: 'sad', emoji: '😢', label: 'Sad', color: 'text-sky-400' },
  { type: 'angry', emoji: '😡', label: 'Angry', color: 'text-rose-500' },
];

export const CommentDrawer: React.FC<CommentDrawerProps> = ({
  videoId,
  isOpen,
  onClose,
  onOpenAuth
}) => {
  const { t, language } = useLanguage();
  const { currentUser, isSuperAdmin } = useAuth();
  const { videos, toggleVideoComments } = useVideo();
  const { 
    getCommentsForVideo, 
    addComment, 
    editComment, 
    deleteComment, 
    togglePinComment, 
    toggleCreatorHeart, 
    reactToComment,
    reactions,
    replies,
    addReply,
    deleteReply,
    editReply,
    updateTranscription,
    deleteTranscription
  } = useComment();
  const { addNotification } = useNotification();

  const currentVideo = videos.find(v => v.id === videoId);
  const isVideoAuthor = currentUser?.id === currentVideo?.authorId;

  // New comment input states
  const [commentText, setCommentText] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedVideoUrl, setAttachedVideoUrl] = useState<string>('');
  const [voiceUrl, setVoiceUrl] = useState<string>('');
  const [voiceDuration, setVoiceDuration] = useState<number>(0);
  const [voiceTranscription, setVoiceTranscription] = useState<string>('');
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Active reply target
  const [replyTargetCommentId, setReplyTargetCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Editing comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Editing reply state
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState('');

  // Reactions modal
  const [viewingReactionsCommentId, setViewingReactionsCommentId] = useState<string | null>(null);

  // Active playing audio/video id tracker (to enforce 1 single player active)
  const [playingMediaId, setPlayingMediaId] = useState<string | null>(null);

  if (!isOpen || !videoId || !currentVideo) return null;

  const commentsList = getCommentsForVideo(videoId);

  // Recording audio simulation with real blob preview
  const startRecordingVoice = () => {
    setIsRecording(true);
    setRecordTimer(0);
    recordIntervalRef.current = setInterval(() => {
      setRecordTimer(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingVoice = () => {
    setIsRecording(false);
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    
    // Simulate audio message url and duration
    setVoiceUrl('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    setVoiceDuration(Math.max(2, recordTimer));
  };

  const handleGenerateVoiceToText = () => {
    // AI automatic speech detection (Bengali / English)
    const simulatedTranscriptions = [
      'চমৎকার ভিডিও! বাশারটিউবে নিয়মিত এমন ভিডিও দেখতে চাই।',
      'This is an exceptional presentation. Keep inspiring us from Bangladesh!',
      'খুব সুন্দর উপস্থাপনা, অনেক ভালো লেগেছে।'
    ];
    const picked = simulatedTranscriptions[Math.floor(Math.random() * simulatedTranscriptions.length)];
    setVoiceTranscription(picked);
  };

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (attachedImages.length + files.length > 5) {
      alert(language === 'bn' ? 'প্রতি কমেন্টে সর্বোচ্চ ৫টি ছবি বা GIF যুক্ত করা যাবে।' : 'Maximum 5 images or GIFs allowed per comment.');
      return;
    }
    const newUrls: string[] = [];
    Array.from(files).forEach(f => {
      newUrls.push(URL.createObjectURL(f));
    });
    setAttachedImages(prev => [...prev, ...newUrls].slice(0, 5));
  };

  const handleCommentVideoAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedVideoUrl(URL.createObjectURL(file));
  };

  const handleAudioUploadAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVoiceUrl(URL.createObjectURL(file));
    setVoiceDuration(12);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && attachedImages.length === 0 && !attachedVideoUrl && !voiceUrl) {
      return;
    }

    const created = await addComment(videoId, {
      text: commentText.trim(),
      mediaImages: attachedImages.length > 0 ? attachedImages : undefined,
      mediaVideoUrl: attachedVideoUrl || undefined,
      voiceUrl: voiceUrl || undefined,
      voiceDuration: voiceDuration || undefined,
      voiceTranscription: voiceTranscription || undefined
    });

    if (created && currentVideo.authorId !== currentUser?.id) {
      addNotification({
        userId: currentVideo.authorId,
        actorId: currentUser!.id,
        actorName: currentUser!.displayName,
        actorAvatar: currentUser!.avatarUrl,
        type: 'comment',
        title: 'নতুন মন্তব্য',
        message: `${currentUser!.displayName} আপনার ভিডিওতে মন্তব্য করেছেন: "${commentText.slice(0, 40)}..."`,
        linkUrl: `?v=${videoId}`
      });
    }

    // Reset inputs
    setCommentText('');
    setAttachedImages([]);
    setAttachedVideoUrl('');
    setVoiceUrl('');
    setVoiceDuration(0);
    setVoiceTranscription('');
  };

  const handleSubmitReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    const rep = await addReply(commentId, videoId, replyText.trim());
    if (rep) {
      const parentComment = commentsList.find(c => c.id === commentId);
      if (parentComment && parentComment.authorId !== currentUser?.id) {
        addNotification({
          userId: parentComment.authorId,
          actorId: currentUser!.id,
          actorName: currentUser!.displayName,
          actorAvatar: currentUser!.avatarUrl,
          type: 'reply',
          title: 'নতুন উত্তর',
          message: `${currentUser!.displayName} আপনার মন্তব্যে উত্তর দিয়েছেন: "${replyText.slice(0, 40)}..."`,
          linkUrl: `?v=${videoId}`
        });
      }
    }
    setReplyText('');
    setReplyTargetCommentId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div 
        onClick={onClose}
        className="flex-1 hidden md:block cursor-pointer"
      />

      <div className="w-full md:w-[480px] h-full bg-[#0e0e11] border-l border-zinc-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm sm:text-base text-white font-['Plus_Jakarta_Sans']">
              {t('commentsTitle')}
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
              {commentsList.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Creator toggle comment on/off */}
            {isVideoAuthor && (
              <button
                onClick={() => toggleVideoComments(videoId, !currentVideo.commentsEnabled)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl border transition ${
                  currentVideo.commentsEnabled
                    ? 'border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
                    : 'border-pink-500/60 bg-pink-500/20 text-pink-300'
                }`}
                title={currentVideo.commentsEnabled ? t('turnOffComments') : t('turnOnComments')}
              >
                {currentVideo.commentsEnabled ? t('turnOffComments') : t('turnOnComments')}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top sorting indicator */}
        <div className="px-5 py-2 bg-zinc-950/50 border-b border-zinc-800/50 flex items-center justify-between text-[11px] text-zinc-400">
          <span className="flex items-center gap-1 font-medium text-cyan-400">
            <Sparkles className="w-3 h-3" />
            {t('topComments')}
          </span>
          <span>{commentsList.length} {language === 'bn' ? 'টি মন্তব্য' : 'comments'}</span>
        </div>

        {/* Guest Lock Screen Notice if not logged in */}
        {!currentUser ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-pink-400 mb-3 shadow-xl">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-white text-sm mb-1">{t('guestCommentNotice')}</h4>
            <p className="text-xs text-zinc-400 max-w-xs mb-5">
              {language === 'bn' 
                ? 'বাশারটিউবের প্রাইভেসি ও সিকিউরিটি পলিসি অনুযায়ী শুধুমাত্র লগইন করা সদস্যরা মন্তব্য দেখতে ও করতে পারেন।' 
                : 'Per BasharTube privacy rules, only registered users can view and post comments.'}
            </p>
            <button
              onClick={onOpenAuth}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-bold text-xs hover:brightness-110 transition shadow-lg shadow-cyan-500/25"
            >
              {t('login')}
            </button>
          </div>
        ) : !currentVideo.commentsEnabled ? (
          /* Comments disabled by creator notice */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 mb-3">
              <MessageSquareOff className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-white text-sm mb-1">{t('commentsTurnedOff')}</h4>
            <p className="text-xs text-zinc-400 max-w-xs">
              {language === 'bn' ? 'ক্রিয়েটর এই ভিডিওতে নতুন মন্তব্য গ্রহণ বন্ধ রেখেছেন।' : 'The video creator has closed comments on this video.'}
            </p>
          </div>
        ) : (
          /* Comments List Stream */
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {commentsList.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                {language === 'bn' ? 'এখনো কোনো মন্তব্য নেই। প্রথম মন্তব্যটি আপনিই করুন!' : 'No comments yet. Be the first to share your thoughts!'}
              </div>
            ) : (
              commentsList.map((comment) => {
                const commentReplies = replies[comment.id] || [];
                const commentReactions = reactions[comment.id] || [];
                const userReaction = commentReactions.find(r => r.userId === currentUser.id);

                return (
                  <div 
                    key={comment.id}
                    className={`p-3.5 rounded-2xl border transition ${
                      comment.isPinned
                        ? 'bg-cyan-950/20 border-cyan-500/30 ring-1 ring-cyan-500/20'
                        : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700/60'
                    }`}
                  >
                    {/* Pinned Badge */}
                    {comment.isPinned && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 mb-2">
                        <Pin className="w-3 h-3 fill-cyan-400" />
                        <span>{t('pinnedComment')}</span>
                      </div>
                    )}

                    {/* Author Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={comment.authorAvatar}
                          alt={comment.authorName}
                          className="w-8 h-8 rounded-full object-cover border border-zinc-700"
                        />
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-white leading-tight">
                              {comment.authorName}
                            </span>
                            {comment.isAuthorVerified && (
                              <CheckCircle className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                            )}
                            {comment.authorId === currentVideo.authorId && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-400">
                                CREATOR
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                            <span>@{comment.authorUsername}</span>
                            <span>•</span>
                            <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                            {comment.isEdited && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400/80 italic font-medium">{t('editedBadge')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Options: Pin (Creator), Edit/Delete (Author or Creator) */}
                      <div className="flex items-center gap-1 text-zinc-400">
                        {isVideoAuthor && (
                          <button
                            onClick={() => togglePinComment(comment.id)}
                            className="p-1 hover:text-cyan-400 transition"
                            title={comment.isPinned ? t('unpinComment') : t('pinComment')}
                          >
                            {comment.isPinned ? <PinOff className="w-3.5 h-3.5 text-cyan-400" /> : <Pin className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {(comment.authorId === currentUser.id || isVideoAuthor || isSuperAdmin) && (
                          <button
                            onClick={() => {
                              if (window.confirm(t('confirm') + '?')) {
                                deleteComment(comment.id, isVideoAuthor && comment.authorId !== currentUser.id);
                              }
                            }}
                            className="p-1 hover:text-rose-400 transition"
                            title={t('delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Comment Content / Edit Mode */}
                    {editingCommentId === comment.id ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white resize-none focus:outline-none focus:border-cyan-500"
                          rows={2}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingCommentId(null)}
                            className="px-2.5 py-1 text-[11px] rounded-lg bg-zinc-800 text-zinc-400"
                          >
                            {t('cancel')}
                          </button>
                          <button
                            onClick={() => {
                              editComment(comment.id, editingText);
                              setEditingCommentId(null);
                            }}
                            className="px-3 py-1 text-[11px] rounded-lg bg-cyan-500 text-black font-bold"
                          >
                            {t('save')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs sm:text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                        {comment.text}
                      </p>
                    )}

                    {/* Attached Images (Up to 5) */}
                    {comment.mediaImages && comment.mediaImages.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {comment.mediaImages.map((imgUrl, i) => (
                          <a key={i} href={imgUrl} target="_blank" rel="noreferrer" className="block">
                            <img
                              src={imgUrl}
                              alt="attachment"
                              className="w-20 h-20 rounded-xl object-cover border border-zinc-700/80 hover:opacity-90 transition"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Attached Comment Video (Max 1) with embedded player */}
                    {comment.mediaVideoUrl && (
                      <div className="mt-2.5 max-w-[280px] rounded-xl overflow-hidden border border-zinc-700 bg-black">
                        <video
                          src={comment.mediaVideoUrl}
                          controls
                          playsInline
                          className="w-full max-h-48 object-contain"
                          onPlay={() => setPlayingMediaId(comment.id)}
                        />
                      </div>
                    )}

                    {/* Attached Voice Message Player */}
                    {comment.voiceUrl && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => {
                              const audioEl = document.getElementById(`audio_${comment.id}`) as HTMLAudioElement;
                              if (audioEl) {
                                if (playingMediaId === comment.id) {
                                  audioEl.pause();
                                  setPlayingMediaId(null);
                                } else {
                                  audioEl.play();
                                  setPlayingMediaId(comment.id);
                                }
                              }
                            }}
                            className="w-8 h-8 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow"
                          >
                            {playingMediaId === comment.id ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
                          </button>
                          <audio
                            id={`audio_${comment.id}`}
                            src={comment.voiceUrl}
                            onEnded={() => setPlayingMediaId(null)}
                            className="hidden"
                          />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
                              <Volume2 className="w-3 h-3 text-cyan-400" />
                              {language === 'bn' ? 'ভয়েস বার্তা' : 'Voice Message'}
                            </span>
                            <span className="text-[9px] text-zinc-500">{comment.voiceDuration || 5}s</span>
                          </div>
                        </div>

                        {/* Download voice message */}
                        <a
                          href={comment.voiceUrl}
                          download="BasharTube_voice.mp3"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-400 transition"
                          title="Download audio"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    {/* Voice-to-Text Transcription if present */}
                    {comment.voiceTranscription && (
                      <div className="mt-2 p-2 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-[11px] text-cyan-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold flex items-center gap-1 text-[10px] text-cyan-400">
                            <Sparkles className="w-3 h-3" />
                            {t('voiceToText')}
                          </span>
                          {comment.authorId === currentUser.id && (
                            <button
                              onClick={() => deleteTranscription(comment.id)}
                              className="text-[9px] text-rose-400 hover:underline"
                            >
                              {t('deleteTranscription')}
                            </button>
                          )}
                        </div>
                        <p className="italic">"{comment.voiceTranscription}"</p>
                      </div>
                    )}

                    {/* Bottom Reactions & Badges Bar */}
                    <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* 6 Reactions Picker */}
                        <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-full border border-zinc-800">
                          {REACTION_ICONS.map((rx) => {
                            const count = comment.reactions?.[rx.type] || 0;
                            const isSelected = userReaction?.reactionType === rx.type;
                            return (
                              <button
                                key={rx.type}
                                onClick={() => reactToComment(comment.id, rx.type)}
                                className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full transition ${
                                  isSelected ? 'bg-cyan-500/20 scale-110 font-bold' : 'hover:scale-125'
                                }`}
                                title={rx.label}
                              >
                                <span>{rx.emoji}</span>
                                {count > 0 && <span className="text-[10px] text-zinc-400">{count}</span>}
                              </button>
                            );
                          })}
                        </div>

                        {/* View Reaction Breakdown Modal Trigger */}
                        {comment.likesCount > 0 && (
                          <button
                            onClick={() => setViewingReactionsCommentId(comment.id)}
                            className="text-[10px] font-semibold text-zinc-400 hover:text-cyan-400 transition"
                          >
                            {comment.likesCount} {language === 'bn' ? 'প্রতিক্রিয়া' : 'reactions'}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Creator Heart */}
                        {comment.hasCreatorHeart ? (
                          <div 
                            onClick={() => isVideoAuthor && toggleCreatorHeart(comment.id)}
                            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30 ${isVideoAuthor ? 'cursor-pointer hover:bg-pink-500/30' : ''}`}
                            title={isVideoAuthor ? t('removeHeart') : t('creatorHeart')}
                          >
                            <Heart className="w-3 h-3 fill-pink-500 text-pink-500" />
                            <span>Creator ❤️</span>
                          </div>
                        ) : isVideoAuthor ? (
                          <button
                            onClick={() => toggleCreatorHeart(comment.id)}
                            className="text-[10px] font-semibold text-zinc-400 hover:text-pink-400 transition flex items-center gap-1"
                          >
                            <Heart className="w-3 h-3" />
                            <span>{t('giveHeart')}</span>
                          </button>
                        ) : null}

                        {/* Reply Button */}
                        <button
                          onClick={() => {
                            setReplyTargetCommentId(replyTargetCommentId === comment.id ? null : comment.id);
                            setReplyText(`@${comment.authorUsername} `);
                          }}
                          className="text-[11px] font-semibold text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          <span>{t('reply')}</span>
                          {commentReplies.length > 0 && <span>({commentReplies.length})</span>}
                        </button>
                      </div>
                    </div>

                    {/* Direct Replies List (NO nested replies per spec) */}
                    {commentReplies.length > 0 && (
                      <div className="mt-3 pl-3 border-l-2 border-zinc-800 space-y-2.5">
                        {commentReplies.map((rep) => (
                          <div key={rep.id} className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-850">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <img
                                  src={rep.authorAvatar}
                                  alt={rep.authorName}
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                                <span className="text-[11px] font-bold text-white">{rep.authorName}</span>
                                <span className="text-[9px] text-zinc-500">@{rep.authorUsername}</span>
                                {rep.isEdited && <span className="text-[9px] text-amber-400 italic font-medium">({t('editedBadge')})</span>}
                              </div>

                              {(rep.authorId === currentUser.id || isVideoAuthor || isSuperAdmin) && (
                                <button
                                  onClick={() => deleteReply(rep.id, comment.id)}
                                  className="p-1 text-zinc-500 hover:text-rose-400 transition"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-zinc-300 leading-snug">{rep.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Input Box */}
                    {replyTargetCommentId === comment.id && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={t('replyPlaceholder')}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmitReply(comment.id);
                          }}
                        />
                        <button
                          onClick={() => handleSubmitReply(comment.id)}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500 text-black text-xs font-bold hover:brightness-110"
                        >
                          {t('reply')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Bottom Input Composer (Visible only to logged in users) */}
        {currentUser && currentVideo.commentsEnabled && (
          <div className="p-3 sm:p-4 bg-zinc-900 border-t border-zinc-800">
            {/* Attachment Previews */}
            {(attachedImages.length > 0 || attachedVideoUrl || voiceUrl) && (
              <div className="mb-2 p-2 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center gap-2 overflow-x-auto">
                {attachedImages.map((img, i) => (
                  <div key={i} className="relative shrink-0">
                    <img src={img} alt="preview" className="w-12 h-12 rounded-lg object-cover" />
                    <button
                      onClick={() => setAttachedImages(attachedImages.filter((_, idx) => idx !== i))}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {attachedVideoUrl && (
                  <div className="relative shrink-0 flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-lg border border-cyan-500/40 text-[10px] text-cyan-300">
                    <Video className="w-3.5 h-3.5" />
                    <span>Video attached</span>
                    <button
                      onClick={() => setAttachedVideoUrl('')}
                      className="text-rose-400 font-bold ml-1"
                    >
                      ×
                    </button>
                  </div>
                )}

                {voiceUrl && (
                  <div className="relative shrink-0 flex items-center gap-2 bg-zinc-900 px-2 py-1 rounded-lg border border-pink-500/40 text-[10px] text-pink-300">
                    <Mic className="w-3.5 h-3.5" />
                    <span>Voice ({voiceDuration}s)</span>
                    <button
                      type="button"
                      onClick={handleGenerateVoiceToText}
                      className="text-[9px] underline text-cyan-300 font-semibold"
                    >
                      {t('voiceToText')}
                    </button>
                    <button
                      onClick={() => { setVoiceUrl(''); setVoiceTranscription(''); }}
                      className="text-rose-400 font-bold ml-1"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Recording in progress banner */}
            {isRecording && (
              <div className="mb-2 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-between text-xs text-rose-300 animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>{t('recording')} ({recordTimer}s)</span>
                </div>
                <button
                  type="button"
                  onClick={stopRecordingVoice}
                  className="px-3 py-1 rounded-lg bg-rose-500 text-white font-bold text-xs"
                >
                  {t('stopRecord')}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmitComment} className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t('writeComment')}
                className="flex-1 px-3.5 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition"
              />

              {/* Attachment triggers */}
              <div className="flex items-center gap-1 text-zinc-400">
                {/* Image/GIF upload (up to 5) */}
                <label className="p-2 rounded-xl hover:bg-zinc-800 hover:text-cyan-400 cursor-pointer transition">
                  <Image className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageAttach}
                    className="hidden"
                  />
                </label>

                {/* Video upload (max 1) */}
                <label className="p-2 rounded-xl hover:bg-zinc-800 hover:text-cyan-400 cursor-pointer transition">
                  <Video className="w-4 h-4" />
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleCommentVideoAttach}
                    className="hidden"
                  />
                </label>

                {/* Voice Record / Upload */}
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecordingVoice}
                    className="p-2 rounded-xl hover:bg-zinc-800 hover:text-pink-400 transition"
                    title={t('recordVoice')}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                ) : null}

                <label className="p-2 rounded-xl hover:bg-zinc-800 hover:text-pink-400 cursor-pointer transition" title={t('uploadVoice')}>
                  <FileAudio className="w-4 h-4" />
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUploadAttach}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!commentText.trim() && attachedImages.length === 0 && !attachedVideoUrl && !voiceUrl}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition shadow-md shadow-cyan-500/25"
              >
                <Send className="w-4 h-4 fill-black" />
              </button>
            </form>
          </div>
        )}

        {/* Guest prompt if not logged in */}
        {!currentUser && (
          <div className="p-4 bg-zinc-900 border-t border-zinc-800 text-center font-['Hind_Siliguri']">
            <p className="text-xs text-zinc-400 mb-2.5">
              {language === 'bn' ? 'মন্তব্য করতে ও প্রতিক্রিয়া জানাতে অনুগ্রহ করে লগইন বা সাইন আপ করুন।' : 'Please log in or sign up to interact with comments.'}
            </p>
            <button
              onClick={onOpenAuth}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-400 text-white font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition"
            >
              {language === 'bn' ? 'লগইন / নতুন অ্যাকাউন্ট' : 'Log In / Sign Up'}
            </button>
          </div>
        )}

        {/* Reaction Breakdown List Modal */}
        {viewingReactionsCommentId && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>{t('reactionsSummary')}</span>
                </div>
                <button
                  onClick={() => setViewingReactionsCommentId(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {(reactions[viewingReactionsCommentId] || []).length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4">No reactions yet.</p>
                ) : (
                  (reactions[viewingReactionsCommentId] || []).map((rx) => (
                    <div key={rx.id} className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60">
                      <div className="flex items-center gap-2">
                        <img
                          src={rx.userAvatar}
                          alt={rx.username}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <span className="text-xs font-semibold text-zinc-200">@{rx.username}</span>
                      </div>
                      <span className="text-sm">
                        {REACTION_ICONS.find(i => i.type === rx.reactionType)?.emoji || '👍'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
