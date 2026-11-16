import React from 'react';

interface HeroSectionProps {
  onAction: (action: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onAction }) => {
  return (
    <div className="w-full bg-[#08121f]">
      {/* Banner Container matching Screenshot 1 */}
      <div className="relative w-full overflow-hidden bg-black">
        <img
          src="/assets/extracted/hero_stage_clean.jpg"
          alt="Kerala State Lottery 50th Anniversary Inauguration Ceremony"
          className="w-full h-auto object-cover max-h-[360px] sm:max-h-[420px]"
          referrerPolicy="no-referrer"
        />

        {/* 3 Overlaid Pill Buttons near bottom of the banner */}
        <div className="absolute bottom-2.5 sm:bottom-4 left-0 right-0 px-2 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-3 z-10">
          <button
            onClick={() => onAction('results')}
            className="flex-1 max-w-[135px] sm:max-w-[170px] py-1.5 sm:py-2.5 px-2 bg-[#48c9b0] hover:bg-[#3db89f] active:scale-95 text-white text-[10px] sm:text-xs md:text-sm font-extrabold uppercase tracking-wider rounded-full shadow-lg border border-teal-200/40 text-center transition-all cursor-pointer whitespace-nowrap animate-pulse-wiggle"
          >
            CHECK LOTTERY RESULT
          </button>
          <button
            onClick={() => onAction('agents')}
            className="flex-1 max-w-[135px] sm:max-w-[170px] py-1.5 sm:py-2.5 px-2 bg-[#48c9b0] hover:bg-[#3db89f] active:scale-95 text-white text-[10px] sm:text-xs md:text-sm font-extrabold uppercase tracking-wider rounded-full shadow-lg border border-teal-200/40 text-center transition-all cursor-pointer whitespace-nowrap"
          >
            LOTTERY AGENTS
          </button>
        </div>
      </div>

      {/* Marquee Ticker Bar matching Screenshot 1 */}
      <div className="bg-[#050b14] border-y border-slate-900 py-2 px-3 sm:px-4 flex items-center overflow-hidden">
        <div className="flex items-center gap-1 text-red-600 font-bold text-xs sm:text-sm shrink-0 pr-2 z-10 bg-[#050b14]">
          <span>Latest Updates</span>
          <span className="text-red-500 font-extrabold">»</span>
        </div>
        <div className="relative overflow-hidden w-full whitespace-nowrap">
          <div className="animate-marquee inline-block text-white text-xs sm:text-sm font-normal">
            <span className="mr-8">
              Draw No. FF-118 (Fifty-Fifty) 3 PM | Check your result now | 1st Prize ₹1 Crore Ticket: FW 482910 | Official updates and live broadcast from Gorky Bhavan Thiruvananthapuram | Karunya Plus KN-520 draw tomorrow | Beware of fake lottery apps - Buy only genuine paper lotteries!
            </span>
            <span className="mr-8">
              Draw No. FF-118 (Fifty-Fifty) 3 PM | Check your result now | 1st Prize ₹1 Crore Ticket: FW 482910 | Official updates and live broadcast from Gorky Bhavan Thiruvananthapuram | Karunya Plus KN-520 draw tomorrow | Beware of fake lottery apps - Buy only genuine paper lotteries!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
