import React from 'react';
import { CheckCircle2, Sparkles, TrendingUp, Award } from 'lucide-react';

export interface MonetizationProgressBarProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  themeColor: 'cyan' | 'pink' | 'emerald';
  icon?: React.ReactNode;
  subtitle?: string;
  milestones?: number[]; // default [25, 50, 75, 100]
}

export const MonetizationProgressBar: React.FC<MonetizationProgressBarProps> = ({
  label,
  current,
  target,
  unit,
  themeColor,
  icon,
  subtitle,
  milestones = [25, 50, 75, 100]
}) => {
  const percentage = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
  const isCompleted = percentage >= 100;
  const remaining = Math.max(0, target - current);

  // Color schemes for cyberpunk dark luxury
  const colorMap = {
    cyan: {
      bar: 'from-cyan-500 via-sky-400 to-cyan-300',
      glow: 'shadow-[0_0_15px_rgba(6,182,212,0.5)]',
      border: 'border-cyan-500/30',
      badgeBg: 'bg-cyan-500/15',
      badgeText: 'text-cyan-400',
      textAccent: 'text-cyan-400',
      markerActive: 'bg-cyan-400 text-black border-cyan-300 ring-2 ring-cyan-500/50',
      markerInactive: 'bg-zinc-800 text-zinc-500 border-zinc-700'
    },
    pink: {
      bar: 'from-pink-500 via-rose-500 to-fuchsia-400',
      glow: 'shadow-[0_0_15px_rgba(244,63,94,0.5)]',
      border: 'border-pink-500/30',
      badgeBg: 'bg-pink-500/15',
      badgeText: 'text-pink-400',
      textAccent: 'text-pink-400',
      markerActive: 'bg-pink-500 text-white border-pink-400 ring-2 ring-pink-500/50',
      markerInactive: 'bg-zinc-800 text-zinc-500 border-zinc-700'
    },
    emerald: {
      bar: 'from-emerald-500 via-teal-400 to-emerald-300',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]',
      border: 'border-emerald-500/30',
      badgeBg: 'bg-emerald-500/15',
      badgeText: 'text-emerald-400',
      textAccent: 'text-emerald-400',
      markerActive: 'bg-emerald-400 text-black border-emerald-300 ring-2 ring-emerald-500/50',
      markerInactive: 'bg-zinc-800 text-zinc-500 border-zinc-700'
    }
  };

  const style = colorMap[themeColor];

  // Format large numbers with Bengali commas and unit
  const formatNumber = (num: number): string => {
    if (num >= 10000000) {
      const crore = (num / 10000000).toFixed(1).replace(/\.0$/, '');
      return `${crore} কোটি`;
    }
    if (num >= 100000) {
      const lakh = (num / 100000).toFixed(1).replace(/\.0$/, '');
      return `${lakh} লাখ`;
    }
    return Math.round(num).toLocaleString('bn-BD');
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border ${style.border} transition-all duration-300 hover:border-zinc-700 relative overflow-hidden group`}>
      {/* Background ambient glow */}
      <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-3xl opacity-15 pointer-events-none ${
        themeColor === 'cyan' ? 'bg-cyan-500' : themeColor === 'pink' ? 'bg-pink-500' : 'bg-emerald-500'
      }`} />

      {/* Header Info */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          {icon && (
            <div className={`w-8 h-8 rounded-xl ${style.badgeBg} flex items-center justify-center shrink-0`}>
              {icon}
            </div>
          )}
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
              <span>{label}</span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/40">
                  <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                  <span>অর্জিত</span>
                </span>
              )}
            </h4>
            {subtitle && (
              <p className="text-[11px] text-zinc-400 font-['Hind_Siliguri']">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Percentage badge */}
        <div className="text-right shrink-0">
          <span className={`inline-block px-2.5 py-1 rounded-xl ${style.badgeBg} ${style.badgeText} font-mono font-black text-xs sm:text-sm border ${style.border}`}>
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Main Visual Progress Bar Container */}
      <div className="relative pt-2 pb-1">
        {/* Track */}
        <div className="relative w-full h-3.5 bg-zinc-950 rounded-full border border-zinc-800 p-[2px] overflow-hidden">
          {/* Progress fill with animated gradient and shimmer */}
          <div
            className={`h-full rounded-full bg-gradient-to-r ${style.bar} ${style.glow} transition-all duration-700 ease-out relative`}
            style={{ width: `${Math.max(percentage, 2)}%` }}
          >
            {/* Shimmer light effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>

        {/* Milestone Pin Checkpoints */}
        <div className="relative w-full flex justify-between mt-2.5 px-0.5">
          {milestones.map((ms) => {
            const reached = percentage >= ms;
            return (
              <div
                key={ms}
                className="flex flex-col items-center group/ms cursor-default"
                style={{ width: '24px' }}
              >
                <div
                  className={`w-3 h-3 rounded-full border text-[8px] font-black flex items-center justify-center transition-all duration-300 ${
                    reached ? style.markerActive : style.markerInactive
                  }`}
                  title={`${ms}% মাইলফলক ${reached ? '(অর্জিত)' : ''}`}
                >
                  {reached ? '✓' : ''}
                </div>
                <span className={`text-[9px] font-mono mt-1 ${reached ? style.textAccent + ' font-bold' : 'text-zinc-500'}`}>
                  {ms}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Counters */}
      <div className="flex items-center justify-between text-xs pt-3 mt-2 border-t border-zinc-800/80">
        <div>
          <span className="text-[10px] text-zinc-400 block">বর্তমান অগ্রগতি</span>
          <span className="text-xs sm:text-sm font-black text-white font-mono">
            {current.toLocaleString()} {unit}
          </span>
          <span className="text-[10px] text-zinc-500 ml-1">
            ({formatNumber(current)})
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-zinc-400 block">প্রয়োজনীয় লক্ষ্যমাত্রা</span>
          <span className={`text-xs sm:text-sm font-black font-mono ${style.textAccent}`}>
            {target.toLocaleString()} {unit}
          </span>
          <span className="text-[10px] text-zinc-500 ml-1">
            ({formatNumber(target)})
          </span>
        </div>
      </div>

      {/* Remaining Counter Footnote */}
      <div className="mt-2 text-center sm:text-left">
        {!isCompleted ? (
          <span className="text-[10px] text-zinc-400 bg-zinc-950/60 px-2 py-0.5 rounded-lg border border-zinc-800/80 inline-flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            <span>মনিটাইজেশন মাইলফলকে পৌঁছাতে আরও </span>
            <strong className="text-white font-mono">{remaining.toLocaleString()} {unit}</strong>
            <span> প্রয়োজন</span>
          </span>
        ) : (
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/30 inline-flex items-center gap-1 font-bold">
            <Award className="w-3.5 h-3.5" />
            <span>অভিনন্দন! এই শর্তের মাইলফলক সম্পূর্ণভাবে পূর্ণ হয়েছে।</span>
          </span>
        )}
      </div>
    </div>
  );
};
