import React, { useState, useEffect } from 'react';
import { Menu, X, Phone, ShieldCheck, FileText, MapPin, Award, ExternalLink } from 'lucide-react';
import { fetchPublicSettings, getCachedSettings } from '../services/api';

interface NavbarProps {
  onOpenMenu: () => void;
  isMenuOpen: boolean;
  onSelectAction: (action: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMenu, isMenuOpen, onSelectAction }) => {
  const [helpline, setHelpline] = useState<string>(getCachedSettings().helpline ?? '0471-2305230, 0471-2305193');

  useEffect(() => {
    const loadSettings = () => {
      fetchPublicSettings().then((settings) => {
        if (settings?.helpline !== undefined) setHelpline(settings.helpline);
      }).catch(() => {});
    };
    loadSettings();

    const handleSettingsUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.helpline !== undefined) setHelpline(detail.helpline);
    };
    window.addEventListener('kerala-settings-updated', handleSettingsUpdated);
    window.addEventListener('focus', loadSettings);
    return () => {
      window.removeEventListener('kerala-settings-updated', handleSettingsUpdated);
      window.removeEventListener('focus', loadSettings);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#08121f] text-white px-3 py-2.5 sm:px-4 sm:py-3 shadow-md border-b border-slate-800">
        <div className="max-w-md mx-auto sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex items-center justify-between">
          {/* Logo container matching screenshot */}
          <div 
            onClick={() => onSelectAction('home')} 
            className="cursor-pointer bg-[#f1f6ed] rounded-sm p-1 px-2 flex items-center shadow-sm hover:opacity-95 transition-opacity"
          >
            <img 
              src="/assets/extracted/logo.png" 
              alt="Kerala State Lottery - Government of Kerala" 
              className="h-9 sm:h-11 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Hamburger Menu Button */}
          <button
            onClick={onOpenMenu}
            aria-label="Toggle navigation menu"
            className="p-2 text-white hover:text-cyan-300 focus:outline-none transition-colors rounded-lg active:scale-95"
          >
            {isMenuOpen ? (
              <X className="w-8 h-8 stroke-[2.5]" />
            ) : (
              <Menu className="w-8 h-8 stroke-[2.5]" />
            )}
          </button>
        </div>
      </header>

      {/* Slide-out Menu Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onOpenMenu}
          />

          {/* Drawer content */}
          <div className="relative w-full max-w-xs bg-[#0b1b2d] text-slate-100 h-full overflow-y-auto flex flex-col justify-between shadow-2xl z-10 border-l border-slate-700">
            <div>
              <div className="p-4 bg-[#08121f] flex items-center justify-between border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="bg-[#f1f6ed] rounded p-1">
                    <img src="/assets/extracted/logo.png" alt="Kerala Lottery" className="h-7 w-auto object-contain" />
                  </div>
                </div>
                <button
                  onClick={onOpenMenu}
                  className="p-1.5 text-slate-300 hover:text-white rounded-md bg-slate-800 hover:bg-slate-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-4">
                <div className="text-xs uppercase font-bold text-cyan-400 tracking-wider mb-2">
                  Official Portal Navigation
                </div>
                <nav className="space-y-1 text-sm font-medium">
                  <button
                    onClick={() => { onSelectAction('results'); onOpenMenu(); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800 flex items-center justify-between transition-colors"
                  >
                    <span>Lottery Results</span>
                    <span className="text-xs bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded">Daily 3 PM</span>
                  </button>
                  <button
                    onClick={() => { onSelectAction('booking'); onOpenMenu(); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800 flex items-center justify-between transition-colors"
                  >
                    <span>Ticket Booking Counter</span>
                    <span className="text-xs bg-cyan-900/60 text-cyan-300 px-2 py-0.5 rounded">Reserve</span>
                  </button>
                  <button
                    onClick={() => { onSelectAction('agents'); onOpenMenu(); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800 flex items-center justify-between transition-colors"
                  >
                    <span>Lottery Agents Directory</span>
                    <span className="text-xs text-slate-400">14 Districts</span>
                  </button>
                  <button
                    onClick={() => { onSelectAction('live_draw'); onOpenMenu(); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800 flex items-center justify-between transition-colors"
                  >
                    <span>Live Draw Webcast</span>
                    <span className="flex items-center gap-1 text-xs text-red-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      Gorky Bhavan
                    </span>
                  </button>
                  <button
                    onClick={() => { onSelectAction('museum'); onOpenMenu(); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800 flex items-center justify-between transition-colors"
                  >
                    <span>Virtual Museum (Est. 1967)</span>
                    <span className="text-xs text-slate-400">History</span>
                  </button>
                  <button
                    onClick={() => { onSelectAction('grievance'); onOpenMenu(); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800 flex items-center justify-between transition-colors"
                  >
                    <span>Grievance Redressal</span>
                  </button>
                  <button
                    onClick={() => { onSelectAction('ads'); onOpenMenu(); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800 flex items-center justify-between transition-colors"
                  >
                    <span>Gazette Ads & Tenders</span>
                  </button>
                </nav>
              </div>

              <div className="mx-4 p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-2">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Government Authenticity Guarantee
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Kerala State Lotteries are conducted under the Lotteries (Regulation) Act, 1998 and Kerala Paper Lotteries Rules, 2005.
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#08121f] border-t border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Helpline: {helpline}</span>
              </div>
              <div className="flex items-start gap-2 text-slate-400">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Directorate of State Lotteries, Vikas Bhavan, Thiruvananthapuram - 695033</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
