import React from 'react';

interface WelcomeSectionProps {
  onLearnMore?: () => void;
}

export const WelcomeSection: React.FC<WelcomeSectionProps> = ({ onLearnMore }) => {
  return (
    <section className="w-full bg-gradient-to-b from-[#94cbff] via-[#8ad79d] to-[#5ec76a] py-6 sm:py-8 px-4 sm:px-6 relative overflow-hidden">
      {/* Decorative soft bokeh circles matching screenshot */}
      <div className="absolute top-8 left-12 w-2 h-2 rounded-full bg-white/70 blur-xs"></div>
      <div className="absolute top-20 right-16 w-3 h-3 rounded-full bg-white/60 blur-xs"></div>
      <div className="absolute top-1/2 left-8 w-2.5 h-2.5 rounded-full bg-white/50 blur-xs"></div>
      <div className="absolute bottom-24 right-10 w-3 h-3 rounded-full bg-white/60 blur-xs"></div>

      <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto">
        {/* Title matching Screenshot 4 */}
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-black text-center tracking-tight mb-4">
          welcome to Kerala state Lottery.
        </h2>

        {/* Intro History Paragraph matching Screenshot 4 */}
        <p className="text-slate-800 text-sm sm:text-base leading-relaxed text-center sm:text-justify mb-8 px-1 font-medium">
          Kerala, the Gods own country, added another first to its cap in 1967, when a Department was setup in the Government sector for the first time in India for the conduct of paper Lotteries . It was late Shri. P. K. Kunju Sahib, who envisaged this idea for the generation of revenue through the sale of lotteries and for providing a stable source of income to the poor and needy belonging to the marginalized section of society.
        </p>

        {/* 4 Dignitaries Cards in 2x2 Grid matching Screenshots 4 & 2 */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {/* Card 1: Chief of Kerala lotteries */}
          <div className="bg-white rounded-2xl p-0 overflow-hidden shadow-md flex flex-col justify-between transition-transform hover:-translate-y-1">
            <div className="w-full aspect-[4/5] overflow-hidden bg-slate-100">
              <img
                src="/assets/extracted/card_chief.jpg"
                alt="Chief of Kerla lotteries"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Card 2: Secretary, Tax Department */}
          <div className="bg-white rounded-2xl p-0 overflow-hidden shadow-md flex flex-col justify-between transition-transform hover:-translate-y-1">
            <div className="w-full aspect-[4/5] overflow-hidden bg-slate-100">
              <img
                src="/assets/extracted/card_secretary.jpg"
                alt="Secretary, Tax Department"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Card 3: Prize Distribution */}
          <div className="bg-white rounded-2xl p-0 overflow-hidden shadow-md flex flex-col justify-between transition-transform hover:-translate-y-1">
            <div className="w-full aspect-[4/5] overflow-hidden bg-slate-100">
              <img
                src="/assets/extracted/card_prize_dist.jpg"
                alt="Prize Distribution"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Card 4: Director Lottery Department */}
          <div className="bg-white rounded-2xl p-0 overflow-hidden shadow-md flex flex-col justify-between transition-transform hover:-translate-y-1">
            <div className="w-full aspect-[4/5] overflow-hidden bg-slate-100">
              <img
                src="/assets/extracted/card_director.jpg"
                alt="Director Lottery Department"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
