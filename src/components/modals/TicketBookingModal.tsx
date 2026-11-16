import React, { useState } from 'react';
import { X, Box, CheckCircle2, Ticket, ShieldCheck, ArrowRight, Copy, Check, Printer } from 'lucide-react';
import { LOTTERY_SCHEMES, LotteryOrder, DISTRICTS } from '../../data/lotteryData';

interface TicketBookingModalProps {
  onClose: () => void;
  onAddOrder: (newOrder: LotteryOrder) => void;
  onTrackOrder: (orderId: string) => void;
}

export const TicketBookingModal: React.FC<TicketBookingModalProps> = ({
  onClose,
  onAddOrder,
  onTrackOrder,
}) => {
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>(LOTTERY_SCHEMES[0].id);
  const [quantity, setQuantity] = useState<number>(2);
  const [seriesPrefix, setSeriesPrefix] = useState<string>('WA');
  const [customerName, setCustomerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [district, setDistrict] = useState<string>('Thiruvananthapuram');
  const [pinCode, setPinCode] = useState<string>('695001');

  const [bookingConfirmed, setBookingConfirmed] = useState<LotteryOrder | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const scheme = LOTTERY_SCHEMES.find((s) => s.id === selectedSchemeId) || LOTTERY_SCHEMES[0];
  const totalPrice = scheme.ticketPrice * quantity;

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim() || !address.trim()) return;

    // Generate random 6-digit ticket numbers with selected series
    const generatedNumbers: string[] = [];
    for (let i = 0; i < quantity; i++) {
      const randomSixDigit = Math.floor(100000 + Math.random() * 900000);
      generatedNumbers.push(`${seriesPrefix} ${randomSixDigit}`);
    }

    const randomIdNumber = Math.floor(10000 + Math.random() * 90000);
    const newOrderId = `KL-2026-${randomIdNumber}`;

    const newOrder: LotteryOrder = {
      orderId: newOrderId,
      customerName: customerName.trim(),
      phone: phone.trim(),
      schemeName: scheme.name,
      schemeCode: scheme.code,
      ticketCount: quantity,
      ticketNumbers: generatedNumbers,
      totalAmount: totalPrice,
      bookingDate: `${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      drawDate: `${scheme.drawDate} (${scheme.drawDay} 3:00 PM)`,
      status: 'Booked',
      agentName: 'Sree Padmanabha Lucky Centre (Government Authorized)',
      agentCode: 'TVM-AGT-1042',
      courier: 'India Post Speed Post',
      deliveryAddress: `${address.trim()}, ${district} - ${pinCode.trim()}`,
      history: [
        {
          status: 'Order Placed',
          time: 'Just now',
          description: 'Ticket series reserved with government authorized agency.'
        },
        {
          status: 'Physical Allotment',
          time: 'In progress',
          description: 'Physical paper tickets being pulled and scanned.'
        }
      ]
    };

    onAddOrder(newOrder);
    setBookingConfirmed(newOrder);
  };

  const handleCopyOrderId = () => {
    if (bookingConfirmed) {
      navigator.clipboard.writeText(bookingConfirmed.orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#48c9b0] text-slate-900 p-4 flex items-center justify-between shrink-0 shadow-sm border-b border-teal-600/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/30 rounded-lg text-slate-900">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl text-slate-950 leading-tight">
                Ticket Booking Counter
              </h3>
              <p className="text-teal-950 text-xs font-semibold">
                Authorized Kerala Paper Lottery Booking & Postal Dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/10 hover:bg-black/20 text-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-slate-800">
          {!bookingConfirmed ? (
            <form onSubmit={handleBooking} className="space-y-4">
              {/* Scheme Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Select Lottery Scheme:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LOTTERY_SCHEMES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSchemeId(s.id)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        selectedSchemeId === s.id
                          ? 'border-[#48c9b0] bg-teal-50 ring-2 ring-[#48c9b0]'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-extrabold text-slate-900 text-xs truncate">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-bold mt-0.5">
                        ₹{s.ticketPrice} per ticket
                      </div>
                      <div className="text-[10px] text-slate-500">
                        1st: {s.firstPrize.split('(')[0]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Series & Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Series Prefix:
                  </label>
                  <select
                    value={seriesPrefix}
                    onChange={(e) => setSeriesPrefix(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                  >
                    {['WA', 'WB', 'WC', 'WD', 'WE', 'WF', 'WG', 'WH', 'WJ', 'WK', 'WL', 'WM'].map((s) => (
                      <option key={s} value={s}>
                        Series {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ticket Quantity:
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuantity(num)}
                        className={`flex-1 py-1.5 text-xs font-black rounded-lg border transition-all ${
                          quantity === num
                            ? 'bg-[#48c9b0] text-slate-950 border-teal-500 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price Calculation Box */}
              <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Total Booking Amount</span>
                  <div className="text-xl font-black text-cyan-400">₹ {totalPrice}</div>
                </div>
                <div className="text-right text-xs text-slate-300">
                  <div>{quantity} x ₹{scheme.ticketPrice}</div>
                  <div className="text-[10px] text-emerald-400 font-semibold">Free Registered Postal Dispatch</div>
                </div>
              </div>

              {/* Customer Delivery Details */}
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Recipient & Postal Address:
                </label>

                <div>
                  <input
                    type="text"
                    required
                    placeholder="Full Name (as per Aadhaar / ID)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    required
                    placeholder="Mobile (+91 ...)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500"
                  />
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 font-medium"
                  >
                    {DISTRICTS.filter((d) => d !== 'All Districts').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Door / Flat / Street"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="col-span-2 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="PIN Code"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Authenticity Guarantee Note */}
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-start gap-2 text-xs text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-tight">
                  Tickets are sourced directly from Kerala State Lotteries Directorate authorized distributors with stamped agent code and genuine watermark.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-[#48c9b0] hover:bg-[#3db89f] active:scale-[0.99] text-slate-950 font-black text-sm tracking-wide rounded-xl shadow-md transition-all cursor-pointer"
              >
                Confirm & Reserve Tickets (₹{totalPrice})
              </button>
            </form>
          ) : (
            /* Booking Confirmed Receipt */
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>

              <div>
                <h4 className="text-xl font-black text-slate-900">
                  Booking Confirmed!
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Your official Kerala paper lottery ticket order has been registered.
                </p>
              </div>

              {/* Order ID Card */}
              <div className="bg-slate-900 text-white p-4 rounded-xl text-left space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs text-slate-400">Tracking Reference ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-base text-yellow-400">
                      {bookingConfirmed.orderId}
                    </span>
                    <button
                      onClick={handleCopyOrderId}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Scheme</span>
                    <strong className="text-white">{bookingConfirmed.schemeName} ({bookingConfirmed.schemeCode})</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Draw Date</span>
                    <strong className="text-white">{bookingConfirmed.drawDate}</strong>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] mb-1">Assigned Ticket Numbers</span>
                  <div className="flex flex-wrap gap-1.5">
                    {bookingConfirmed.ticketNumbers.map((num, i) => (
                      <span key={i} className="px-2 py-0.5 bg-teal-900/80 text-teal-200 border border-teal-700 rounded text-xs font-mono font-bold">
                        {num}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-2 text-[11px] text-slate-400">
                  <span>Authorized Agent: {bookingConfirmed.agentName}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onTrackOrder(bookingConfirmed.orderId);
                  }}
                  className="w-full py-2.5 bg-[#86055c] hover:bg-[#70044d] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Track This Order Live</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setBookingConfirmed(null)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Book Another Ticket
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
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
