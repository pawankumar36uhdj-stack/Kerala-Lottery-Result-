import React, { useState } from 'react';
import { X, Search, CheckCircle, Clock, Truck, ShieldCheck, Package, ExternalLink, MapPin } from 'lucide-react';
import { LotteryOrder } from '../../data/lotteryData';

interface TrackOrderModalProps {
  orders: LotteryOrder[];
  initialOrderId?: string;
  onClose: () => void;
  onBookNew?: () => void;
}

export const TrackOrderModal: React.FC<TrackOrderModalProps> = ({
  orders,
  initialOrderId = '',
  onClose,
  onBookNew
}) => {
  const [searchInput, setSearchInput] = useState<string>(initialOrderId || orders[0]?.orderId || '');
  const [activeOrder, setActiveOrder] = useState<LotteryOrder | null>(
    orders.find((o) => o.orderId.toLowerCase() === (initialOrderId || orders[0]?.orderId || '').toLowerCase()) || orders[0] || null
  );
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const term = searchInput.trim().toUpperCase();
    if (!term) return;

    const found = orders.find(
      (o) => o.orderId.toUpperCase() === term || o.phone.replace(/\D/g, '').includes(term.replace(/\D/g, ''))
    );

    if (found) {
      setActiveOrder(found);
    } else {
      setErrorMessage(`No consignment found matching "${searchInput}". Please check Order ID (e.g. KL-2026-92841).`);
    }
  };

  const steps = ['Booked', 'Verified', 'Scanned', 'Dispatched', 'Delivered'];
  const currentStepIndex = activeOrder ? steps.indexOf(activeOrder.status) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#1c2e3d] text-white p-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-yellow-400 text-slate-950 rounded-lg">
              <CheckCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl leading-tight">
                Track Order
              </h3>
              <p className="text-slate-300 text-xs">
                Physical Ticket Consignment & Digital Scan Verification
              </p>
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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-slate-800">
          {/* Search Box */}
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Enter Order Tracking ID or Mobile:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. KL-2026-92841"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 font-mono font-medium"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#1c2e3d] hover:bg-[#152431] text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                Track
              </button>
            </div>

            {/* Quick Sample IDs */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 pt-1">
              <span>Quick Test:</span>
              {orders.slice(0, 3).map((o) => (
                <button
                  key={o.orderId}
                  type="button"
                  onClick={() => {
                    setSearchInput(o.orderId);
                    setActiveOrder(o);
                    setErrorMessage('');
                  }}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-[10px]"
                >
                  {o.orderId}
                </button>
              ))}
            </div>

            {errorMessage && (
              <p className="text-xs text-red-600 font-semibold mt-1">
                {errorMessage}
              </p>
            )}
          </form>

          {activeOrder && (
            <div className="space-y-4">
              {/* Order Status Badge & Scheme Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Tracking Reference
                    </span>
                    <strong className="text-base font-black text-slate-900 font-mono">
                      {activeOrder.orderId}
                    </strong>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    activeOrder.status === 'Delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : activeOrder.status === 'Dispatched'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {activeOrder.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Lottery Scheme</span>
                    <strong className="text-slate-800">{activeOrder.schemeName} ({activeOrder.schemeCode})</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Draw Schedule</span>
                    <strong className="text-purple-900">{activeOrder.drawDate}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Recipient</span>
                    <strong className="text-slate-800">{activeOrder.customerName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Postal Tracking</span>
                    <strong className="text-cyan-700 font-mono">{activeOrder.postalTracking || 'Assigned on dispatch'}</strong>
                  </div>
                </div>

                {/* Ticket Numbers Pill Chips */}
                <div>
                  <span className="text-slate-500 block text-[10px] mb-1">Registered Paper Ticket Numbers:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeOrder.ticketNumbers.map((num, i) => (
                      <span key={i} className="px-2.5 py-1 bg-white border border-teal-300 text-teal-900 rounded font-mono font-bold text-xs shadow-2xs">
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress Timeline Stepper */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Consignment Journey
                </h4>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {steps.map((st, idx) => {
                    const isDone = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <div key={st} className="relative flex items-start gap-3">
                        <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isDone ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${isCurrent ? 'text-emerald-700' : isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                            {st === 'Booked' && '1. Order Registered at Authorized Counter'}
                            {st === 'Verified' && '2. Verified by Kerala State Lottery Agent'}
                            {st === 'Scanned' && '3. High-Security Barcode Scanned'}
                            {st === 'Dispatched' && '4. Dispatched via India Post Speed Post'}
                            {st === 'Delivered' && '5. Delivered to Doorstep'}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {activeOrder.history[idx]?.description || (isDone ? 'Completed' : 'Pending next step')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Physical Scanned Ticket Digital Preview */}
              <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-amber-950">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Physical Paper Ticket Security
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                    Genuine Govt Stamp
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-amber-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-slate-900 text-xs">
                      {activeOrder.schemeName} · {activeOrder.schemeCode}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Agency: {activeOrder.agentName} ({activeOrder.agentCode})
                    </div>
                    <div className="font-mono text-xs font-bold text-slate-700 mt-1">
                      Tickets: {activeOrder.ticketNumbers.join(', ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-12 h-12 bg-slate-900 text-white text-[8px] font-mono flex items-center justify-center rounded p-1 text-center">
                      QR SEAL VERIFIED
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 leading-tight">
                  Delivery Address: {activeOrder.deliveryAddress}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-3 sm:p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg"
          >
            Close
          </button>
          {onBookNew && (
            <button
              onClick={() => {
                onClose();
                onBookNew();
              }}
              className="px-4 py-2 text-xs font-bold text-slate-900 bg-[#48c9b0] hover:bg-[#3db89f] rounded-lg"
            >
              Book New Ticket
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
