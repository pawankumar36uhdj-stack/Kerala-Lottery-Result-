import React from 'react';
import { Play, Eye, Video } from 'lucide-react';

interface DrawGallerySectionProps {
  onOpenLiveDraw: () => void;
}

export const DrawGallerySection: React.FC<DrawGallerySectionProps> = ({ onOpenLiveDraw }) => {
  return (
    <section className="bg-[#0b1420] py-8 sm:py-10 px-4 sm:px-6 border-t border-slate-800">
      <div className="max-w-sm sm:max-w-md mx-auto space-y-5">
        {/* Gallery Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <h3 className="text-white font-bold text-lg sm:text-xl">
              Live Draw & Event Gallery
            </h3>
          </div>
          <button
            onClick={onOpenLiveDraw}
            className="text-xs bg-red-600 hover:bg-red-500 text-white font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Watch Live 3 PM
          </button>
        </div>

        {/* 3 Photos stacked matching Screenshot 3 */}
        {/* Photo 1: Official Draw Table */}
        <div className="rounded-2xl overflow-hidden bg-black shadow-lg border border-slate-800 group relative">
          <img
            src="/assets/extracted/draw_event_1.jpg"
            alt="Kerala State Lottery Draw Committee Proceedings at Gorky Bhavan"
            className="w-full h-auto object-cover group-hover:scale-102 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold text-slate-200">Gorky Bhavan Draw Hall - Thiruvananthapuram</span>
            <span className="text-cyan-400 font-mono">Daily 3:00 PM</span>
          </div>
        </div>

        {/* Photo 2: Committee Supervising Draw */}
        <div className="rounded-2xl overflow-hidden bg-black shadow-lg border border-slate-800 group relative">
          <img
            src="/assets/extracted/draw_event_2.jpg"
            alt="Lottery Draw Judges and Public Observers Committee"
            className="w-full h-auto object-cover group-hover:scale-102 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold text-slate-200">Independent Supervisory Committee Inspection</span>
            <span className="text-emerald-400 font-mono">Transparent Process</span>
          </div>
        </div>

        {/* Photo 3: Bumper Prize Felicitation */}
        <div className="rounded-2xl overflow-hidden bg-black shadow-lg border border-slate-800 group relative">
          <img
            src="/assets/extracted/draw_event_3.jpg"
            alt="Kerala State Lottery Bumper Winner & Ticket Presentation"
            className="w-full h-auto object-cover group-hover:scale-102 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold text-slate-200">Official Bumper Lottery Result Handover Ceremony</span>
            <span className="text-amber-400 font-mono">Government Verified</span>
          </div>
        </div>
      </div>
    </section>
  );
};
