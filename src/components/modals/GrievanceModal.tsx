import React, { useState } from 'react';
import { X, FileEdit, CheckCircle2, ShieldAlert, Send } from 'lucide-react';

interface GrievanceModalProps {
  onClose: () => void;
}

export const GrievanceModal: React.FC<GrievanceModalProps> = ({ onClose }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [category, setCategory] = useState('Prize Claim Assistance');
  const [ticketNumber, setTicketNumber] = useState('');
  const [description, setDescription] = useState('');
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim() || !description.trim()) return;

    const refNumber = `GOK-GRV-${Math.floor(10000 + Math.random() * 90000)}`;
    setSubmittedRef(refNumber);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#22c55e] text-white p-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileEdit className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl leading-tight">
                Grievance Redressal
              </h3>
              <p className="text-emerald-100 text-xs">
                Official Government Helpdesk & Claims Redressal Portal
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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800">
          {!submittedRef ? (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 leading-tight">
                All submitted grievances are directly tracked by the Directorate of State Lotteries, Thiruvananthapuram. Response within 48 working hours.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Grievance Category:
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="Prize Claim Assistance">Prize Claim Assistance / Bank Payout</option>
                  <option value="Counterfeit / Fake Ticket Report">Report Fake / Counterfeit Lottery Ticket</option>
                  <option value="Agent Verification Query">Authorized Agent Verification Query</option>
                  <option value="Postal Delivery Inquiry">Postal Consignment / Delivery Inquiry</option>
                  <option value="General Public Suggestion">General Public Suggestion / Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Your Full Name:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anand R."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Contact Mobile:
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98470 ..."
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ticket Number / Order ID (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. FW 482910 or KL-2026-92841"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Detailed Complaint / Query:
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe your issue with draw date, counter details or claim number..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#22c55e] hover:bg-[#16a34a] text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                Submit Grievance
              </button>
            </form>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900">
                  Grievance Registered!
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Your reference ticket has been logged into the State Directorate portal.
                </p>
              </div>

              <div className="bg-slate-900 text-white p-4 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Complaint Reference Number
                </span>
                <span className="text-lg font-mono font-bold text-emerald-400">
                  {submittedRef}
                </span>
                <p className="text-[11px] text-slate-400 mt-2">
                  An SMS confirmation has been dispatched to {mobile}. Please quote this reference in future correspondence.
                </p>
              </div>

              <button
                onClick={() => setSubmittedRef(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg"
              >
                File Another Grievance
              </button>
            </div>
          )}
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
