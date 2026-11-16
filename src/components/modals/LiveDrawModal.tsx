import React, { useState, useEffect, useRef } from 'react';
import { X, Volume2, VolumeX, Radio, CheckCircle, Search, AlertCircle, RotateCw } from 'lucide-react';
import {
  WinnerRecord,
  fetchActiveWinner,
  fetchPublicSettings,
  checkLotteryResult
} from '../../services/api';

interface LiveDrawModalProps {
  onClose: () => void;
  checkedWinner?: WinnerRecord | null;
  checkedQuery?: string;
  hasChecked?: boolean;
  onWinnerResolved?: (winner: WinnerRecord | null, query: string) => void;
}

function formatDisplayDate(dateStr?: string): string {
  const raw = String(dateStr || '').trim();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  return raw;
}

function splitTicketForDrum(ticketNo?: string): { series: string; chars: string[] } {
  const clean = String(ticketNo || '').trim().toUpperCase();
  if (!clean) return { series: '--', chars: ['-', '-', '-', '-', '-', '-'] };
  const match = clean.match(/^([A-Z]+)\s*[-/]?\s*(.+)$/);
  if (match && match[1].length <= 4) {
    const rest = match[2].replace(/\s+/g, '');
    return {
      series: match[1],
      chars: rest.length > 0 ? rest.split('') : ['-']
    };
  }
  const compact = clean.replace(/\s+/g, '');
  return {
    series: compact.slice(0, 2) || '--',
    chars: compact.slice(2).length > 0 ? compact.slice(2).split('') : ['-']
  };
}

const SERIES_SPIN_POOL = ['KA', 'KB', 'KC', 'KL', 'DS', 'SG', 'FW', 'KD', 'KG', 'SK', 'HB', 'MS'];
const CHAR_SPIN_POOL = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const LiveDrawModal: React.FC<LiveDrawModalProps> = ({
  onClose,
  checkedWinner = null,
  checkedQuery = '',
  hasChecked = false,
  onWinnerResolved
}) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [winner, setWinner] = useState<WinnerRecord | null>(hasChecked ? checkedWinner : null);
  const [drawDate, setDrawDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(!hasChecked);
  const [lookupQuery, setLookupQuery] = useState<string>(checkedQuery || '');
  const [notFoundMsg, setNotFoundMsg] = useState<string>(
    hasChecked && !checkedWinner
      ? `No registered winning ticket found for ${checkedQuery || 'this number'}.`
      : ''
  );

  // Drum rolling animation state (always settles on the exact real winner.ticketNo)
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [displaySeries, setDisplaySeries] = useState<string>('--');
  const [displayChars, setDisplayChars] = useState<string[]>(['-', '-', '-', '-', '-', '-']);
  const [lockedSlots, setLockedSlots] = useState<number>(0); // 0 = none locked, 1 = series locked, 2..N = chars locked
  const rollIntervalRef = useRef<number | null>(null);

  const stopRollInterval = () => {
    if (rollIntervalRef.current !== null) {
      window.clearInterval(rollIntervalRef.current);
      rollIntervalRef.current = null;
    }
  };

  const startTicketDrumRoll = (ticketNo: string) => {
    stopRollInterval();
    const target = splitTicketForDrum(ticketNo);
    const totalSlots = 1 + target.chars.length;

    setIsRolling(true);
    setLockedSlots(0);

    let tick = 0;
    const ticksBeforeSeriesLock = 10; // ~600ms
    const ticksPerSlot = 4; // ~240ms per digit

    rollIntervalRef.current = window.setInterval(() => {
      tick += 1;

      let currentLocked = 0;
      if (tick >= ticksBeforeSeriesLock) {
        currentLocked = Math.min(
          totalSlots,
          1 + Math.floor((tick - ticksBeforeSeriesLock) / ticksPerSlot)
        );
      }
      setLockedSlots(currentLocked);

      if (currentLocked >= 1) {
        setDisplaySeries(target.series);
      } else {
        setDisplaySeries(SERIES_SPIN_POOL[tick % SERIES_SPIN_POOL.length]);
      }

      const nextChars = target.chars.map((realChar, idx) => {
        if (currentLocked >= 2 + idx) {
          return realChar;
        }
        return CHAR_SPIN_POOL[(tick * 3 + idx * 7) % CHAR_SPIN_POOL.length];
      });
      setDisplayChars(nextChars);

      if (currentLocked >= totalSlots) {
        stopRollInterval();
        setDisplaySeries(target.series);
        setDisplayChars(target.chars);
        setIsRolling(false);
      }
    }, 60);
  };

  useEffect(() => {
    return () => stopRollInterval();
  }, []);

  useEffect(() => {
    fetchPublicSettings().then((settings) => {
      if (settings?.drawDate) setDrawDate(settings.drawDate);
    });

    if (hasChecked) {
      setWinner(checkedWinner);
      setIsLoading(false);
      if (checkedWinner) {
        setNotFoundMsg('');
        startTicketDrumRoll(checkedWinner.ticketNo);
      } else {
        stopRollInterval();
        setIsRolling(false);
        setNotFoundMsg(`No registered winning ticket found for ${checkedQuery || 'this number'}.`);
      }
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    fetchActiveWinner()
      .then((active) => {
        if (cancelled) return;
        setWinner(active);
        if (active) {
          setNotFoundMsg('');
          startTicketDrumRoll(active.ticketNo);
        } else {
          stopRollInterval();
          setIsRolling(false);
          setNotFoundMsg('No active winner configured in backend.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasChecked, checkedWinner, checkedQuery]);

  const handleCheckNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = lookupQuery.trim();
    if (!q) {
      setNotFoundMsg('Please enter a valid mobile number or ticket number to check.');
      return;
    }
    setIsLoading(true);
    stopRollInterval();
    try {
      const res = await checkLotteryResult(q);
      if (res.drawDate) setDrawDate(res.drawDate);
      if (res.found && res.data) {
        setWinner(res.data);
        setNotFoundMsg('');
        onWinnerResolved?.(res.data, q);
        startTicketDrumRoll(res.data.ticketNo);
      } else {
        setWinner(null);
        setIsRolling(false);
        setNotFoundMsg(res.message || `No registered winning ticket found for ${q}.`);
        onWinnerResolved?.(null, q);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const displayDrawDate = formatDisplayDate(winner?.bookingDate) || formatDisplayDate(drawDate) || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-950 text-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col border border-slate-800">
        {/* Header */}
        <div className="bg-red-700 p-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-lg">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg sm:text-xl leading-tight">
                  Live Draw Broadcast
                </h3>
                <span className="text-[10px] bg-white text-red-700 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Live
                </span>
              </div>
              <p className="text-red-100 text-xs">
                Gorky Bhavan, Thiruvananthapuram · Draw Date: {formatDisplayDate(drawDate) || displayDrawDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Stage Broadcast Preview */}
        <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center border-b border-slate-800 shrink-0">
          <img
            src="/assets/extracted/draw_event_1.jpg"
            alt="Live Draw Proceedings"
            className="w-full h-full object-cover opacity-85"
            referrerPolicy="no-referrer"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40 flex flex-col justify-between p-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-1 bg-red-600/90 text-white text-[10px] font-black rounded flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                OFFICIAL STREAM FEED
              </span>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded bg-black/60 text-white hover:bg-black/80 text-xs flex items-center gap-1 cursor-pointer"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>
            </div>

            <div className="text-xs text-white bg-black/75 backdrop-blur-xs p-2.5 rounded-lg border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px]">
                  {isRolling ? 'Rolling Official Drum:' : 'Verified Ticket / Winner:'}
                </span>
                <strong className="text-yellow-400 font-mono">
                  {winner
                    ? isRolling
                      ? 'Drawing Winning Number...'
                      : `${winner.ticketNo} (${winner.prizeTier || 'Winner'})`
                    : 'Check Mobile / Ticket Below'}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Official Draw Date:</span>
                <strong className="text-emerald-400 font-mono">{displayDrawDate}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Quick Lookup Bar so Live Draw shows exact winner by mobile/ticket number */}
          <form onSubmit={handleCheckNumber} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Enter Mobile No. or Ticket No..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl text-white placeholder-slate-500 focus:outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
            >
              {isLoading ? 'Checking...' : 'Check'}
            </button>
          </form>

          {isLoading ? (
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 text-center text-xs text-slate-400">
              Loading official draw details from backend...
            </div>
          ) : winner ? (
            <>
              {/* Tumbler Digit Cylinders rolling and locking onto the winner's real Ticket Number */}
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 text-center space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>{isRolling ? 'Lottery Drum Rolling...' : 'Official Winning Ticket Drum'}</span>
                  <span className="text-cyan-400 font-semibold">
                    {winner.prizeTier || 'Winner'} ({winner.amount})
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
                  <div
                    className={`min-w-[48px] px-2 h-14 sm:h-16 bg-gradient-to-b from-slate-800 via-slate-700 to-slate-900 border-2 rounded-xl flex items-center justify-center shadow-lg transition-all ${
                      lockedSlots >= 1
                        ? 'border-yellow-400 ring-2 ring-yellow-400/30'
                        : 'border-yellow-400/50'
                    }`}
                  >
                    <span
                      className={`font-mono text-lg sm:text-xl font-black text-yellow-300 ${
                        lockedSlots < 1 && isRolling ? 'animate-bounce blur-[0.5px]' : ''
                      }`}
                    >
                      {displaySeries}
                    </span>
                  </div>

                  {displayChars.map((d, index) => {
                    const isSlotLocked = lockedSlots >= 2 + index;
                    return (
                      <div
                        key={index}
                        className={`w-9 sm:w-11 h-14 sm:h-16 bg-gradient-to-b from-slate-800 via-slate-700 to-slate-900 border-2 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden transition-all ${
                          isSlotLocked
                            ? 'border-emerald-400 ring-2 ring-emerald-400/30'
                            : 'border-cyan-400/60'
                        }`}
                      >
                        <div className="absolute inset-x-0 top-0 h-2.5 bg-gradient-to-b from-black/40 to-transparent"></div>
                        <span
                          className={`font-mono text-xl sm:text-2xl font-black text-white transition-transform ${
                            !isSlotLocked && isRolling ? 'blur-[1px] scale-110 translate-y-0.5' : 'scale-100'
                          }`}
                        >
                          {d}
                        </span>
                        <div className="absolute inset-x-0 bottom-0 h-2.5 bg-gradient-to-t from-black/40 to-transparent"></div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => startTicketDrumRoll(winner.ticketNo)}
                    disabled={isRolling}
                    className={`py-2 px-5 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all ${
                      isRolling
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 active:scale-95 cursor-pointer'
                    }`}
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRolling ? 'animate-spin' : ''}`} />
                    {isRolling ? 'Rolling Draw Drum...' : 'Replay Draw Roll'}
                  </button>
                </div>
              </div>

              {/* Exact Winner Details Card (Matches only the number whose result opened) */}
              <div
                className={`bg-slate-900 rounded-xl p-4 border transition-all duration-300 space-y-3 ${
                  isRolling ? 'border-cyan-500/40 opacity-80' : 'border-emerald-500/50 opacity-100'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs sm:text-sm">
                    <CheckCircle className="w-4 h-4" />
                    {isRolling ? 'Verifying Winning Ticket...' : 'Verified Winner Details'}
                  </span>
                  <span className="text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-2.5 py-0.5 rounded-full font-bold">
                    {winner.prizeTier}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Winner Name</span>
                    <strong className="text-white uppercase font-bold">{winner.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Mobile Number</span>
                    <strong className="text-cyan-300 font-mono">{winner.mobile || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Ticket Number</span>
                    <strong className="text-yellow-300 font-mono">{winner.ticketNo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Winning Amount</span>
                    <strong className="text-emerald-400 font-extrabold">{winner.amount}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Booking / Draw Date</span>
                    <strong className="text-slate-200 font-mono">{displayDrawDate}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">State / Agent Code</span>
                    <strong className="text-slate-200">
                      {winner.state || 'Kerala'} ({winner.agentCode || '690003'})
                    </strong>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-slate-400">Tax Payment Status:</span>
                    <strong className={winner.taxPaymentStatus?.toLowerCase().includes('complete') ? 'text-emerald-400' : 'text-amber-400'}>
                      {winner.taxPaymentStatus} ({winner.taxProgress ?? 95}%)
                    </strong>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Matching Winner Record</h4>
              <p className="text-xs text-slate-400">
                {notFoundMsg || 'Please enter a valid mobile number or ticket number registered in the backend.'}
              </p>
            </div>
          )}

          {/* Official Verification Panel */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                Drawn Under Official Supervision
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{displayDrawDate}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Every draw is held in public at Gorky Bhavan in the presence of an independent supervisory judges committee appointed by the Government of Kerala.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-900 p-3 sm:p-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Kerala State Lotteries Directorate
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
