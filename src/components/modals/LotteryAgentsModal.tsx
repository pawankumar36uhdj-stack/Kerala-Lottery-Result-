import React, { useState, useEffect } from 'react';
import { X, Search, UserCheck, Phone, MapPin, Award, CheckCircle2, Shield } from 'lucide-react';
import { LOTTERY_AGENTS, DISTRICTS, LotteryAgent } from '../../data/lotteryData';
import { fetchPublicSettings, getCachedSettings } from '../../services/api';

interface LotteryAgentsModalProps {
  onClose: () => void;
  onBookWithAgent?: (agent: LotteryAgent) => void;
}

export const LotteryAgentsModal: React.FC<LotteryAgentsModalProps> = ({ onClose, onBookWithAgent }) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All Districts');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [agentPhone, setAgentPhone] = useState<string>(getCachedSettings().agentPhone ?? '9583405079');

  useEffect(() => {
    const loadSettings = () => {
      fetchPublicSettings().then((settings) => {
        if (settings?.agentPhone !== undefined) setAgentPhone(settings.agentPhone);
      }).catch(() => {});
    };
    loadSettings();

    const handleSettingsUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.agentPhone !== undefined) setAgentPhone(detail.agentPhone);
    };
    window.addEventListener('kerala-settings-updated', handleSettingsUpdated);
    window.addEventListener('focus', loadSettings);
    return () => {
      window.removeEventListener('kerala-settings-updated', handleSettingsUpdated);
      window.removeEventListener('focus', loadSettings);
    };
  }, []);

  const filteredAgents = LOTTERY_AGENTS.filter((agent) => {
    const matchesDistrict = selectedDistrict === 'All Districts' || agent.district === selectedDistrict;
    const matchesSearch =
      agent.agencyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.district.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDistrict && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0b3c4c] text-white p-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-yellow-400 text-slate-950 rounded-lg">
              <UserCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl leading-tight">
                Authorized Lottery Agents
              </h3>
              <p className="text-teal-200 text-xs">
                Government Verified District Agency Directory
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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800">
          {/* District & Search Filters */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search agent name, agency or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500"
                />
              </div>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 font-semibold"
              >
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span>Showing {filteredAgents.length} authorized agents</span>
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                100% Genuine Stamped Tickets
              </span>
            </div>
          </div>

          {/* Agents List */}
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 hover:border-teal-400 transition-colors shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                      {agent.code} · {agent.district}
                    </span>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 mt-1">
                      {agent.agencyName}
                    </h4>
                    <p className="text-xs text-slate-600 font-medium">
                      Agent: {agent.agentName}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Authorized
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-200/60">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-tight">{agent.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                    <span>{agentPhone || agent.phone || '9583405079'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Govt License: {agent.licenseNumber}
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-end gap-2">
                  <a
                    href={`tel:${(agentPhone || agent.phone || '9583405079').split('/')[0].trim()}`}
                    className="px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-100 hover:bg-teal-200 rounded-lg flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    Call Agency
                  </a>
                  {onBookWithAgent && (
                    <button
                      onClick={() => {
                        onClose();
                        onBookWithAgent(agent);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-[#0b3c4c] hover:bg-[#072934] rounded-lg"
                    >
                      Book Here
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filteredAgents.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                No authorized agents found matching your query.
              </div>
            )}
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
