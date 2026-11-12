import React from 'react';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Video, 
  Trash2, 
  Clock, 
  User 
} from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export const CallHistoryView: React.FC = () => {
  const { callHistory, deleteCallHistoryItem, clearAllCallHistory, startCall } = useCall();
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();

  const formatSecs = (s: number) => {
    if (!s) return '0s';
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 w-full animate-in fade-in">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
            {t('callHistory')}
          </h2>
          <p className="text-xs text-zinc-400">
            {language === 'bn' ? 'সকল ভয়েস ও ভিডিও কলের পূর্ণাঙ্গ বিবরণী' : 'Detailed log of your voice and video calling interactions'}
          </p>
        </div>

        {callHistory.length > 0 && (
          <button
            onClick={clearAllCallHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-rose-500/10 border border-zinc-800 hover:border-rose-500/30 text-xs font-semibold text-rose-400 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('clearCallHistory')}</span>
          </button>
        )}
      </div>

      {callHistory.length === 0 ? (
        <div className="py-20 text-center text-zinc-500 text-xs">
          <Phone className="w-10 h-10 mx-auto text-zinc-600 mb-2 opacity-50" />
          <p>{language === 'bn' ? 'কোনো পূর্ববর্তী কলের বিবরণ নেই।' : 'No recent call records.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {callHistory.map((call) => {
            const isCaller = call.callerId === currentUser?.id;
            const otherName = isCaller ? call.receiverName : call.callerName;
            const otherAvatar = isCaller ? call.receiverAvatar : call.callerAvatar;
            const otherUser = {
              id: isCaller ? call.receiverId : call.callerId,
              email: 'user@bashartube.com',
              displayName: otherName,
              username: otherName.toLowerCase().replace(/\s+/g, '_'),
              avatarUrl: otherAvatar,
              bio: '',
              websiteUrl: '',
              role: 'user' as const,
              isVerified: false,
              isKidsAccount: false,
              followersCount: 0,
              followingCount: 0,
              totalViews: 0,
              totalLikes: 0,
              totalShares: 0,
              isSuspended: false,
              createdAt: call.createdAt
            };

            return (
              <div
                key={call.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-3 hover:border-zinc-700 transition"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={otherAvatar}
                    alt={otherName}
                    className="w-11 h-11 rounded-full object-cover border border-zinc-700"
                  />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                      {otherName}
                      <span className="text-[10px] text-zinc-400 font-normal">
                        ({call.type === 'video' ? 'Video' : 'Voice'})
                      </span>
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                      {call.status === 'missed' ? (
                        <span className="text-rose-400 flex items-center gap-1 font-semibold">
                          <PhoneMissed className="w-3.5 h-3.5" />
                          {t('missedCall')}
                        </span>
                      ) : isCaller ? (
                        <span className="text-cyan-400 flex items-center gap-1">
                          <PhoneOutgoing className="w-3.5 h-3.5" />
                          Outgoing
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <PhoneIncoming className="w-3.5 h-3.5" />
                          Incoming
                        </span>
                      )}
                      <span>•</span>
                      <span>{formatSecs(call.duration)}</span>
                      <span>•</span>
                      <span>{new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Re-dial Button */}
                  <button
                    onClick={() => startCall(otherUser, call.type)}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-cyan-500/20 hover:text-cyan-400 text-zinc-300 transition"
                    title="Call again"
                  >
                    {call.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  </button>

                  {/* Delete Item */}
                  <button
                    onClick={() => deleteCallHistoryItem(call.id)}
                    className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title={t('delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
