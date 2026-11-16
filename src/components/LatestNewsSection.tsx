import React from 'react';
import { Image, FileEdit, Play, Megaphone } from 'lucide-react';
import { NEWS_NOTICES, NewsNotice } from '../data/lotteryData';

interface LatestNewsSectionProps {
  onSelectNotice: (notice: NewsNotice) => void;
  onAction: (action: string) => void;
}

export const LatestNewsSection: React.FC<LatestNewsSectionProps> = ({ onSelectNotice, onAction }) => {
  return (
    <section className="bg-[#f4f6f8] py-8 px-4 sm:px-6">
      <div className="max-w-sm sm:max-w-md mx-auto">
        {/* Section Heading matching Screenshot 5 */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-black text-center tracking-tight mb-6">
          Latest News
        </h2>

        {/* 3 News Notice Cards matching Screenshot 5 */}
        <div className="space-y-3 mb-10">
          {NEWS_NOTICES.map((notice) => (
            <div
              key={notice.id}
              onClick={() => onSelectNotice(notice)}
              className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden flex items-stretch cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
            >
              {/* Dark teal date badge with yellow text */}
              <div className="bg-[#0b3c4c] text-white px-4 py-3 flex flex-col items-center justify-center min-w-[72px] sm:min-w-[80px] shrink-0">
                <span className="text-2xl sm:text-3xl font-black text-[#facc15] leading-none">
                  {notice.dateDay}
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-[#facc15] tracking-wider mt-1 uppercase">
                  {notice.dateMonth}
                </span>
              </div>

              {/* Title & Link */}
              <div className="p-3 sm:p-4 flex flex-col justify-center">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {notice.title}
                </h3>
                <span className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium mt-1">
                  {notice.subtitle}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 4 App / Utility Squircle Buttons matching Screenshot 5 */}
        <div className="grid grid-cols-2 gap-6 sm:gap-8 justify-items-center pt-2">
          {/* 1. Virtual Museum - Orange */}
          <button
            onClick={() => onAction('museum')}
            className="flex flex-col items-center group cursor-pointer focus:outline-none"
          >
            <div className="w-20 h-20 sm:w-22 sm:h-22 bg-[#f97316] rounded-3xl flex items-center justify-center shadow-md group-hover:scale-105 active:scale-95 transition-all text-white">
              <Image className="w-10 h-10 stroke-[2.2]" />
            </div>
            <span className="mt-2.5 text-slate-900 font-semibold text-sm sm:text-base text-center">
              Virtual Museum
            </span>
          </button>

          {/* 2. Grievance - Green */}
          <button
            onClick={() => onAction('grievance')}
            className="flex flex-col items-center group cursor-pointer focus:outline-none"
          >
            <div className="w-20 h-20 sm:w-22 sm:h-22 bg-[#22c55e] rounded-3xl flex items-center justify-center shadow-md group-hover:scale-105 active:scale-95 transition-all text-white">
              <FileEdit className="w-10 h-10 stroke-[2.2]" />
            </div>
            <span className="mt-2.5 text-slate-900 font-semibold text-sm sm:text-base text-center">
              Grievance
            </span>
          </button>

          {/* 3. Live Draw - Red (Underlined label) */}
          <button
            onClick={() => onAction('live_draw')}
            className="flex flex-col items-center group cursor-pointer focus:outline-none"
          >
            <div className="w-20 h-20 sm:w-22 sm:h-22 bg-[#ef4444] rounded-3xl flex items-center justify-center shadow-md group-hover:scale-105 active:scale-95 transition-all text-white">
              <Play className="w-10 h-10 fill-white ml-1" />
            </div>
            <span className="mt-2.5 text-blue-600 underline font-semibold text-sm sm:text-base text-center">
              Live Draw
            </span>
          </button>

          {/* 4. Ads - Olive / Lime Green */}
          <button
            onClick={() => onAction('ads')}
            className="flex flex-col items-center group cursor-pointer focus:outline-none"
          >
            <div className="w-20 h-20 sm:w-22 sm:h-22 bg-[#84cc16] rounded-3xl flex items-center justify-center shadow-md group-hover:scale-105 active:scale-95 transition-all text-white">
              <Megaphone className="w-10 h-10 stroke-[2.2]" />
            </div>
            <span className="mt-2.5 text-slate-900 font-semibold text-sm sm:text-base text-center">
              Ads
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
