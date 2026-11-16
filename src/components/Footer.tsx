import React, { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, ShieldAlert, Award, ExternalLink, Lock } from 'lucide-react';
import { fetchPublicSettings, getCachedSettings } from '../services/api';

interface FooterProps {
  onAction: (action: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onAction }) => {
  const cached = getCachedSettings();
  const [helpline, setHelpline] = useState<string>(cached.helpline ?? '0471-2305230, 0471-2305193');
  const [email, setEmail] = useState<string>(cached.email ?? 'cru.lotteries@kerala.gov.in');

  useEffect(() => {
    const loadSettings = () => {
      fetchPublicSettings().then((settings) => {
        if (settings) {
          if (settings.helpline !== undefined) setHelpline(settings.helpline);
          if (settings.email !== undefined) setEmail(settings.email);
        }
      }).catch(() => {});
    };
    loadSettings();

    const handleSettingsUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.helpline !== undefined) setHelpline(detail.helpline);
      if (detail?.email !== undefined) setEmail(detail.email);
    };
    window.addEventListener('kerala-settings-updated', handleSettingsUpdated);
    window.addEventListener('focus', loadSettings);
    return () => {
      window.removeEventListener('kerala-settings-updated', handleSettingsUpdated);
      window.removeEventListener('focus', loadSettings);
    };
  }, []);

  return (
    <footer className="bg-[#050b14] text-slate-300 pt-10 pb-8 px-4 sm:px-6 border-t border-slate-800 text-xs sm:text-sm">
      <div className="max-w-sm sm:max-w-md mx-auto space-y-6">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-[#f1f6ed] p-1.5 rounded-sm inline-block shadow-sm">
            <img 
              src="/assets/extracted/logo.png" 
              alt="Government of Kerala State Lotteries" 
              className="h-10 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Directorate of Kerala State Lotteries, Government of Kerala
          </p>
          <div className="text-[11px] text-cyan-400 font-medium">
            First Government Lottery in India · Established 1967
          </div>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-800/80">
          <button 
            onClick={() => onAction('results')} 
            className="text-left py-1 text-slate-300 hover:text-cyan-400 transition-colors"
          >
            › Lottery Results Archive
          </button>
          <button 
            onClick={() => onAction('booking')} 
            className="text-left py-1 text-slate-300 hover:text-cyan-400 transition-colors"
          >
            › Ticket Booking Counter
          </button>
          <button 
            onClick={() => onAction('agents')} 
            className="text-left py-1 text-slate-300 hover:text-cyan-400 transition-colors"
          >
            › Authorized Agent Directory
          </button>
          <button 
            onClick={() => onAction('live_draw')} 
            className="text-left py-1 text-slate-300 hover:text-cyan-400 transition-colors"
          >
            › Live Draw Stream (3 PM)
          </button>
          <button 
            onClick={() => onAction('museum')} 
            className="text-left py-1 text-slate-300 hover:text-cyan-400 transition-colors"
          >
            › Virtual Museum 1967-2026
          </button>
          <button 
            onClick={() => onAction('grievance')} 
            className="text-left py-1 text-slate-300 hover:text-cyan-400 transition-colors"
          >
            › Grievance Redressal Portal
          </button>
          <button 
            onClick={() => onAction('ads')} 
            className="text-left py-1 text-slate-300 hover:text-cyan-400 transition-colors"
          >
            › Official Gazette & Ads
          </button>
        </div>

        {/* Official Contact Info */}
        <div className="space-y-2 text-xs text-slate-400">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>Directorate of State Lotteries, Vikas Bhavan P.O., Thiruvananthapuram - 695033, Kerala, India</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Helpline: {helpline} (Mon–Sat 10:00 AM – 5:00 PM)</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Email: {email}</span>
          </div>
        </div>

        {/* Statutory Warning Notice */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Statutory Advisory</span>
          </div>
          Kerala State Lotteries are conducted by the Government of Kerala. Beware of fake online lotteries and unregulated betting apps. Paper lotteries are sold only through registered Kerala agents. Prize winners must claim prizes within 30 days from the draw date.
        </div>

        {/* Copyright with Hidden Admin Trigger */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-900">
          <span>
            © {new Date().getFullYear()} Directorate of Kerala State Lotteries, Government of Kerala. All Rights Reserved.
          </span>
          <button
            onClick={() => onAction('admin')}
            className="opacity-30 hover:opacity-100 text-slate-500 hover:text-cyan-400 p-1 transition-opacity cursor-pointer shrink-0 ml-2"
            title="Admin Login (Staff Only)"
            aria-label="Directorate Portal"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
