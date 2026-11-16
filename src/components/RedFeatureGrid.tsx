import React from 'react';
import { Trophy, User, Box } from 'lucide-react';

interface RedFeatureGridProps {
  onAction: (action: string) => void;
}

export const RedFeatureGrid: React.FC<RedFeatureGridProps> = ({ onAction }) => {
  return (
    <section className="relative bg-[#d62529] pt-14 pb-12 sm:pt-16 sm:pb-14 px-4 sm:px-6 overflow-hidden">
      {/* Cherry Blossom Floral Branch on Top-Left matching Screenshot 2 */}
      <div className="absolute top-0 left-0 pointer-events-none z-0 select-none">
        <img
          src="/assets/extracted/blossom_top_branch.png"
          alt="Decorative cherry blossom branch"
          className="w-48 sm:w-64 h-auto object-contain opacity-95"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="relative z-10 max-w-sm sm:max-w-md mx-auto">
        {/* Balanced Grid of Rounded Dark Cards */}
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
          {/* Card 1: Lottery Result */}
          <button
            onClick={() => onAction('results')}
            className="col-span-2 bg-[#1c2e3d] hover:bg-[#152431] active:scale-95 text-white rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center shadow-lg transition-all border border-slate-700/30 cursor-pointer min-h-[145px] sm:min-h-[160px] group"
          >
            <div className="text-[#facc15] group-hover:scale-110 transition-transform mb-3">
              <Trophy className="w-12 h-12 stroke-[2.2] fill-amber-400/20" />
            </div>
            <span className="text-white font-bold text-sm sm:text-base tracking-wide">
              Lottery Result
            </span>
          </button>

          {/* Card 3: Lottery Agents */}
          <button
            onClick={() => onAction('agents')}
            className="bg-[#1c2e3d] hover:bg-[#152431] active:scale-95 text-white rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center shadow-lg transition-all border border-slate-700/30 cursor-pointer min-h-[145px] sm:min-h-[160px] group"
          >
            <div className="text-[#facc15] group-hover:scale-110 transition-transform mb-3">
              <User className="w-12 h-12 stroke-[2.2] fill-amber-400" />
            </div>
            <span className="text-white font-bold text-sm sm:text-base tracking-wide">
              Lottery Agents
            </span>
          </button>

          {/* Card 4: Ticket Booking */}
          <button
            onClick={() => onAction('booking')}
            className="bg-[#1c2e3d] hover:bg-[#152431] active:scale-95 text-white rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center shadow-lg transition-all border border-slate-700/30 cursor-pointer min-h-[145px] sm:min-h-[160px] group"
          >
            <div className="text-[#facc15] group-hover:scale-110 transition-transform mb-3">
              <Box className="w-12 h-12 stroke-[2.2] fill-amber-400" />
            </div>
            <span className="text-white font-bold text-sm sm:text-base tracking-wide">
              Ticket Booking
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
