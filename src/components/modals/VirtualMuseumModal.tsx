import React from 'react';
import { X, Image, Award, Landmark, History, Shield, HeartHandshake } from 'lucide-react';

interface VirtualMuseumModalProps {
  onClose: () => void;
}

export const VirtualMuseumModal: React.FC<VirtualMuseumModalProps> = ({ onClose }) => {
  const milestones = [
    {
      year: '1967',
      title: 'Pioneering Foundation',
      description: 'Kerala became the first state in India to establish a dedicated government lottery department under the leadership of then Finance Minister late Shri P. K. Kunju Sahib.',
      badge: 'First in India'
    },
    {
      year: '1968',
      title: 'First Historic Draw',
      description: 'The first draw was held on 26 January 1968. The ticket was priced at Re 1, and the historic first prize was ₹50,000.',
      badge: 'Historic Milestone'
    },
    {
      year: '1980',
      title: 'Introduction of Bumper Lotteries',
      description: 'Seasonal bumper lotteries (Thiruvonam, Vishu, Pooja, Christmas-New Year) introduced, transforming festival celebrations across Kerala.',
      badge: 'Festival Bumpers'
    },
    {
      year: '2012',
      title: 'Karunya Benevolent Healthcare Fund',
      description: 'Lottery surplus channeled directly into comprehensive financial aid for underprivileged patients suffering from cancer, kidney, and cardiovascular illnesses.',
      badge: 'Social Welfare'
    },
    {
      year: '2017',
      title: 'Golden Jubilee (50 Years)',
      description: 'Commemorating 50 glorious years of empowerment, revenue generation, and transparent welfare governance as commemorated on the official stage.',
      badge: '50th Anniversary'
    },
    {
      year: '2026',
      title: 'Digital Transparency Era',
      description: 'State-of-the-art QR verification, tactile guilloche watermarks, and verifiable public paper lotteries upholding trust and transparency.',
      badge: 'Modern Technology'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#f97316] text-white p-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-lg">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl leading-tight">
                Virtual Museum
              </h3>
              <p className="text-orange-100 text-xs">
                History & Heritage of Kerala State Lotteries (Est. 1967)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/10 hover:bg-black/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-slate-800">
          {/* Hero archival image card */}
          <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200">
            <img
              src="/assets/extracted/hero_stage_clean.jpg"
              alt="Golden Jubilee Celebrations"
              className="w-full h-44 object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="p-3 bg-slate-50 text-xs text-slate-600 border-t border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-900">50th Golden Jubilee Stage Felicitation</span>
              <span className="text-orange-600 font-bold">1967 – 2017 – 2026</span>
            </div>
          </div>

          {/* Social Impact Quote */}
          <div className="bg-orange-50 border-l-4 border-orange-500 p-3.5 rounded-r-xl text-xs text-orange-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-orange-900">
              <HeartHandshake className="w-4 h-4 text-orange-600" />
              Visionary Mission of P. K. Kunju Sahib
            </div>
            <p className="leading-relaxed">
              "To generate non-tax state revenue while providing dignified livelihood to over 100,000 marginalized citizens, street vendors, and persons with disabilities."
            </p>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Chronological Milestones
            </h4>
            <div className="space-y-3 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-orange-200">
              {milestones.map((item, idx) => (
                <div key={idx} className="relative pl-3 space-y-1">
                  <div className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-orange-500 ring-4 ring-orange-100"></div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-orange-600 font-mono">
                      {item.year}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                      {item.badge}
                    </span>
                  </div>
                  <h5 className="font-bold text-xs text-slate-900">
                    {item.title}
                  </h5>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
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
