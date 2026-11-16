import React from 'react';
import { X, Calendar, FileText, Share2, Printer, CheckCircle } from 'lucide-react';
import { NewsNotice } from '../../data/lotteryData';

interface NewsDetailModalProps {
  notice: NewsNotice;
  onClose: () => void;
}

export const NewsDetailModal: React.FC<NewsDetailModalProps> = ({ notice, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header with date badge */}
        <div className="bg-[#0b3c4c] text-white p-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-[#facc15] text-[#0b3c4c] font-black rounded-lg px-2.5 py-1 text-center">
              <span className="block text-base leading-none">{notice.dateDay}</span>
              <span className="block text-[10px] uppercase font-bold">{notice.dateMonth}</span>
            </div>
            <div>
              <span className="text-[10px] text-teal-300 uppercase font-bold tracking-wider block">
                {notice.category}
              </span>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                {notice.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800 text-xs sm:text-sm">
          {/* Metadata bar */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1 font-semibold text-slate-800">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              Published: {notice.fullDate}
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              Ref: {notice.gazetteNumber}
            </span>
          </div>

          {/* Gazette text paragraphs */}
          <div className="space-y-3 leading-relaxed text-slate-700">
            {notice.content.map((paragraph, index) => (
              <p key={index} className="text-justify">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Official Signatory Box */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              <div className="font-bold text-slate-800">By Order of the Governor,</div>
              <div className="text-[11px]">Directorate of State Lotteries, Kerala</div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-emerald-700 font-bold">
                <CheckCircle className="w-3.5 h-3.5" />
                Verified Circular
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-3 sm:p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg flex items-center gap-1"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Notice
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
