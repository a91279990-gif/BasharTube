import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Pin, 
  Phone, 
  Video, 
  Image as ImageIcon, 
  Paperclip, 
  Mic, 
  Send, 
  Check, 
  CheckCheck, 
  Trash2, 
  Edit3, 
  FileText, 
  Palette, 
  Download, 
  Clock,
  X,
  Lock,
  Eye,
  EyeOff,
  WifiOff,
  UserPlus
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useMessenger } from '../../context/MessengerContext';
import { useCall } from '../../context/CallContext';
import { MessageItem, MessageType, UserProfile } from '../../types';
import { generateDefaultAvatarDataUrl } from '../../utils/profileSync';

const WALLPAPER_PRESETS = [
  'linear-gradient(135deg, #09090b 0%, #171720 100%)',
  'linear-gradient(135deg, #071520 0%, #09090b 100%)',
  'linear-gradient(135deg, #1c0a18 0%, #09090b 100%)',
  'linear-gradient(135deg, #061914 0%, #09090b 100%)',
  'linear-gradient(135deg, #18181b 0%, #121215 100%)'
];

export const MessengerView: React.FC = () => {
  const { t } = useLanguage();
  const { currentUser, preferences, toggleSeenStatus } = useAuth();
  const { 
    chats, 
    activeChatId, 
    setActiveChatId, 
    messagesForActiveChat, 
    isOnline,
    sendMessage, 
    editMessage, 
    deleteMessageForMe, 
    deleteMessageForEveryone, 
    togglePinChat, 
    setChatWallpaper,
    startChatWithUser,
    isRecipientTyping,
    setIsUserTyping,
    pendingQueueCount
  } = useMessenger();
  const { startCall } = useCall();

  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ 
    url: string; 
    name: string; 
    type: MessageType; 
    size?: string;
    previewUrl?: string; // Only for image and video (Item 19)
  } | null>(null);
  
  // Voice recording simulation
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Message edit state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [viewingHistoryMessage, setViewingHistoryMessage] = useState<MessageItem | null>(null);

  // Wallpaper picker state
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeChat = chats.find(c => c.id === activeChatId);

  // Load registered users safely so users can chat with anyone directly
  const registeredAccounts: UserProfile[] = (() => {
    try {
      const saved = localStorage.getItem('bashartube_registered_accounts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })();

  const otherId = activeChat ? (activeChat.userAId === currentUser?.id ? activeChat.userBId : activeChat.userAId) : null;
  const recipientUser = activeChat?.otherUser || (otherId ? registeredAccounts.find(u => u.id === otherId) : null) || ({
    id: otherId || 'user_unknown',
    displayName: 'Chat Member',
    username: 'member',
    avatarUrl: generateDefaultAvatarDataUrl('Chat Member', otherId || 'member'),
    isVerified: false,
    role: 'user'
  } as UserProfile);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesForActiveChat, isRecipientTyping]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordDuration(0);
    timerRef.current = setInterval(() => {
      setRecordDuration(prev => prev + 1);
    }, 1000);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedFile({
      url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
      name: `Voice_Message_${Date.now()}.mp3`,
      type: 'voice',
      size: `${Math.max(2, recordDuration)}s`
    });
  };

  // Item 19: Message composer previews ONLY Image and Video; PDF/Word/Excel documents sent directly without inline preview
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: MessageType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    
    // Only image and video get visual thumbnail previews
    const hasVisualPreview = type === 'image' || type === 'video';

    setSelectedFile({
      url,
      name: file.name,
      type,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      previewUrl: hasVisualPreview ? url : undefined
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    await sendMessage(inputText.trim(), {
      messageType: selectedFile ? selectedFile.type : 'text',
      mediaUrl: selectedFile?.url,
      fileName: selectedFile?.name,
      fileSize: selectedFile?.size
    });

    setInputText('');
    setSelectedFile(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    // Notify typing indicator (Item 14)
    setIsUserTyping(true);
  };

  // Filter chats by search
  const filteredChats = chats.filter(c => {
    const name = c.otherUser?.displayName || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  }).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <Lock className="w-12 h-12 text-pink-400 mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">{t('messengerTitle')}</h3>
        <p className="text-xs text-zinc-400 max-w-sm mb-4">মেসেঞ্জার ও সরাসরি কল ব্যবহার করতে আপনার অ্যাকাউন্টে লগইন অথবা সাইন আপ করুন।</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-65px)] flex overflow-hidden bg-[#09090b]">
      {/* Left Chat List Column */}
      <div className="w-80 sm:w-96 border-r border-zinc-800 flex flex-col bg-zinc-950/60 shrink-0">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
              {t('messengerTitle')}
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
              Direct P2P
            </span>
          </div>

          <button
            onClick={() => setShowNewChatModal(true)}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-zinc-800 transition"
            title="নতুন চ্যাট শুরু করুন"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Offline Banner (Item 21) */}
        {!isOnline && (
          <div className="p-2.5 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-2 text-amber-300 text-[11px] font-['Hind_Siliguri']">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>অফলাইনে আছেন। মেসেজ জমা থাকবে এবং অনলাইন হলে স্বয়ংক্রিয়ভাবে চলে যাবে ({pendingQueueCount})</span>
          </div>
        )}

        {/* Search Chats */}
        <div className="p-3 border-b border-zinc-800/80">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="চ্যাট বা সদস্য খুঁজুন..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
          {filteredChats.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500">
              <p className="mb-3">কোনো চ্যাট পাওয়া যায়নি</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold hover:bg-cyan-500/20 transition"
              >
                + সদস্যের সাথে চ্যাট শুরু করুন
              </button>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const other = chat.otherUser || (chat.userAId === currentUser?.id ? registeredAccounts.find(u => u.id === chat.userBId) : registeredAccounts.find(u => u.id === chat.userAId)) || {
                displayName: 'Member',
                username: 'member',
                avatarUrl: generateDefaultAvatarDataUrl('Member', chat.id),
                isVerified: false
              };
              const isSelected = chat.id === activeChatId;

              return (
                <div
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition ${
                    isSelected ? 'bg-cyan-500/10 border-l-4 border-cyan-400' : 'hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={other.avatarUrl}
                        alt={other.displayName}
                        className="w-11 h-11 rounded-full object-cover border border-zinc-700"
                      />
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
                    </div>
                    <div className="flex flex-col max-w-[170px]">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white truncate">{other.displayName}</span>
                        {other.isVerified && <span className="text-cyan-400 text-xs">✓</span>}
                      </div>
                      <span className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {chat.lastMessageText || 'চ্যাট করুন...'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-zinc-500">
                      {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {chat.isPinned && <Pin className="w-3 h-3 text-cyan-400 fill-cyan-400" />}
                      {/* Unread message counter (Item 20) */}
                      {(chat.unreadCount || 0) > 0 && (
                        <span className="min-w-4 h-4 px-1 rounded-full bg-cyan-400 text-black text-[10px] font-black flex items-center justify-center shadow-sm">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Chat Conversation Pane */}
      {activeChat ? (
        <div 
          className="flex-1 flex flex-col relative transition-all duration-300"
          style={{ background: activeChat.wallpaper || 'linear-gradient(135deg, #09090b 0%, #171720 100%)' }}
        >
          {/* Active Chat Header */}
          <div className="px-5 py-3 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md flex items-center justify-between z-20">
            <div className="flex items-center gap-3">
              <img
                src={recipientUser.avatarUrl}
                alt={recipientUser.displayName}
                className="w-10 h-10 rounded-full object-cover border border-zinc-700"
              />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  {recipientUser.displayName}
                  {recipientUser.isVerified && <span className="text-cyan-400 text-xs">✓</span>}
                </h3>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  সক্রিয় (Online)
                </span>
              </div>
            </div>

            {/* Header Actions: Voice Call, Video Call, Seen Toggle, Pin, Wallpaper */}
            <div className="flex items-center gap-2">
              {/* Voice Call (Item 15: direct call to any user) */}
              <button
                onClick={() => startCall(recipientUser, 'voice')}
                title="ভয়েস কল শুরু করুন"
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-zinc-800 transition"
              >
                <Phone className="w-4 h-4" />
              </button>

              {/* Video Call (Item 15) */}
              <button
                onClick={() => startCall(recipientUser, 'video')}
                title="ভিডিও কল শুরু করুন"
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-pink-400 border border-zinc-800 transition"
              >
                <Video className="w-4 h-4" />
              </button>

              {/* Seen Status Toggle Button (Item 13) */}
              <button
                onClick={() => toggleSeenStatus(!preferences.seenStatusEnabled)}
                title={preferences.seenStatusEnabled ? 'Seen স্ট্যাটাস বন্ধ করুন' : 'Seen স্ট্যাটাস চালু করুন'}
                className={`p-2 rounded-xl border transition flex items-center gap-1 text-[11px] font-semibold ${
                  preferences.seenStatusEnabled 
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                {preferences.seenStatusEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">Seen: {preferences.seenStatusEnabled ? 'ON' : 'OFF'}</span>
              </button>

              {/* Pin Chat */}
              <button
                onClick={() => togglePinChat(activeChat.id)}
                title={activeChat.isPinned ? 'চ্যাট আনপিন করুন' : 'চ্যাট পিন করুন'}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition"
              >
                {activeChat.isPinned ? <Pin className="w-4 h-4 text-cyan-400 fill-cyan-400" /> : <Pin className="w-4 h-4" />}
              </button>

              {/* Wallpaper Picker */}
              <button
                onClick={() => setShowWallpaperPicker(!showWallpaperPicker)}
                title="ওয়ালপেপার পরিবর্তন করুন"
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition"
              >
                <Palette className="w-4 h-4 text-pink-400" />
              </button>
            </div>
          </div>

          {/* Wallpaper Selection Popup */}
          {showWallpaperPicker && (
            <div className="absolute right-4 top-16 z-30 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl animate-in zoom-in-95">
              <span className="text-[11px] font-bold text-zinc-400 block mb-2">চ্যাট ব্যাকগ্রাউন্ড ওয়ালপেপার</span>
              <div className="flex gap-2">
                {WALLPAPER_PRESETS.map((wp, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setChatWallpaper(activeChat.id, wp); setShowWallpaperPicker(false); }}
                    className="w-8 h-8 rounded-xl border border-zinc-700 shadow transition hover:scale-110"
                    style={{ background: wp }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messagesForActiveChat.map((msg) => {
              const isMine = msg.senderId === currentUser.id;
              if (msg.deletedForUserIds?.includes(currentUser.id)) {
                return null;
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="relative max-w-[85%] sm:max-w-[70%]">
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-md transition ${
                        isMine
                          ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-medium rounded-tr-xs'
                          : 'bg-zinc-900/90 text-white border border-zinc-800 rounded-tl-xs'
                      }`}
                    >
                      {/* Image Message */}
                      {msg.messageType === 'image' && msg.mediaUrl && (
                        <img
                          src={msg.mediaUrl}
                          alt="attached"
                          className="rounded-xl mb-2 max-h-60 object-cover"
                        />
                      )}

                      {/* Video Message */}
                      {msg.messageType === 'video' && msg.mediaUrl && (
                        <video
                          src={msg.mediaUrl}
                          controls
                          className="rounded-xl mb-2 max-h-52 object-contain bg-black"
                        />
                      )}

                      {/* Voice Message */}
                      {msg.messageType === 'voice' && msg.mediaUrl && (
                        <div className="flex items-center gap-3 py-1">
                          <audio controls src={msg.mediaUrl} className="h-8 max-w-[200px]" />
                        </div>
                      )}

                      {/* File Document (Item 19: document shown as file chip with name & size) */}
                      {msg.messageType === 'file' && (
                        <div className="flex items-center gap-2 py-1 mb-1 bg-black/20 px-3 py-2 rounded-xl">
                          <FileText className="w-5 h-5 shrink-0" />
                          <div className="flex flex-col overflow-hidden">
                            <span className="font-bold truncate text-xs">{msg.fileName || 'Document.pdf'}</span>
                            <span className="text-[10px] opacity-75">{msg.fileSize || '1.2 MB'}</span>
                          </div>
                          {msg.mediaUrl && (
                            <a href={msg.mediaUrl} download={msg.fileName || 'document'} className="p-1 hover:opacity-80">
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Text */}
                      {msg.text && (
                        <p className={`whitespace-pre-wrap leading-relaxed ${msg.isDeletedForEveryone ? 'italic opacity-60' : ''}`}>
                          {msg.text}
                        </p>
                      )}

                      {/* Metadata: Time, Edited label, and Sent/Delivered/Seen status (Item 21) */}
                      <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMine ? 'text-zinc-800 font-semibold' : 'text-zinc-400'}`}>
                        {msg.isEdited && (
                          <button
                            onClick={() => setViewingHistoryMessage(msg)}
                            className="underline mr-1 font-bold"
                          >
                            সম্পাদিত
                          </button>
                        )}
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                        {isMine && (
                          <span>
                            {/* Item 21: Clock icon for pending offline messages */}
                            {msg.status === 'pending' ? (
                              <span title="অফলাইনে জমা আছে (Pending queue)" className="inline-flex items-center gap-0.5 text-zinc-800">
                                <Clock className="w-3 h-3 text-zinc-900" />
                              </span>
                            ) : msg.status === 'seen' ? (
                              <span title="দেখা হয়েছে (Seen)">
                                <CheckCheck className="w-3.5 h-3.5 text-cyan-950 font-black" />
                              </span>
                            ) : msg.status === 'delivered' ? (
                              <span title="পৌঁছেছে (Delivered)">
                                <CheckCheck className="w-3.5 h-3.5 text-zinc-700" />
                              </span>
                            ) : (
                              <span title="পাঠানো হয়েছে (Sent)">
                                <Check className="w-3.5 h-3.5 text-zinc-700" />
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hover Message Options: Edit, Delete for Me, Delete for Everyone */}
                    {!msg.isDeletedForEveryone && (
                      <div className="opacity-0 group-hover:opacity-100 transition absolute top-1 -right-8 flex flex-col gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shadow-lg">
                        {isMine && (
                          <button
                            onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.text); }}
                            className="p-1 hover:text-cyan-400 text-zinc-400"
                            title="সম্পাদনা করুন"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteMessageForMe(msg.id)}
                          className="p-1 hover:text-amber-400 text-zinc-400"
                          title="আমার জন্য মুছুন"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        {isMine && (
                          <button
                            onClick={() => deleteMessageForEveryone(msg.id)}
                            className="p-1 hover:text-rose-400 text-zinc-400"
                            title="সবার জন্য মুছুন"
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator (Item 14: Always active typing indicator) */}
            {isRecipientTyping && (
              <div className="flex items-center gap-2 text-zinc-400 text-xs py-1">
                <span className="flex gap-1 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                </span>
                <span className="text-[11px]">{recipientUser.displayName} টাইপ করছেন...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Edit Message Modal */}
          {editingMessageId && (
            <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2">
              <span className="text-xs text-cyan-400 font-bold shrink-0">মেসেজ সম্পাদনা:</span>
              <input
                type="text"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white"
              />
              <button
                onClick={() => setEditingMessageId(null)}
                className="px-2.5 py-1 text-xs text-zinc-400"
              >
                বাতিল
              </button>
              <button
                onClick={() => {
                  editMessage(editingMessageId, editingText);
                  setEditingMessageId(null);
                }}
                className="px-3 py-1 bg-cyan-500 text-black font-bold text-xs rounded-xl"
              >
                সংরক্ষণ
              </button>
            </div>
          )}

          {/* Edit History Version Modal */}
          {viewingHistoryMessage && (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-sm w-full">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-white">মেসেজ সম্পাদনার ইতিহাস</span>
                  <button onClick={() => setViewingHistoryMessage(null)} className="text-zinc-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(viewingHistoryMessage.editHistory || []).map((h, i) => (
                    <div key={i} className="p-2 rounded-xl bg-zinc-950 text-xs text-zinc-300">
                      <div className="text-[9px] text-zinc-500 mb-0.5">সংস্করণ {i + 1} • {new Date(h.editedAt).toLocaleTimeString()}</div>
                      <p>"{h.text}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Chat Input Form */}
          <div className="p-3 sm:p-4 bg-zinc-950/90 border-t border-zinc-800/80 backdrop-blur-md">
            {/* Attachment Preview Chip (Item 19: Preview ONLY Image & Video. Documents show name/size without preview) */}
            {selectedFile && (
              <div className="mb-2.5 p-2 rounded-2xl bg-zinc-900 border border-cyan-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  {selectedFile.previewUrl && selectedFile.type === 'image' && (
                    <img 
                      src={selectedFile.previewUrl} 
                      alt="Thumbnail Preview" 
                      className="w-12 h-12 rounded-xl object-cover border border-cyan-400/40" 
                    />
                  )}
                  {selectedFile.previewUrl && selectedFile.type === 'video' && (
                    <video 
                      src={selectedFile.previewUrl} 
                      className="w-14 h-12 rounded-xl object-cover bg-black border border-cyan-400/40" 
                    />
                  )}
                  {selectedFile.type === 'file' && (
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-cyan-400">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex flex-col overflow-hidden max-w-[200px]">
                    <span className="text-xs font-bold text-white truncate">{selectedFile.name}</span>
                    <span className="text-[10px] text-zinc-400">{selectedFile.size} • {selectedFile.type}</span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => setSelectedFile(null)} 
                  className="p-1.5 rounded-lg bg-zinc-800 text-rose-400 hover:bg-rose-500 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {isRecording && (
              <div className="mb-2 p-2 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-between text-xs text-rose-300 animate-pulse">
                <span>ভয়েস মেসেজ রেকর্ড হচ্ছে... ({recordDuration}s)</span>
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="px-3 py-1 rounded-lg bg-rose-500 text-white font-bold text-xs"
                >
                  সম্পন্ন
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="একটি বার্তা লিখুন..."
                className="flex-1 px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 font-sans"
              />

              {/* Attachments: Image, Video, Document, Voice */}
              <div className="flex items-center gap-1 text-zinc-400">
                <label className="p-2 rounded-xl hover:bg-zinc-800 hover:text-cyan-400 cursor-pointer transition" title="ছবি পাঠান">
                  <ImageIcon className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'image')}
                    className="hidden"
                  />
                </label>

                <label className="p-2 rounded-xl hover:bg-zinc-800 hover:text-cyan-400 cursor-pointer transition" title="ভিডিও পাঠান">
                  <Video className="w-4 h-4" />
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileUpload(e, 'video')}
                    className="hidden"
                  />
                </label>

                {/* Documents: PDF, Word, Excel (Item 19: sent directly without inline preview) */}
                <label className="p-2 rounded-xl hover:bg-zinc-800 hover:text-cyan-400 cursor-pointer transition" title="ডকুমেন্ট পাঠান (.pdf, .docx, .xlsx)">
                  <Paperclip className="w-4 h-4" />
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => handleFileUpload(e, 'file')}
                    className="hidden"
                  />
                </label>

                {!isRecording && (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="p-2 rounded-xl hover:bg-zinc-800 hover:text-pink-400 transition"
                    title="ভয়েস রেকর্ড করুন"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() && !selectedFile}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition shadow-md shadow-cyan-500/25"
                title="বার্তা পাঠান"
              >
                <Send className="w-4 h-4 fill-black" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 font-['Hind_Siliguri']">
          <p className="text-sm mb-3">একটি চ্যাট নির্বাচন করুন অথবা নতুন চ্যাট শুরু করুন</p>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="px-4 py-2 rounded-xl bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 hover:brightness-110 transition flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>সরাসরি চ্যাট শুরু করুন</span>
          </button>
        </div>
      )}

      {/* New Chat Modal: Shows registered users for direct 1-on-1 chatting & calling */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 max-w-sm w-full font-['Hind_Siliguri'] shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                <span>সরাসরি চ্যাট ও কল শুরু করুন</span>
              </h3>
              <button onClick={() => setShowNewChatModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {registeredAccounts.filter(u => u.id !== currentUser.id).length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-500">
                  অন্য কোনো নিবন্ধিত সদস্য পাওয়া যায়নি।
                </div>
              ) : (
                registeredAccounts
                  .filter(u => u.id !== currentUser.id)
                  .map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        startChatWithUser(user);
                        setShowNewChatModal(false);
                      }}
                      className="p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 flex items-center justify-between cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="w-9 h-9 rounded-full object-cover border border-zinc-700"
                        />
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition">
                            {user.displayName}
                          </div>
                          <div className="text-[10px] text-zinc-500">@{user.username}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                        চ্যাট
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
