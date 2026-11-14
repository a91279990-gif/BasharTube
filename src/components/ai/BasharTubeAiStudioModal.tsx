import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Send,
  Loader2,
  Film,
  Smartphone,
  MonitorPlay,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { askBasharTubeAi } from '../../utils/bashartubeAiClient';

interface BasharTubeAiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpload?: () => void;
}

interface StudioMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export const BasharTubeAiStudioModal: React.FC<BasharTubeAiStudioModalProps> = ({
  isOpen,
  onClose,
  onOpenUpload,
}) => {
  const { language } = useLanguage();
  const [messages, setMessages] = useState<StudioMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickPrompts =
    language === 'bn'
      ? [
          { label: 'শর্ট ভিডিও আইডিয়া', prompt: 'বাংলাদেশের দর্শকদের জন্য ৫টি হাই-রিটেনশন শর্ট ভিডিও (9:16) আইডিয়া ও প্রথম ৩ সেকেন্ডের হুক দাও।' },
          { label: 'লং ভিডিও স্ক্রিপ্ট', prompt: 'একটি ১০ মিনিটের টেক বা ট্রাভেল লং ভিডিওর (16:9) পেশাদার আউটলাইন ও চ্যাপ্টার কাঠামো তৈরি করো।' },
          { label: 'আকর্ষণীয় টাইটেল ও ট্যাগ', prompt: 'কক্সবাজার বা সুন্দরবন ভ্রমণ ব্লগের জন্য ৫টি ক্লিকেবল বাংলা টাইটেল ও হ্যাশট্যাগ লিখে দাও।' },
        ]
      : [
          { label: 'Short Video Hooks', prompt: 'Give 5 high-retention vertical Short video (9:16) ideas and 3-second opening hooks.' },
          { label: 'Long Video Outline', prompt: 'Create a structured 10-minute widescreen Long video (16:9) script outline with chapters.' },
          { label: 'Titles & Hashtags', prompt: 'Write 5 engaging titles and hashtags for a Bangladesh travel & food vlog.' },
        ];

  const handleSend = async (customPrompt?: string) => {
    const query = (customPrompt ?? input).trim();
    if (!query || isLoading) return;

    setError(null);
    const userMsg: StudioMessage = {
      id: 'u_' + Date.now(),
      role: 'user',
      text: query,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    try {
      const reply = await askBasharTubeAi({
        mode: 'studio',
        question: query,
        history: nextHistory.map((m) => ({ role: m.role, text: m.text })),
        language,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: 'a_' + Date.now(),
          role: 'assistant',
          text: reply,
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : language === 'bn'
          ? 'BasharTube AI সংযোগ ব্যর্থ হয়েছে।'
          : 'Failed to reach BasharTube AI.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="BasharTube AI Studio"
    >
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-pink-500 p-[2px] shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <span>BasharTube AI Studio</span>
              </h2>
              <p className="text-[11px] text-zinc-400 font-['Hind_Siliguri']">
                {language === 'bn'
                  ? 'শর্ট ও লং ভিডিওর স্ক্রিপ্ট, টাইটেল, হ্যাশট্যাগ ও কনটেন্ট আইডিয়া সহকারী'
                  : 'Short & Long video scripts, titles, hashtags & creator strategist'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close BasharTube AI Studio"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-6 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>BasharTube AI</span>
              </div>
              <h3 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
                {language === 'bn'
                  ? 'আজ আপনার পরবর্তী ভিডিওটি কী নিয়ে হবে?'
                  : 'What will you create next on BasharTube?'}
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto font-['Hind_Siliguri']">
                {language === 'bn'
                  ? '৯:১৬ শর্ট ভিডিও হোক বা ১৬:৯ লং ভিডিও—AI দিয়ে পেশাদার টাইটেল, চ্যাপ্টার, স্ক্রিপ্ট ও দর্শক আকর্ষণের কৌশল তৈরি করুন।'
                  : 'Generate pro titles, chapters, bilingual hooks, and video scripts for both Short and Long uploads.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left pt-2">
                {quickPrompts.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleSend(item.prompt)}
                    className="p-3.5 rounded-2xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-cyan-500/40 text-left transition group"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 mb-1">
                      {item.label.includes('শর্ট') || item.label.includes('Short') ? (
                        <Smartphone className="w-3.5 h-3.5" />
                      ) : item.label.includes('লং') || item.label.includes('Long') ? (
                        <MonitorPlay className="w-3.5 h-3.5 text-pink-400" />
                      ) : (
                        <Film className="w-3.5 h-3.5" />
                      )}
                      <span>{item.label}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 font-['Hind_Siliguri']">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-['Hind_Siliguri'] ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-black font-semibold'
                    : 'bg-zinc-950 border border-zinc-800 text-zinc-200'
                }`}
              >
                {msg.text}
                {msg.role === 'assistant' && (
                  <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-cyan-400 transition"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>{language === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{language === 'bn' ? 'কপি' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-cyan-400 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 w-fit">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {language === 'bn'
                  ? 'BasharTube AI চিন্তা করছে...'
                  : 'BasharTube AI is thinking...'}
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Input Footer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3.5 sm:p-4 border-t border-zinc-800 bg-zinc-950/70 flex items-center gap-2"
        >
          {onOpenUpload && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenUpload();
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 transition shrink-0"
            >
              <Film className="w-3.5 h-3.5 text-pink-400" />
              <span>{language === 'bn' ? 'আপলোড' : 'Upload'}</span>
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              language === 'bn'
                ? 'ভিডিও আইডিয়া, স্ক্রিপ্ট বা টাইটেল সম্পর্কে লিখুন...'
                : 'Ask for video scripts, hooks, titles, or tags...'
            }
            className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label="Send to BasharTube AI"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-bold text-xs flex items-center gap-1.5 hover:brightness-110 disabled:opacity-40 transition shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
