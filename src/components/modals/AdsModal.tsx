import React from 'react';
import { X, Megaphone, FileText, Download, Award, Shield } from 'lucide-react';

interface AdsModalProps {
  onClose: () => void;
}

export const AdsModal: React.FC<AdsModalProps> = ({ onClose }) => {
  const ads = [
    {
      id: 'ad-1',
      title: 'Summer Bumper 2026 - ₹10 Crore First Prize Announcement',
      type: 'Mega Campaign Brochure',
      date: 'November 2026',
      description: 'Official campaign release for Summer Bumper BR-99. 1st Prize ₹10 Crore, 2nd Prize ₹50 Lakhs (5 winners), and thousands of guaranteed prizes.',
      tag: 'Bumper Release'
    },
    {
      id: 'ad-2',
      title: 'Tender Notice: High Security Paper Supply & Security Printing',
      type: 'Official Tender Gazette',
      date: 'October 2026',
      description: 'E-tender invited from RBI accredited security printing presses for supply of watermarked paper rolls with micro-fluorescent fibers for Kerala State Lotteries.',
      tag: 'Procurement'
    },
    {
      id: 'ad-3',
      title: 'Agent Empanelment: Welfare Schemes for Differently-Abled Sellers',
      type: 'Department Notice',
      date: 'September 2026',
      description: 'Special subsidy schemes and free motorized tri-wheelers provided to registered lottery vendors through the Kerala State Lottery Welfare Fund Board.',
      tag: 'Agent Welfare'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#84cc16] text-slate-950 p-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-950/10 rounded-lg">
              <Megaphone className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl leading-tight">
                Advertisements & Tenders
              </h3>
              <p className="text-slate-800 text-xs font-semibold">
                Official Government Notifications, Campaign Ads & Gazette Tenders
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/10 hover:bg-black/20 text-slate-950 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800">
          <div className="space-y-3">
            {ads.map((ad) => (
              <div
                key={ad.id}
                className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-lime-500 transition-colors shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold text-lime-900 bg-lime-200 px-2.5 py-0.5 rounded-full uppercase">
                    {ad.tag}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {ad.date}
                  </span>
                </div>

                <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                  {ad.title}
                </h4>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {ad.description}
                </p>

                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">{ad.type}</span>
                  <button
                    onClick={() => alert(`Downloading official PDF copy of: ${ad.title}`)}
                    className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded font-semibold text-[11px] flex items-center gap-1"
                  >
                    <Download className="w-3 h-3 text-lime-700" />
                    Download PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-3 sm:p-4 border-t border-slate-200 flex items-center justify-end shrink-0">
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
