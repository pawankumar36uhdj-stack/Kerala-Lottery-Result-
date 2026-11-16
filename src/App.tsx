import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { RedActionSection } from './components/RedActionSection';
import { WelcomeSection } from './components/WelcomeSection';
import { RedFeatureGrid } from './components/RedFeatureGrid';
import { LatestNewsSection } from './components/LatestNewsSection';
import { DrawGallerySection } from './components/DrawGallerySection';
import { Footer } from './components/Footer';

// Modals
import { LotteryResultsModal } from './components/modals/LotteryResultsModal';
import { TicketBookingModal } from './components/modals/TicketBookingModal';
import { TrackOrderModal } from './components/modals/TrackOrderModal';
import { LotteryAgentsModal } from './components/modals/LotteryAgentsModal';
import { LiveDrawModal } from './components/modals/LiveDrawModal';
import { VirtualMuseumModal } from './components/modals/VirtualMuseumModal';
import { GrievanceModal } from './components/modals/GrievanceModal';
import { NewsDetailModal } from './components/modals/NewsDetailModal';
import { AdsModal } from './components/modals/AdsModal';
import { AdminPortal } from './components/admin/AdminPortal';

import { INITIAL_ORDERS, LotteryOrder, NewsNotice, LotteryAgent } from './data/lotteryData';
import { WinnerRecord } from './services/api';
import { Smartphone, Monitor } from 'lucide-react';

export default function App() {
  const [orders, setOrders] = useState<LotteryOrder[]>(INITIAL_ORDERS);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<NewsNotice | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [activeTrackingId, setActiveTrackingId] = useState<string>('KL-2026-92841');
  const [viewMode, setViewMode] = useState<'mobile' | 'responsive'>('mobile');
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState<boolean>(false);
  const [lastCheckedWinner, setLastCheckedWinner] = useState<WinnerRecord | null>(null);
  const [lastCheckedQuery, setLastCheckedQuery] = useState<string>('');
  const [hasCheckedResult, setHasCheckedResult] = useState<boolean>(false);

  // Listen for hidden trigger via #admin or keyboard shortcut Alt + A
  useEffect(() => {
    const handleCheckHash = () => {
      if (window.location.hash === '#admin') {
        setIsAdminPortalOpen(true);
      }
    };
    handleCheckHash();
    window.addEventListener('hashchange', handleCheckHash);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Secret Admin Shortcut: Alt + A
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAdminPortalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', handleCheckHash);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleAction = (action: string) => {
    if (action === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (action === 'admin') {
      setIsAdminPortalOpen(true);
      return;
    }
    setActiveModal(action);
  };

  const handleAddOrder = (newOrder: LotteryOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
    setActiveTrackingId(newOrder.orderId);
  };

  const handleTrackSpecificOrder = (orderId: string) => {
    setActiveTrackingId(orderId);
    setActiveModal('tracking');
  };

  return (
    <div className="min-h-screen bg-[#06111e] flex flex-col items-center">
      {/* Desktop View Switcher Bar (Hidden on Mobile) */}
      <div className="w-full hidden md:flex items-center justify-between px-6 py-2 bg-[#040912] border-b border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-semibold text-slate-200">
            Kerala State Lottery Official Mobile Portal (Government of Kerala)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Display Frame:</span>
          <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
            <button
              onClick={() => setViewMode('mobile')}
              className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'mobile'
                  ? 'bg-[#48c9b0] text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Original Mobile Layout (1:1 Screenshot Match)
            </button>
            <button
              onClick={() => setViewMode('responsive')}
              className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'responsive'
                  ? 'bg-[#48c9b0] text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Expanded View
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div
        className={`w-full transition-all duration-300 ${
          viewMode === 'mobile'
            ? 'max-w-[480px] my-0 md:my-6 md:rounded-3xl md:overflow-hidden md:shadow-[0_0_50px_rgba(0,0,0,0.8)] md:border md:border-slate-800/80'
            : 'max-w-2xl lg:max-w-3xl my-0 md:my-4'
        } bg-[#0c1825] flex flex-col min-h-screen relative`}
      >
        {/* Navigation Bar */}
        <Navbar
          isMenuOpen={isMenuOpen}
          onOpenMenu={() => setIsMenuOpen(!isMenuOpen)}
          onSelectAction={handleAction}
        />

        {/* Hero Stage Banner & Ticker (Screenshot 1 Top) */}
        <HeroSection onAction={handleAction} />

        {/* Coral Red Action Section with 4 Stacked Pill Buttons (Screenshot 1 Bottom) */}
        <RedActionSection onAction={handleAction} />

        {/* Welcome to Kerala State Lottery & 4 Dignitaries (Screenshots 4 & 2 Top) */}
        <WelcomeSection onLearnMore={() => handleAction('museum')} />

        {/* Coral Red 2x2 Feature Grid with Golden Icons (Screenshot 2 Bottom) */}
        <RedFeatureGrid onAction={handleAction} />

        {/* Latest News Notices & 4 Squircle Quick Apps (Screenshot 5) */}
        <LatestNewsSection
          onSelectNotice={(notice) => setSelectedNotice(notice)}
          onAction={handleAction}
        />

        {/* Live Draw & Event Photo Gallery (Screenshot 3) */}
        <DrawGallerySection onOpenLiveDraw={() => handleAction('live_draw')} />

        {/* Official Kerala State Lottery Footer */}
        <Footer onAction={handleAction} />
      </div>

      {/* Modals & Dialogs */}
      {activeModal === 'results' && (
        <LotteryResultsModal
          onClose={() => setActiveModal(null)}
          onBookTicket={() => setActiveModal('booking')}
          onWinnerResolved={(winner, query) => {
            setLastCheckedWinner(winner);
            setLastCheckedQuery(query);
            setHasCheckedResult(true);
          }}
        />
      )}

      {activeModal === 'booking' && (
        <TicketBookingModal
          onClose={() => setActiveModal(null)}
          onAddOrder={handleAddOrder}
          onTrackOrder={handleTrackSpecificOrder}
        />
      )}

      {activeModal === 'tracking' && (
        <TrackOrderModal
          orders={orders}
          initialOrderId={activeTrackingId}
          onClose={() => setActiveModal(null)}
          onBookNew={() => setActiveModal('booking')}
        />
      )}

      {activeModal === 'agents' && (
        <LotteryAgentsModal
          onClose={() => setActiveModal(null)}
          onBookWithAgent={() => setActiveModal('booking')}
        />
      )}

      {activeModal === 'live_draw' && (
        <LiveDrawModal
          onClose={() => setActiveModal(null)}
          checkedWinner={lastCheckedWinner}
          checkedQuery={lastCheckedQuery}
          hasChecked={hasCheckedResult}
          onWinnerResolved={(winner, query) => {
            setLastCheckedWinner(winner);
            setLastCheckedQuery(query);
            setHasCheckedResult(true);
          }}
        />
      )}

      {activeModal === 'museum' && (
        <VirtualMuseumModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'grievance' && (
        <GrievanceModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'ads' && (
        <AdsModal onClose={() => setActiveModal(null)} />
      )}

      {selectedNotice && (
        <NewsDetailModal
          notice={selectedNotice}
          onClose={() => setSelectedNotice(null)}
        />
      )}

      {/* Hidden Password-Protected Backend Admin Portal */}
      <AdminPortal
        isOpen={isAdminPortalOpen}
        onClose={() => {
          setIsAdminPortalOpen(false);
          if (window.location.hash === '#admin') {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }}
      />
    </div>
  );
}
