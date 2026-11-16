import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, CheckCircle2, AlertCircle, Search, Trophy } from 'lucide-react';
import { WinnerRecord, checkLotteryResult, fetchPrizeTickets, fetchPublicSettings, PrizeTicketsMap } from '../../services/api';

interface LotteryResultsModalProps {
  onClose: () => void;
  onBookTicket?: () => void;
  onWinnerResolved?: (winner: WinnerRecord | null, query: string) => void;
}

function formatDisplayDate(dateStr?: string): string {
  const raw = String(dateStr || '').trim();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  return raw;
}

export const LotteryResultsModal: React.FC<LotteryResultsModalProps> = ({ onClose, onWinnerResolved }) => {
  // Mode: 'ticket-status' (First screen) -> 'results-sheet' -> 'winner-profile' -> 'tax-status'
  const [viewMode, setViewMode] = useState<'ticket-status' | 'results-sheet' | 'winner-profile' | 'tax-status'>('ticket-status');
  const [mobileInput, setMobileInput] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [prizeTickets, setPrizeTickets] = useState<PrizeTicketsMap>({});
  const [currentWinner, setCurrentWinner] = useState<WinnerRecord | null>(null);
  const [drawDate, setDrawDate] = useState<string>('');
  const [statutoryNotice, setStatutoryNotice] = useState<string>('');
  const [animatedProgress, setAnimatedProgress] = useState<number>(1);
  const [inputError, setInputError] = useState<string>('');

  useEffect(() => {
    // Load prize tickets and draw date settings directly from backend (currentWinner is strictly resolved only when a valid number is entered!)
    fetchPrizeTickets().then((data) => {
      if (data) setPrizeTickets(data);
    });
    fetchPublicSettings().then((settings) => {
      if (settings?.drawDate) setDrawDate(settings.drawDate);
      if (settings?.statutoryNotice) setStatutoryNotice(settings.statutoryNotice);
    });

    const handleSettingsUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.drawDate) setDrawDate(detail.drawDate);
      if (detail?.statutoryNotice) setStatutoryNotice(detail.statutoryNotice);
    };
    window.addEventListener('kerala-settings-updated', handleSettingsUpdated);
    return () => window.removeEventListener('kerala-settings-updated', handleSettingsUpdated);
  }, []);

  // Video-like 1% -> 2% -> 3% ... -> target% counting animation on Check Your Status screen
  useEffect(() => {
    if (viewMode !== 'tax-status' || !currentWinner) return;
    const target = Math.min(100, Math.max(0, Number(currentWinner.taxProgress ?? 95)));
    if (target <= 0) {
      setAnimatedProgress(0);
      return;
    }

    setAnimatedProgress(1);
    const startVal = 1;
    const durationMs = Math.max(1400, target * 28);
    const startTime = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - progress) * (1 - progress);
      const val = Math.min(target, Math.max(startVal, Math.round(startVal + (target - startVal) * eased)));
      setAnimatedProgress(val);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setAnimatedProgress(target);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [viewMode, currentWinner?.id, currentWinner?.taxProgress]);

  const [statusResult, setStatusResult] = useState<{
    searched: boolean;
    isWinner: boolean;
    name?: string;
    lotteryNumber?: string;
    mobile?: string;
    prizeTitle?: string;
    prizeAmount?: string;
    message?: string;
  } | null>(null);

  const handleCheckNow = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = mobileInput.trim();

    if (!query) {
      setInputError('Please enter a valid mobile number or ticket number.');
      return;
    }

    setInputError('');
    setIsChecking(true);

    try {
      const [res, latestPrizes, latestSettings] = await Promise.all([
        checkLotteryResult(query),
        fetchPrizeTickets(),
        fetchPublicSettings()
      ]);
      if (latestPrizes) setPrizeTickets(latestPrizes);
      const effectiveDrawDate = res.drawDate || latestSettings?.drawDate || drawDate || '09-11-2026';
      setDrawDate(effectiveDrawDate);

      if (res.found && res.data) {
        setCurrentWinner(res.data);
        onWinnerResolved?.(res.data, query);
        setStatusResult({
          searched: true,
          isWinner: true,
          name: res.data.name,
          lotteryNumber: res.data.ticketNo,
          mobile: res.data.mobile,
          prizeTitle: res.data.prizeTier || 'Verified Winner',
          prizeAmount: res.data.amount,
          message: `Congratulations! Your ticket is verified under official Draw Date: ${effectiveDrawDate}.`
        });
      } else {
        setCurrentWinner(null);
        onWinnerResolved?.(null, query);
        setStatusResult({
          searched: true,
          isWinner: false,
          mobile: query,
          message: res.message || 'No registered winning ticket found for this mobile or ticket number.'
        });
      }
    } catch (err) {
      console.error('Check result error:', err);
      setCurrentWinner(null);
      setStatusResult({
        searched: true,
        isWinner: false,
        mobile: query,
        message: 'Unable to connect to verification server. Please check your internet and try again.'
      });
    } finally {
      setIsChecking(false);
      setViewMode('results-sheet');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col border border-slate-200">
        
        {/* VIEW 1: RESULTS SHEET (Screenshots 1, 2, 3, 4, 5) */}
        {viewMode === 'results-sheet' && (
          <>
            {/* Blue Header Bar matching Screenshot 1 */}
            <div className="bg-[#1956aa] text-white py-3.5 px-4 text-center relative shrink-0 shadow-sm flex items-center justify-between">
              <button
                onClick={() => setViewMode('ticket-status')}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 text-xs font-semibold cursor-pointer"
                title="Back to Status Check"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Status Check</span>
              </button>
              <div className="flex-1 text-center pr-1 sm:pr-0">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
                  Kerala State Lottery Results
                </h2>
                <p className="text-blue-100 text-xs sm:text-sm font-medium mt-0.5">
                  Official Winning Numbers (Official)
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="overflow-y-auto bg-white flex-1 p-0">
              
              {/* Seal & Status Section matching Screenshot 1 */}
              <div className="pt-5 pb-4 px-4 flex flex-col items-center text-center">
                {/* Kerala Government Official State Emblem */}
                <div className="w-52 sm:w-60 md:w-64 h-auto mb-3 flex items-center justify-center">
                  <img
                    src="/assets/aistudio/inbound355686719274773376_44d1ff11.jpg"
                    alt="Government of Kerala Official State Emblem"
                    className="w-full h-auto object-contain select-none"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Green Heading */}
                <h3 className="text-3xl sm:text-4xl font-extrabold text-[#168038] tracking-tight mb-2.5">
                  Result Is Live
                </h3>

                {/* Red Date Pill */}
                <div className="bg-[#ff0000] text-white font-extrabold text-lg sm:text-xl py-1.5 px-7 rounded-full shadow-xs mb-3 select-none">
                  {formatDisplayDate(drawDate) || formatDisplayDate(currentWinner?.bookingDate) || '09-11-2026'}
                </div>

                {/* Bold Red Text LIVE NOW (Blinking Band/Chalu Animation) */}
                <div className="text-3xl sm:text-4xl font-black text-[#ff0000] tracking-wide mb-5 animate-live-blink select-none">
                  LIVE NOW
                </div>

                {/* Floating Congratulations Card matching Screenshot 1 (only when a verified winner exists) */}
                {currentWinner ? (
                  <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-100 p-5 sm:p-6 mb-6">
                    {/* Confetti Emoji Header */}
                    <div className="text-xl sm:text-2xl font-black text-[#1956aa] flex items-center justify-center gap-1.5 mb-2.5">
                      <span>🎉</span>
                      <span>Congratulations</span>
                      <span>🥳</span>
                    </div>

                    {/* Winner Name */}
                    <div className="text-slate-900 font-extrabold text-sm sm:text-base mb-1.5 leading-snug">
                      {currentWinner.name.toUpperCase().startsWith('MR') || currentWinner.name === 'Winning Ticket'
                        ? currentWinner.name
                        : `Mr. ${currentWinner.name}`}
                    </div>

                    {/* Lottery Number */}
                    <div className="text-slate-900 font-bold text-xs sm:text-sm mb-1">
                      Lottery Number: <span className="font-extrabold">{currentWinner.ticketNo}</span>
                    </div>

                    {/* Mobile Number */}
                    {currentWinner.mobile && (
                      <div className="text-slate-900 font-bold text-xs sm:text-sm mb-1">
                        Mobile: <span className="font-extrabold">{currentWinner.mobile}</span>
                      </div>
                    )}

                    {/* Booking / Draw Date */}
                    <div className="text-slate-900 font-bold text-xs sm:text-sm mb-2.5">
                      Date: <span className="font-extrabold">{formatDisplayDate(currentWinner.bookingDate) || formatDisplayDate(drawDate) || '09-11-2026'}</span>
                    </div>

                    {/* Top Winning Prize Heading */}
                    <div className="text-slate-900 font-extrabold text-sm sm:text-base mb-0.5">
                      Top Winning Prize
                    </div>

                    {/* Amount in Big Bold Green */}
                    <div className="text-3xl sm:text-4xl font-black text-[#168038] tracking-tight mb-4">
                      {currentWinner.amount.replace('/-', '')}
                    </div>

                    {/* Blue Button: Check Your Winning status */}
                    <button
                      onClick={() => {
                        setViewMode('winner-profile');
                      }}
                      className="w-full py-3 px-4 bg-[#1d62b8] hover:bg-[#16509e] active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm tracking-wide rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Check Your Winning status
                    </button>
                  </div>
                ) : statusResult?.searched && !statusResult.isWinner && statusResult.mobile ? (
                  <div className="w-full max-w-[380px] bg-slate-50 rounded-2xl border border-slate-200 p-5 mb-6 text-center">
                    <div className="text-base font-black text-slate-800 mb-1">
                      No Matching Winner Found
                    </div>
                    <p className="text-xs text-slate-600 mb-3">
                      {statusResult.message}
                    </p>
                    <button
                      onClick={() => {
                        setViewMode('ticket-status');
                        setStatusResult(null);
                      }}
                      className="px-4 py-2 bg-[#1d62b8] hover:bg-[#16509e] text-white font-bold text-xs rounded-lg cursor-pointer"
                    >
                      Check Another Number
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Step-by-Step Prize Grids matching Screenshots 2, 3, 4, 5 */}
              <div className="space-y-6 pb-6">
                
                {/* 1st Prize ₹25 CRORES/- */}
                <div>
                  <div className="w-full bg-[#ff0000] text-white text-center py-2 px-3 font-black text-base sm:text-lg tracking-wide uppercase">
                    1st Prize ₹25 CRORES/-
                  </div>
                  <div className="p-4 bg-white flex flex-col items-center gap-2.5">
                    {(prizeTickets['1st Prize'] || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center">Draw results pending announcement</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full max-w-[340px]">
                        {(prizeTickets['1st Prize'] || []).map((num, i) => (
                          <div
                            key={i}
                            className={`font-black text-sm sm:text-base py-2.5 px-3 rounded-lg text-center tracking-wide shadow-2xs ${
                              currentWinner?.ticketNo && num.toUpperCase() === currentWinner.ticketNo.toUpperCase()
                                ? 'bg-emerald-100 text-emerald-950 border border-emerald-400 font-extrabold ring-2 ring-emerald-400'
                                : 'bg-[#ebebeb] text-slate-950'
                            }`}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Consolation Prize ₹1,00,000/- */}
                <div>
                  <div className="w-full bg-[#ff0000] text-white text-center py-2 px-3 font-black text-base sm:text-lg tracking-wide uppercase">
                    Consolation Prize ₹1,00,000/-
                  </div>
                  <div className="p-4 bg-white flex justify-center">
                    {(prizeTickets['Consolation Prize'] || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center">Draw results pending announcement</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full max-w-[340px]">
                        {(prizeTickets['Consolation Prize'] || []).map((num, i) => (
                          <div
                            key={i}
                            className={`font-black text-sm sm:text-base py-2.5 px-3 rounded-lg text-center tracking-wide shadow-2xs ${
                              currentWinner?.ticketNo && num.toUpperCase() === currentWinner.ticketNo.toUpperCase()
                                ? 'bg-emerald-100 text-emerald-950 border border-emerald-400 font-extrabold ring-2 ring-emerald-400'
                                : 'bg-[#ebebeb] text-slate-950'
                            }`}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2nd Prize ₹10 CRORES/- */}
                <div>
                  <div className="w-full bg-[#ff0000] text-white text-center py-2 px-3 font-black text-base sm:text-lg tracking-wide uppercase">
                    2nd Prize ₹10 CRORES/-
                  </div>
                  <div className="p-4 bg-white flex justify-center">
                    {(prizeTickets['2nd Prize'] || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center">Draw results pending announcement</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full max-w-[340px]">
                        {(prizeTickets['2nd Prize'] || []).map((num, i) => (
                          <div
                            key={i}
                            className={`font-black text-sm sm:text-base py-2.5 px-3 rounded-lg text-center tracking-wide shadow-2xs ${
                              currentWinner?.ticketNo && num.toUpperCase() === currentWinner.ticketNo.toUpperCase()
                                ? 'bg-emerald-100 text-emerald-950 border border-emerald-400 font-extrabold ring-2 ring-emerald-400'
                                : 'bg-[#ebebeb] text-slate-950'
                            }`}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3rd Prize ₹75,00,000/- */}
                <div>
                  <div className="w-full bg-[#ff0000] text-white text-center py-2 px-3 font-black text-base sm:text-lg tracking-wide uppercase">
                    3rd Prize ₹75,00,000/-
                  </div>
                  <div className="p-4 bg-white flex flex-col items-center gap-2.5">
                    {(prizeTickets['3rd Prize'] || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center">Draw results pending announcement</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full max-w-[340px]">
                        {(prizeTickets['3rd Prize'] || []).map((num, i) => (
                          <div
                            key={i}
                            className={`font-black text-sm sm:text-base py-2.5 px-3 rounded-lg text-center tracking-wide shadow-2xs ${
                              currentWinner?.ticketNo && num.toUpperCase() === currentWinner.ticketNo.toUpperCase()
                                ? 'bg-emerald-100 text-emerald-950 border border-emerald-400 font-extrabold ring-2 ring-emerald-400'
                                : 'bg-[#ebebeb] text-slate-950'
                            }`}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4th Prize ₹10,00,000/- */}
                <div>
                  <div className="w-full bg-[#ff0000] text-white text-center py-2 px-3 font-black text-base sm:text-lg tracking-wide uppercase">
                    4th Prize ₹10,00,000/-
                  </div>
                  <div className="p-4 bg-white flex justify-center">
                    {(prizeTickets['4th Prize'] || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center">Draw results pending announcement</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full max-w-[340px]">
                        {(prizeTickets['4th Prize'] || []).map((num, i) => (
                          <div
                            key={i}
                            className={`font-black text-sm sm:text-base py-2.5 px-3 rounded-lg text-center tracking-wide shadow-2xs ${
                              currentWinner?.ticketNo && num.toUpperCase() === currentWinner.ticketNo.toUpperCase()
                                ? 'bg-emerald-100 text-emerald-950 border border-emerald-400 font-extrabold ring-2 ring-emerald-400'
                                : 'bg-[#ebebeb] text-slate-950'
                            }`}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 5th Prize ₹1,00,000/- */}
                <div>
                  <div className="w-full bg-[#ff0000] text-white text-center py-2 px-3 font-black text-base sm:text-lg tracking-wide uppercase">
                    5th Prize ₹1,00,000/-
                  </div>
                  <div className="p-4 bg-white flex justify-center">
                    {(prizeTickets['5th Prize'] || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center">Draw results pending announcement</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full max-w-[340px]">
                        {(prizeTickets['5th Prize'] || []).map((num, i) => (
                          <div
                            key={i}
                            className={`font-black text-sm sm:text-base py-2.5 px-3 rounded-lg text-center tracking-wide shadow-2xs ${
                              currentWinner?.ticketNo && num.toUpperCase() === currentWinner.ticketNo.toUpperCase()
                                ? 'bg-emerald-100 text-emerald-950 border border-emerald-400 font-extrabold ring-2 ring-emerald-400'
                                : 'bg-[#ebebeb] text-slate-950'
                            }`}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 6th Prize ₹10,000/- */}
                <div>
                  <div className="w-full bg-[#ff0000] text-white text-center py-2 px-3 font-black text-base sm:text-lg tracking-wide uppercase">
                    6th Prize ₹10,000/-
                  </div>
                  <div className="p-4 bg-white flex justify-center">
                    {(prizeTickets['6th Prize'] || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center">Draw results pending announcement</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full max-w-[340px]">
                        {(prizeTickets['6th Prize'] || []).map((num, i) => (
                          <div
                            key={i}
                            className={`font-black text-sm sm:text-base py-2.5 px-3 rounded-lg text-center tracking-wide shadow-2xs ${
                              currentWinner?.ticketNo && num.toUpperCase() === currentWinner.ticketNo.toUpperCase()
                                ? 'bg-emerald-100 text-emerald-950 border border-emerald-400 font-extrabold ring-2 ring-emerald-400'
                                : 'bg-[#ebebeb] text-slate-950'
                            }`}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Statutory Warning / Advisory Box matching Screenshot 5 */}
                <div className="px-4">
                  <div className="bg-[#e0f7fa] border border-[#b2ebf2] rounded-xl p-3.5 text-center">
                    <p className="text-[#006064] text-xs sm:text-sm font-medium leading-relaxed">
                      {statutoryNotice || '⚠ If you win more than ₹5,00,000, the amount will be transferred through an RBI-authorized process and tax 4500/- must be paid. Any winnings above ₹5 lakh are subject to tax as per RBI rules.'}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom sticky bar */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  setViewMode('ticket-status');
                  setStatusResult(null);
                }}
                className="px-4 py-2 bg-[#1d62b8] hover:bg-[#16509e] text-white font-bold text-xs rounded-lg shadow-sm"
              >
                Check Mobile / Ticket Status
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300"
              >
                Close
              </button>
            </div>
          </>
        )}

        {/* VIEW 2: TICKET RESULT STATUS (Screenshot 6 / User Upload) */}
        {viewMode === 'ticket-status' && (
          <div className="flex-1 flex flex-col justify-between bg-gradient-to-b from-[#051758] via-[#034484] to-[#008db6] p-4 sm:p-6 text-white min-h-[520px]">
            {/* Top Close Button in corner */}
            <div className="flex items-center justify-end">
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Centered Floating White Card matching User's Uploaded Screenshot */}
            <div className="my-auto w-full max-w-[360px] mx-auto bg-[#eaedf0] rounded-2xl p-6 sm:p-7 shadow-2xl text-slate-900 border border-white/20">
              {/* Heading matching Screenshot */}
              <h3 className="text-xl sm:text-2xl font-black text-[#0070f3] text-center tracking-tight mb-6">
                TICKET RESULT STATUS
              </h3>

              {/* Mobile Input Group */}
              <form onSubmit={handleCheckNow} className="space-y-4">
                <div className="flex items-stretch rounded-xs overflow-hidden border border-slate-400/80 shadow-2xs">
                  <div className="bg-black text-white font-bold text-xs sm:text-sm px-4 py-2.5 flex items-center justify-center shrink-0">
                    Mobile
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex. 9876543210 or Ticket No"
                    value={mobileInput}
                    onChange={(e) => {
                      setMobileInput(e.target.value);
                      if (inputError) setInputError('');
                    }}
                    className="flex-1 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>

                {inputError && (
                  <div className="p-2.5 bg-red-100 border border-red-300 rounded-lg text-xs font-bold text-red-700 text-center animate-shake">
                    ⚠ {inputError}
                  </div>
                )}

                {/* Check Now Gradient Button matching Screenshot */}
                <button
                  type="submit"
                  disabled={isChecking}
                  className="w-full py-3 bg-gradient-to-r from-[#121c6f] to-[#009acb] hover:opacity-95 active:scale-[0.99] text-white font-black text-sm tracking-wide rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isChecking ? 'Checking Result...' : 'Check Now'}
                </button>
              </form>
            </div>

            {/* Bottom info */}
            <div className="text-center text-[11px] text-cyan-200 mt-6">
              Directorate of Kerala State Lotteries · Official Draw System
            </div>
          </div>
        )}

        {/* VIEW 3: WINNER PROFILE / DETAILS (inbound5999596246325072588_22cfb684.jpg) */}
        {viewMode === 'winner-profile' && currentWinner && (
          <div className="flex-1 flex flex-col justify-between bg-[#f4f6f8] p-4 sm:p-5 text-slate-900 min-h-[520px] overflow-y-auto">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setViewMode('results-sheet')}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Centered White Card matching Screenshot 1 */}
            <div className="w-full max-w-[390px] mx-auto bg-white rounded-2xl p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-slate-200 my-auto">
              {/* Title matching Screenshot 1 */}
              <h3 className="text-xl sm:text-2xl font-black text-[#0070f3] text-center tracking-tight mb-2">
                WINNER PROFILE / DETAILS
              </h3>
              
              {/* Blue line divider matching screenshot */}
              <div className="w-full h-1 bg-[#0070f3] mb-5"></div>

              {/* Table matching Screenshot 1 */}
              <div className="border border-slate-300 rounded-lg overflow-hidden mb-6 text-xs sm:text-sm">
                <div className="flex border-b border-slate-300">
                  <div className="w-[40%] bg-white font-extrabold text-slate-950 p-2.5 sm:p-3 border-r border-slate-300 flex items-center">
                    Name
                  </div>
                  <div className="w-[60%] bg-white font-bold text-slate-900 p-2.5 sm:p-3 uppercase">
                    {currentWinner.name}
                  </div>
                </div>

                <div className="flex border-b border-slate-300">
                  <div className="w-[40%] bg-white font-extrabold text-slate-950 p-2.5 sm:p-3 border-r border-slate-300 flex items-center">
                    Mobile No.
                  </div>
                  <div className="w-[60%] bg-white font-semibold text-slate-900 p-2.5 sm:p-3 font-mono">
                    {currentWinner.mobile || '—'}
                  </div>
                </div>

                <div className="flex border-b border-slate-300">
                  <div className="w-[40%] bg-white font-extrabold text-slate-950 p-2.5 sm:p-3 border-r border-slate-300 flex items-center">
                    State
                  </div>
                  <div className="w-[60%] bg-white font-semibold text-slate-900 p-2.5 sm:p-3">
                    {currentWinner.state || 'Kerala'}
                  </div>
                </div>

                <div className="flex border-b border-slate-300">
                  <div className="w-[40%] bg-white font-extrabold text-slate-950 p-2.5 sm:p-3 border-r border-slate-300 flex items-center">
                    Agent Code
                  </div>
                  <div className="w-[60%] bg-white font-semibold text-slate-900 p-2.5 sm:p-3 font-mono">
                    {currentWinner.agentCode || '690003'}
                  </div>
                </div>

                <div className="flex border-b border-slate-300">
                  <div className="w-[40%] bg-white font-extrabold text-slate-950 p-2.5 sm:p-3 border-r border-slate-300 flex items-center">
                    Ticket No.
                  </div>
                  <div className="w-[60%] bg-white font-black text-slate-950 p-2.5 sm:p-3 font-mono text-sm">
                    {currentWinner.ticketNo}
                  </div>
                </div>

                <div className="flex border-b border-slate-300">
                  <div className="w-[40%] bg-white font-extrabold text-slate-950 p-2.5 sm:p-3 border-r border-slate-300 flex items-center">
                    Booking Date
                  </div>
                  <div className="w-[60%] bg-white font-semibold text-slate-900 p-2.5 sm:p-3 font-mono">
                    {formatDisplayDate(currentWinner.bookingDate) || formatDisplayDate(drawDate) || '09-11-2026'}
                  </div>
                </div>

                <div className="flex border-b border-slate-300">
                  <div className="w-[40%] bg-white font-extrabold text-slate-950 p-2.5 sm:p-3 border-r border-slate-300 flex items-center">
                    Amount
                  </div>
                  <div className="w-[60%] bg-white font-bold text-slate-900 p-2.5 sm:p-3">
                    {currentWinner.amount}
                  </div>
                </div>

                <div className="flex">
                  <div className="w-[40%] bg-white font-extrabold text-slate-950 p-2.5 sm:p-3 border-r border-slate-300 flex items-center">
                    Tax Payment Status
                  </div>
                  <div className={`w-[60%] bg-white font-black p-2.5 sm:p-3 ${
                    currentWinner.taxPaymentStatus.toLowerCase().includes('complete')
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}>
                    {currentWinner.taxPaymentStatus}
                  </div>
                </div>
              </div>

              {/* Cyan Button: check your status */}
              <div className="flex justify-center">
                <button
                  onClick={() => setViewMode('tax-status')}
                  className="w-full max-w-[260px] py-3 px-6 bg-gradient-to-r from-[#0084ff] to-[#00c0ff] hover:opacity-95 active:scale-[0.98] text-white font-bold text-sm sm:text-base rounded-xl shadow-md transition-all cursor-pointer text-center"
                >
                  check your status
                </button>
              </div>
            </div>

            {/* Bottom info */}
            <div className="text-center text-[11px] text-slate-400 mt-4">
              Directorate of Kerala State Lotteries · Official Verification System
            </div>
          </div>
        )}

        {/* VIEW 4: TAX STATUS WITH 95% COMPLETE GAUGE (inbound8121011600497808751_71ec731a.jpg) */}
        {viewMode === 'tax-status' && currentWinner && (
          <div className="flex-1 flex flex-col justify-between bg-black p-4 sm:p-6 text-white min-h-[580px] overflow-y-auto">
            {/* Top Bar with Back and Close */}
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setViewMode('winner-profile')}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-white/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Gauge & Message Container matching Screenshot 2 */}
            <div className="my-auto flex flex-col items-center text-center px-2 py-4">
              {/* Circular Gauge (Animated 1% -> 2% -> ... -> target% from backend) */}
              <div className="relative w-44 h-44 sm:w-52 sm:h-52 mb-4 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                  {/* Track circle (gray) */}
                  <circle
                    cx="80"
                    cy="80"
                    r="66"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  {/* Progress arc (green, video-style animated up to backend target) */}
                  <circle
                    cx="80"
                    cy="80"
                    r="66"
                    stroke="#00a651"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 66}
                    strokeDashoffset={(2 * Math.PI * 66) * (1 - animatedProgress / 100)}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Center text matching screenshot */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[#00e5ff] font-extrabold text-xl sm:text-2xl tracking-tight tabular-nums">
                    {animatedProgress}% Complete
                  </span>
                </div>
              </div>

              {/* Processing Fees / TDS / Income Tax / GST Breakdown below ring */}
              {(() => {
                const feesList = Array.isArray(currentWinner.fees)
                  ? currentWinner.fees
                  : [];
                if (feesList.length === 0) return null;
                return (
                  <div className="w-full max-w-[330px] mb-5 space-y-2">
                    {feesList.map((fee, idx) => {
                      const amt = String(fee.amount || '').trim();
                      const formattedAmt = !amt
                        ? ''
                        : amt.includes('₹') || /rs\.?/i.test(amt)
                        ? amt
                        : `₹ ${amt}/-`;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-[#0f172a] border border-cyan-500/40 rounded-xl px-4 py-2 text-xs sm:text-sm shadow-sm"
                        >
                          <span className="font-bold text-slate-200">{fee.label || 'Processing Fees'}</span>
                          {formattedAmt && (
                            <span className="font-black text-[#00e5ff] font-mono">
                              {formattedAmt}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Cyan Welcome Heading matching screenshot */}
              <h3 className="text-xl sm:text-2xl font-black text-[#00e5ff] tracking-tight leading-snug mb-2 uppercase">
                Welcome {currentWinner.name}
              </h3>

              {/* Date from backend */}
              <div className="text-xs sm:text-sm font-bold text-slate-300 font-mono mb-3">
                Date: {formatDisplayDate(currentWinner.bookingDate) || formatDisplayDate(drawDate) || '09-11-2026'}
              </div>

              {/* Party Popper Emoji */}
              <div className="text-3xl sm:text-4xl mb-7">
                🎉
              </div>

              {/* Yellow Border Box matching Screenshot 2 */}
              <div className="w-full max-w-[390px] bg-black border-2 border-[#facc15] rounded-xl p-4 sm:p-5 text-center shadow-lg">
                <p className="text-[#facc15] font-black text-xs sm:text-sm leading-relaxed tracking-wide">
                  {currentWinner.taxNotice || `Mr/Mrs ${currentWinner.name}, your tax payment is not complete. Please make the payment and receive your prize money.`}
                </p>
              </div>
            </div>

            {/* Bottom info */}
            <div className="text-center text-[11px] text-slate-500 mt-4">
              Kerala State Lotteries Directorate · Statutory Tax Compliance Portal
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
