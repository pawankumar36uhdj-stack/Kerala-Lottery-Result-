import React from 'react';

interface RedActionSectionProps {
  onAction: (action: string) => void;
}

export const RedActionSection: React.FC<RedActionSectionProps> = ({ onAction }) => {
  return (
    <section className="relative bg-[#d62529] py-8 sm:py-10 px-4 sm:px-6 overflow-hidden">
      {/* Cherry Blossom Floral Branch on Bottom-Left matching Screenshot 1 */}
      <div className="absolute bottom-0 left-0 pointer-events-none z-0 select-none">
        <img
          src="/assets/extracted/blossom_bottom_corner.png"
          alt="Cherry blossom decoration"
          className="w-36 sm:w-48 h-auto object-contain opacity-95"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* 4 Stacked Large Rounded Pill Buttons matching Screenshot 1 */}
      <div className="relative z-10 max-w-sm sm:max-w-md mx-auto flex flex-col items-center gap-4 sm:gap-5">
        {/* 1. CHECK LOTTERY RESULT - Deep Magenta/Purple */}
        <button
          onClick={() => onAction('results')}
          className="w-full py-3.5 sm:py-4 px-6 bg-[#86055c] hover:bg-[#72044e] active:scale-[0.98] text-white font-black text-sm sm:text-base md:text-lg tracking-wider rounded-full shadow-md text-center transition-all cursor-pointer select-none animate-pulse-wiggle"
        >
          CHECK LOTTERY RESULT
        </button>

        {/* 2. TICKET BOOKING - Cyan / Teal */}
        <button
          onClick={() => onAction('booking')}
          className="w-full py-3.5 sm:py-4 px-6 bg-[#48c9b0] hover:bg-[#3db89f] active:scale-[0.98] text-white font-black text-sm sm:text-base md:text-lg tracking-wider rounded-full shadow-md text-center transition-all cursor-pointer select-none"
        >
          TICKET BOOKING
        </button>

        {/* 3. LOTTERY AGENTS - Cyan / Teal */}
        <button
          onClick={() => onAction('agents')}
          className="w-full py-3.5 sm:py-4 px-6 bg-[#48c9b0] hover:bg-[#3db89f] active:scale-[0.98] text-white font-black text-sm sm:text-base md:text-lg tracking-wider rounded-full shadow-md text-center transition-all cursor-pointer select-none"
        >
          LOTTERY AGENTS
        </button>
      </div>
    </section>
  );
};
