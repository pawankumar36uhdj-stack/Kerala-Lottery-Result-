import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  FileText,
  KeyRound,
  LogOut,
  Smartphone,
  Calendar,
  Percent,
  Check,
  Trophy,
  Tag,
  Download,
  Upload,
  Layers,
  Cloud,
  CloudOff
} from 'lucide-react';
import { type User } from 'firebase/auth';
import {
  WinnerRecord,
  FeeItem,
  DEFAULT_FEES,
  PrizeTicketsMap,
  adminLogin,
  adminLogout,
  getAdminToken,
  verifyAdminSession,
  fetchAllWinners,
  createWinner,
  updateWinner,
  deleteWinner,
  changeAdminPassword,
  fetchPrizeTickets,
  addPrizeTicket,
  deletePrizeTicket,
  fetchActiveWinner,
  setActiveWinner,
  bulkCreateWinners,
  exportAllData,
  importAllData,
  fetchPublicSettings,
  getCachedSettings,
  updateAdminSettings,
  initializeFirestoreIfEmpty,
  isCloudDatabaseConnected
} from '../../services/api';
import {
  ADMIN_GOOGLE_EMAIL,
  isFirebaseAdminUser,
  signInAdminWithGoogle,
  signOutFirebase,
  subscribeAuthState
} from '../../lib/firebase';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Convert stored dates (DD-MM-YYYY or YYYY-MM-DD) cleanly to YYYY-MM-DD for <input type="date">
function toIsoDateForInput(dateStr?: string): string {
  const raw = String(dateStr || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const ddmmyyyy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  }
  return new Date().toISOString().split('T')[0];
}

// Format YYYY-MM-DD picker value to DD-MM-YYYY for Result Sheet Red Date Pill
function formatIsoToDrawDate(isoStr: string): string {
  const match = String(isoStr || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return isoStr;
}

const PRIZE_TIERS = [
  { key: '1st Prize', label: '1st Prize (₹25 CRORES/-)', color: 'border-red-500/60 bg-red-950/20 text-red-300' },
  { key: 'Consolation Prize', label: 'Consolation Prize (₹1,00,000/-)', color: 'border-amber-500/60 bg-amber-950/20 text-amber-300' },
  { key: '2nd Prize', label: '2nd Prize (₹10 CRORES/-)', color: 'border-red-500/60 bg-red-950/20 text-red-300' },
  { key: '3rd Prize', label: '3rd Prize (₹75,00,000/-)', color: 'border-purple-500/60 bg-purple-950/20 text-purple-300' },
  { key: '4th Prize', label: '4th Prize (₹10,00,000/-)', color: 'border-emerald-500/60 bg-emerald-950/20 text-emerald-300' },
  { key: '5th Prize', label: '5th Prize (₹1,00,000/-)', color: 'border-blue-500/60 bg-blue-950/20 text-blue-300' },
  { key: '6th Prize', label: '6th Prize (₹10,000/-)', color: 'border-cyan-500/60 bg-cyan-950/20 text-cyan-300' }
];

export const AdminPortal: React.FC<AdminPortalProps> = ({ isOpen, onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Dashboard Tabs: prize-tickets, winners, add, settings
  const [activeTab, setActiveTab] = useState<'prize-tickets' | 'winners' | 'add' | 'settings'>('prize-tickets');

  // Prize Tickets State (Single & Bulk Unlimited — loaded live from Cloud Firestore, never prefilled with defaults)
  const [prizeTickets, setPrizeTickets] = useState<PrizeTicketsMap>({});
  const [quickTicketNo, setQuickTicketNo] = useState<string>('');
  const [quickPrizeTier, setQuickPrizeTier] = useState<string>('4th Prize');
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [bulkTicketsText, setBulkTicketsText] = useState<string>('');
  const [isAddingQuick, setIsAddingQuick] = useState<boolean>(false);

  // Winners State & Bulk Unlimited Winners
  const [winners, setWinners] = useState<WinnerRecord[]>([]);
  const [activeWinnerId, setActiveWinnerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isBulkWinnerModalOpen, setIsBulkWinnerModalOpen] = useState<boolean>(false);
  const [bulkWinnersInput, setBulkWinnersInput] = useState<string>('');
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Form State for Add / Edit
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    state: 'Kerala',
    agentCode: '690003',
    ticketNo: '',
    bookingDate: new Date().toISOString().split('T')[0],
    amount: '₹ 10,00,000/-',
    prizeTier: '4th Prize',
    taxPaymentStatus: 'Processing.',
    taxProgress: 95,
    fees: DEFAULT_FEES.map(f => ({ ...f })) as FeeItem[],
    taxNotice: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Password Change Form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwChangeStatus, setPwChangeStatus] = useState<string>('');

  // Draw Date Setting & Helpline / Email / Agent Phone Settings
  const cachedSettings = getCachedSettings();
  const [drawDateInput, setDrawDateInput] = useState<string>(cachedSettings.drawDate ?? '09-11-2026');
  const [helplineInput, setHelplineInput] = useState<string>(cachedSettings.helpline ?? '0471-2305230, 0471-2305193');
  const [emailInput, setEmailInput] = useState<string>(cachedSettings.email ?? 'cru.lotteries@kerala.gov.in');
  const [agentPhoneInput, setAgentPhoneInput] = useState<string>(cachedSettings.agentPhone ?? '9583405079');
  const [isSavingDate, setIsSavingDate] = useState<boolean>(false);
  const [contactSaveStatus, setContactSaveStatus] = useState<string>('');

  // Cloud Firestore Admin Auth state
  const [cloudAdminUser, setCloudAdminUser] = useState<User | null>(null);
  const [isConnectingCloud, setIsConnectingCloud] = useState<boolean>(false);
  const [cloudConnectError, setCloudConnectError] = useState<string>('');
  const [isPopupBlockedError, setIsPopupBlockedError] = useState<boolean>(false);
  const [copiedPortalLink, setCopiedPortalLink] = useState<boolean>(false);

  // Delete Confirm Modal
  const [deleteCandidate, setDeleteCandidate] = useState<WinnerRecord | null>(null);

  const handleSessionExpired = (msg?: string) => {
    adminLogout();
    setIsAuthenticated(false);
    setLoginError(msg || 'Session expired. Please log in again.');
  };

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsub = subscribeAuthState(async (user) => {
      setCloudAdminUser(user);
      if (isFirebaseAdminUser(user) && isAuthenticated) {
        setCloudConnectError('');
        setIsPopupBlockedError(false);
        try {
          await initializeFirestoreIfEmpty();
          await loadAllData();
        } catch (err) {
          console.warn('Firestore init/sync warning:', err);
        }
      }
    });
    return () => unsub();
  }, [isAuthenticated]);

  const handleConnectCloudDatabase = async () => {
    setIsConnectingCloud(true);
    setCloudConnectError('');
    setIsPopupBlockedError(false);
    try {
      await signInAdminWithGoogle();
      const initRes = await initializeFirestoreIfEmpty();
      await loadAllData();
      setFeedbackMessage({
        text: initRes.initializedNow
          ? '✓ Cloud Database connected & existing data saved permanently! Future edits/deletes will never auto-delete.'
          : '✓ Cloud Database connected! All data is synced permanently from Cloud Firestore.',
        type: 'success'
      });
    } catch (err: any) {
      const code = String(err?.code || '');
      const msg = String(err?.message || '');
      const blocked =
        code.includes('popup-blocked') ||
        code.includes('popup-closed-by-user') ||
        code.includes('cancelled-popup-request') ||
        msg.toLowerCase().includes('popup');
      setIsPopupBlockedError(blocked);
      const friendly = blocked
        ? 'Browser/iframe blocked the Google Sign-In popup. Click "Open in Direct Browser Tab" below to connect Google Cloud in 1 click.'
        : msg || `Please sign in with ${ADMIN_GOOGLE_EMAIL} to connect Cloud Database.`;
      setCloudConnectError(friendly);
      setFeedbackMessage({
        text: friendly,
        type: 'error'
      });
    } finally {
      setIsConnectingCloud(false);
      setTimeout(() => setFeedbackMessage(null), 6000);
    }
  };

  const handleCopyPortalLink = async () => {
    try {
      const base = window.location.origin + window.location.pathname + '#admin';
      await navigator.clipboard.writeText(base);
      setCopiedPortalLink(true);
      setTimeout(() => setCopiedPortalLink(false), 3000);
    } catch {}
  };

  const handleDisconnectCloudDatabase = async () => {
    try {
      await signOutFirebase();
      setFeedbackMessage({ text: 'Disconnected Google Cloud sync session.', type: 'success' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch {}
  };

  // Check existing session against backend on open
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const token = getAdminToken();
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    verifyAdminSession().then((status) => {
      if (cancelled) return;
      if (status === 'valid') {
        setIsAuthenticated(true);
        setLoginError('');
        loadAllData();
      } else if (status === 'invalid') {
        setIsAuthenticated(false);
      } else {
        // Network issue: keep UI ready if token exists
        setIsAuthenticated(true);
        loadAllData();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const loadAllData = async () => {
    setIsFetching(true);
    try {
      const [winnersRes, prizesData, activeData, settingsData] = await Promise.all([
        fetchAllWinners(),
        fetchPrizeTickets(),
        fetchActiveWinner(),
        fetchPublicSettings()
      ]);
      if (winnersRes.unauthorized) {
        handleSessionExpired();
        return;
      }
      const winnersData = winnersRes.winners;
      setWinners(winnersData);
      if (prizesData) setPrizeTickets(prizesData);
      if (settingsData?.drawDate !== undefined) setDrawDateInput(settingsData.drawDate);
      if (settingsData?.helpline !== undefined) setHelplineInput(settingsData.helpline);
      if (settingsData?.email !== undefined) setEmailInput(settingsData.email);
      if (settingsData?.agentPhone !== undefined) setAgentPhoneInput(settingsData.agentPhone);
      if (settingsData?.activeWinnerId) {
        setActiveWinnerId(settingsData.activeWinnerId);
      } else if (activeData?.id) {
        setActiveWinnerId(activeData.id);
      } else if (winnersData.length > 0) {
        setActiveWinnerId(winnersData[0].id);
      } else {
        setActiveWinnerId('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveDrawDate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = drawDateInput.trim();
    if (!trimmed) {
      setFeedbackMessage({ text: 'Please enter a valid Draw Date', type: 'error' });
      return;
    }
    setIsSavingDate(true);
    try {
      const res = await updateAdminSettings({ drawDate: trimmed });
      if (res.unauthorized) {
        handleSessionExpired(res.error);
        return;
      }
      if (res.success && res.settings) {
        setDrawDateInput(res.settings.drawDate);
        setFeedbackMessage({
          text: isCloudDatabaseConnected()
            ? `✓ Official Result Sheet Date updated to "${res.settings.drawDate}" across ALL devices!`
            : `Saved locally (${res.settings.drawDate}) — sabhi devices par sync karne ke liye upar "Connect Cloud Database (Google)" click karein.`,
          type: 'success'
        });
      } else {
        setFeedbackMessage({ text: res.error || 'Failed to update Draw Date', type: 'error' });
      }
    } catch {
      setFeedbackMessage({ text: 'Error updating Draw Date', type: 'error' });
    } finally {
      setIsSavingDate(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleSaveContactSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDate(true);
    setContactSaveStatus('');
    try {
      const res = await updateAdminSettings({
        helpline: helplineInput.trim(),
        email: emailInput.trim(),
        agentPhone: agentPhoneInput.trim()
      });
      if (res.unauthorized) {
        handleSessionExpired(res.error);
        return;
      }
      if (res.success && res.settings) {
        if (res.settings.helpline !== undefined) setHelplineInput(res.settings.helpline);
        if (res.settings.email !== undefined) setEmailInput(res.settings.email);
        if (res.settings.agentPhone !== undefined) setAgentPhoneInput(res.settings.agentPhone);
        setContactSaveStatus('Success: Saved in backend! Live on screen now.');
        setFeedbackMessage({ text: '✓ Helpline, Email & Agent Number updated permanently in backend!', type: 'success' });
      } else {
        setContactSaveStatus(`Error: ${res.error || 'Failed to save settings'}`);
        setFeedbackMessage({ text: res.error || 'Failed to update contact settings', type: 'error' });
      }
    } catch {
      setContactSaveStatus('Error: Network error saving contact settings');
      setFeedbackMessage({ text: 'Error updating contact settings', type: 'error' });
    } finally {
      setIsSavingDate(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleSetActiveLiveWinner = async (w: WinnerRecord) => {
    setIsLoading(true);
    try {
      const res = await setActiveWinner(w.id);
      if (res.unauthorized) {
        handleSessionExpired(res.message);
        return;
      }
      if (res.success) {
        setActiveWinnerId(w.id);
        setFeedbackMessage({
          text: `✓ "${w.name}" (Ticket: ${w.ticketNo}) is now LIVE on the Result Sheet!`,
          type: 'success'
        });
        loadAllData();
      } else {
        setFeedbackMessage({ text: res.message || 'Failed to switch live winner', type: 'error' });
      }
    } catch (err) {
      setFeedbackMessage({ text: 'Error switching live winner', type: 'error' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      const res = await adminLogin(passwordInput);
      if (res.success) {
        setIsAuthenticated(true);
        setPasswordInput('');
        loadAllData();
      } else {
        setLoginError(res.error || 'Incorrect admin password. Please try again.');
      }
    } catch (err) {
      setLoginError('Error connecting to backend authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    adminLogout();
    setIsAuthenticated(false);
    setPasswordInput('');
    setActiveTab('prize-tickets');
  };

  // Quick Add Ticket(s) directly to Prize Section (Single or Bulk Unlimited)
  const handleQuickAddPrizeTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = isBulkMode ? bulkTicketsText.trim() : quickTicketNo.trim();

    if (!rawInput) {
      setFeedbackMessage({ text: 'Please enter at least one ticket number', type: 'error' });
      return;
    }

    setIsAddingQuick(true);
    try {
      const res = await addPrizeTicket(quickPrizeTier, rawInput);
      if (res.unauthorized) {
        handleSessionExpired(res.error);
        return;
      }
      if (res.success && res.prizeTickets) {
        setPrizeTickets(res.prizeTickets);
        setQuickTicketNo('');
        setBulkTicketsText('');
        setFeedbackMessage({
          text: isCloudDatabaseConnected()
            ? res.message || `Tickets added permanently to ${quickPrizeTier}!`
            : `Saved locally ONLY! Sabhi devices par sync karne ke liye upar "Connect Cloud Database (Google)" click karein.`,
          type: 'success'
        });
      } else {
        setFeedbackMessage({ text: res.error || 'Failed to add tickets to prize section', type: 'error' });
      }
    } catch (err) {
      setFeedbackMessage({ text: 'Error adding ticket(s) to prize section', type: 'error' });
    } finally {
      setIsAddingQuick(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  // Bulk Add Winners from Pasted Text (requires real Name, Ticket, Mobile - no fake fill)
  const handleBulkAddWinnersFromText = async () => {
    const lines = bulkWinnersInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      setFeedbackMessage({ text: 'Please enter at least one line of winner data', type: 'error' });
      return;
    }

    const list: any[] = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(/[,;\t]+/).map(p => p.trim());
      const name = parts[0] || '';
      const ticketNo = (parts[1] || '').toUpperCase();
      const mobile = parts[2] ? parts[2].replace(/\D/g, '') : '';
      const amount = parts[3] || '₹ 10,00,000/-';
      const prizeTier = parts[4] || '4th Prize';

      if (!name || !ticketNo || mobile.length < 10) {
        setFeedbackMessage({
          text: `Line ${i + 1} is incomplete. Format required: Name, Ticket No, 10-digit Mobile`,
          type: 'error'
        });
        return;
      }

      list.push({
        name,
        ticketNo,
        mobile,
        amount,
        prizeTier,
        state: 'Kerala',
        agentCode: '690003',
        bookingDate: new Date().toISOString().split('T')[0],
        taxPaymentStatus: 'Processing.',
        taxProgress: 95,
        taxNotice: `Mr/Mrs ${name.toUpperCase()}, your tax payment is not complete. Please make the payment and receive your prize money.`
      });
    }

    setIsLoading(true);
    try {
      const res = await bulkCreateWinners(list);
      if (res.unauthorized) {
        handleSessionExpired(res.error);
        return;
      }
      if (res.success) {
        setFeedbackMessage({
          text: `✓ ${list.length} winners added permanently to backend! Total winners: ${winners.length + list.length}`,
          type: 'success'
        });
        setBulkWinnersInput('');
        setIsBulkWinnerModalOpen(false);
        loadAllData();
      } else {
        setFeedbackMessage({ text: res.error || 'Failed to bulk add winners', type: 'error' });
      }
    } catch (err) {
      setFeedbackMessage({ text: 'Error bulk adding winners', type: 'error' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  // Export Data to JSON File
  const handleExportBackup = async () => {
    try {
      const res = await exportAllData();
      if (res.unauthorized) {
        handleSessionExpired(res.error);
        return;
      }
      if (res.success && res.data) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `kerala_lottery_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        setFeedbackMessage({ text: 'Backup downloaded successfully!', type: 'success' });
      } else {
        setFeedbackMessage({ text: res.error || 'Failed to download backup', type: 'error' });
      }
    } catch (err) {
      setFeedbackMessage({ text: 'Failed to download backup', type: 'error' });
    }
  };

  // Import JSON Backup
  const handleImportBackup = async () => {
    if (!importJsonText.trim()) {
      setFeedbackMessage({ text: 'Please paste JSON data to import', type: 'error' });
      return;
    }
    try {
      const parsed = JSON.parse(importJsonText);
      const res = await importAllData(parsed);
      if (res.unauthorized) {
        handleSessionExpired(res.error);
        return;
      }
      if (res.success) {
        setFeedbackMessage({ text: '✓ Unlimited data imported successfully into backend!', type: 'success' });
        setImportJsonText('');
        setIsImportModalOpen(false);
        loadAllData();
      } else {
        setFeedbackMessage({ text: res.error || 'Import failed', type: 'error' });
      }
    } catch (e) {
      setFeedbackMessage({ text: 'Invalid JSON format. Please verify your data.', type: 'error' });
    }
  };

  // Remove Ticket from Prize Section
  const handleRemovePrizeTicket = async (tier: string, ticketNo: string) => {
    try {
      const res = await deletePrizeTicket(tier, ticketNo);
      if (res.unauthorized) {
        handleSessionExpired(res.error);
        return;
      }
      if (res.success && res.prizeTickets) {
        setPrizeTickets(res.prizeTickets);
        setFeedbackMessage({ text: `Ticket "${ticketNo}" permanently removed from ${tier}`, type: 'success' });
      } else {
        setFeedbackMessage({ text: res.error || 'Failed to remove ticket', type: 'error' });
      }
    } catch (err) {
      setFeedbackMessage({ text: 'Error removing ticket', type: 'error' });
    } finally {
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  // Strict real-input validation (never auto-fills fake winner names or mobile numbers)
  const validateWinnerForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.ticketNo || formData.ticketNo.trim().length < 2) {
      errors.ticketNo = 'Please enter a valid lottery ticket number.';
    }
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Please enter the winner full name.';
    }
    const cleanMobile = formData.mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      errors.mobile = 'Please enter a valid 10-digit mobile number.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveWinner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateWinnerForm()) {
      return;
    }

    setIsLoading(true);
    const notice = formData.taxNotice.trim() || 
      `Mr/Mrs ${formData.name.toUpperCase().trim()}, your tax payment is not complete. Please make the payment and receive your prize money.`;

    try {
      if (isEditing && editingId) {
        const res = await updateWinner(editingId, {
          ...formData,
          ticketNo: formData.ticketNo.toUpperCase().trim(),
          taxNotice: notice,
          taxProgress: Number(formData.taxProgress)
        });

        if (res.unauthorized) {
          handleSessionExpired(res.error);
          return;
        }

        if (res.success && res.winner) {
          setActiveWinnerId(res.winner.id);
          await setActiveWinner(res.winner.id);
          setFeedbackMessage({
            text: isCloudDatabaseConnected()
              ? `✓ Record updated permanently and ticket "${res.winner.ticketNo}" is LIVE across ALL devices!`
              : `Saved locally ONLY! Sabhi devices par result check hone ke liye upar "Connect Cloud Database (Google)" click karein.`,
            type: 'success'
          });
          setIsEditing(false);
          setEditingId(null);
          resetWinnerForm();
          setActiveTab('winners');
          loadAllData();
        } else {
          setFeedbackMessage({ text: res.error || 'Failed to update record', type: 'error' });
        }
      } else {
        const res = await createWinner({
          ...formData,
          ticketNo: formData.ticketNo.toUpperCase().trim(),
          taxNotice: notice,
          taxProgress: Number(formData.taxProgress)
        });

        if (res.unauthorized) {
          handleSessionExpired(res.error);
          return;
        }

        if (res.success && res.winner) {
          setActiveWinnerId(res.winner.id);
          await setActiveWinner(res.winner.id);
          setFeedbackMessage({
            text: isCloudDatabaseConnected()
              ? `✓ Winner "${res.winner.name}" saved permanently! Result ab KISI BHI device/mobile par check ho jayega.`
              : `Saved locally ONLY! Kisi bhi device par result check hone ke liye upar "Connect Cloud Database (Google)" par click karein.`,
            type: 'success'
          });
          resetWinnerForm();
          setActiveTab('winners');
          loadAllData();
        } else {
          setFeedbackMessage({ text: res.error || 'Failed to add record', type: 'error' });
        }
      }
    } catch (err) {
      setFeedbackMessage({ text: 'Error saving record to backend database', type: 'error' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleStartEdit = (w: WinnerRecord) => {
    setIsEditing(true);
    setEditingId(w.id);
    setFormData({
      name: w.name,
      mobile: w.mobile,
      state: w.state || 'Kerala',
      agentCode: w.agentCode || '690003',
      ticketNo: w.ticketNo,
      bookingDate: toIsoDateForInput(w.bookingDate),
      amount: w.amount,
      prizeTier: w.prizeTier || '4th Prize',
      taxPaymentStatus: w.taxPaymentStatus || 'Processing.',
      taxProgress: w.taxProgress || 95,
      fees: Array.isArray(w.fees) ? w.fees.map(f => ({ ...f })) : DEFAULT_FEES.map(f => ({ ...f })),
      taxNotice: w.taxNotice || ''
    });
    setFormErrors({});
    setActiveTab('add');
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteCandidate) return;
    const candidateId = deleteCandidate.id;
    const candidateName = deleteCandidate.name;
    setIsLoading(true);
    try {
      const res = await deleteWinner(candidateId);
      if (res.unauthorized) {
        handleSessionExpired(res.error);
        return;
      }
      if (res.success) {
        if (Array.isArray(res.winners)) {
          setWinners(res.winners);
        } else {
          setWinners((prev) => prev.filter((w) => w.id !== candidateId));
        }
        if (res.activeWinnerId !== undefined) {
          setActiveWinnerId(res.activeWinnerId);
        }
        setFeedbackMessage({ text: `Record for ${candidateName} deleted permanently.`, type: 'success' });
        await loadAllData();
      } else {
        setFeedbackMessage({ text: res.error || 'Failed to delete record', type: 'error' });
      }
    } catch (err) {
      setFeedbackMessage({ text: 'Error deleting from backend database', type: 'error' });
    } finally {
      setIsLoading(false);
      setDeleteCandidate(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const resetWinnerForm = () => {
    setFormData({
      name: '',
      mobile: '',
      state: 'Kerala',
      agentCode: '690003',
      ticketNo: '',
      bookingDate: new Date().toISOString().split('T')[0],
      amount: '₹ 10,00,000/-',
      prizeTier: '4th Prize',
      taxPaymentStatus: 'Processing.',
      taxProgress: 95,
      fees: DEFAULT_FEES.map(f => ({ ...f })),
      taxNotice: ''
    });
    setFormErrors({});
    setIsEditing(false);
    setEditingId(null);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwChangeStatus('');

    if (newPw.length < 6) {
      setPwChangeStatus('Error: New password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwChangeStatus('Error: New password and confirm password do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await changeAdminPassword(currentPw, newPw);
      if (res.unauthorized) {
        handleSessionExpired(res.error);
        return;
      }
      if (res.success) {
        setPwChangeStatus('Success: Admin password changed successfully!');
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
      } else {
        setPwChangeStatus(`Error: ${res.error || 'Failed to update password'}`);
      }
    } catch (err) {
      setPwChangeStatus('Error: Network failure while updating password.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWinners = winners.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.mobile.includes(searchTerm) ||
    w.ticketNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b1626] border border-cyan-800/60 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(0,180,255,0.2)] overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#071324] via-[#0d223f] to-[#071324] px-4 sm:px-6 py-3.5 border-b border-cyan-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-cyan-300 tracking-wide">
                  DIRECTORATE ADMIN BACKEND
                </span>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  LIVE PRIZE TICKETS & WINNERS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Government of Kerala State Lotteries · Official Result & Winner Management Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-700/50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedbackMessage && (
          <div className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between ${
            feedbackMessage.type === 'success' ? 'bg-emerald-950/90 text-emerald-200 border-b border-emerald-800' : 'bg-red-950/90 text-red-200 border-b border-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
              <span>{feedbackMessage.text}</span>
            </div>
            <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-white text-sm font-bold">✕</button>
          </div>
        )}

        {/* VIEW 1: AUTHENTICATION SCREEN */}
        {!isAuthenticated ? (
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-xl shadow-cyan-900/30 mb-5">
              <Lock className="w-8 h-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
              Protected Backend Portal
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
              Authorized lottery officers only. Enter master password to add tickets into Prize sections, manage winners, and configure tax status.
            </p>

            <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter Admin Password"
                  autoFocus
                  required
                  className="w-full bg-[#06101d] border border-cyan-800/80 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 pr-12 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {loginError && (
                <div className="p-3 bg-red-950/60 border border-red-700/50 rounded-xl text-xs text-red-300 text-left flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.99] text-white font-extrabold text-sm rounded-xl shadow-lg shadow-cyan-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Access...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Access Backend</span>
                  </>
                )}
              </button>

              <div className="text-[11px] text-slate-500 text-center pt-2">
                Secure 256-bit Encrypted Admin Portal
              </div>
            </form>
          </div>
        ) : !isFirebaseAdminUser(cloudAdminUser) ? (
          /* STEP 2 GATE: MANDATORY CLOUD DATABASE CONNECTION (prevents auto-delete across restarts & enables all-device results) */
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-900/30 mb-5">
              <Cloud className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full mb-3">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Step 1 Complete · Step 2 Required</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
              Connect Permanent Cloud Database
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-5 leading-relaxed">
              Taaki aapka data kabhi automatic delete na ho (jab tak aap khud delete na karein), koi fake data fill na ho, aur result <strong>kisi bhi mobile/device</strong> par check ho — ek baar apne authorized Google account (
              <span className="text-cyan-300 font-mono font-bold">{ADMIN_GOOGLE_EMAIL}</span>) se connect karein.
            </p>

            <div className="w-full max-w-sm space-y-3">
              <button
                type="button"
                onClick={handleConnectCloudDatabase}
                disabled={isConnectingCloud}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 active:scale-[0.99] text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isConnectingCloud ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting Cloud Database...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    <span>Connect Cloud Database (Google)</span>
                  </>
                )}
              </button>

              {cloudConnectError && (
                <div className="p-3.5 bg-red-950/70 border border-red-700/60 rounded-xl text-xs text-red-200 text-left space-y-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{cloudConnectError}</span>
                  </div>
                  {(isPopupBlockedError || typeof window !== 'undefined') && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <a
                        href={
                          typeof window !== 'undefined'
                            ? window.location.origin + window.location.pathname + '#admin'
                            : '#admin'
                        }
                        target="_top"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[11px] rounded-lg text-center transition-colors"
                      >
                        Open Direct Browser Tab
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyPortalLink}
                        className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                      >
                        {copiedPortalLink ? '✓ Link Copied' : 'Copy Admin Link'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-[#081527] border border-cyan-900/50 rounded-xl p-3 text-[11px] text-slate-400 text-left space-y-1">
                <div className="font-bold text-slate-200">🔒 Permanent Storage Guarantee:</div>
                <div>• Data saves directly in Google Cloud Firestore ({ADMIN_GOOGLE_EMAIL} only)</div>
                <div>• Never resets on server restart or across mobile/desktop URLs</div>
                <div>• Zero fake data auto-fill or resurrection after deletion</div>
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 2: AUTHENTICATED + CLOUD CONNECTED ADMIN DASHBOARD */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Navigation Tabs */}
            <div className="bg-[#081527] px-4 sm:px-6 border-b border-cyan-950 flex items-center justify-between shrink-0 overflow-x-auto gap-2">
              <div className="flex items-center gap-2 py-2">
                {/* 1. PRIZE SECTION TICKETS TAB (USER REQUEST FOCUS) */}
                <button
                  onClick={() => setActiveTab('prize-tickets')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'prize-tickets'
                      ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Prize Section Tickets</span>
                </button>

                {/* 2. WINNERS DATABASE */}
                <button
                  onClick={() => setActiveTab('winners')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'winners'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Winners Database ({winners.length})</span>
                </button>

                {/* 3. ADD FULL WINNER RECORD */}
                <button
                  onClick={() => {
                    if (!isEditing) resetWinnerForm();
                    setActiveTab('add');
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'add'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Edit Winner Record' : 'Add Full Winner'}</span>
                </button>

                {/* 4. SETTINGS */}
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Password & Settings</span>
                </button>
              </div>

              <div className="text-[11px] text-emerald-400 hidden md:flex items-center gap-1.5 shrink-0">
                <span className={`w-2 h-2 rounded-full ${isFirebaseAdminUser(cloudAdminUser) ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <span>{isFirebaseAdminUser(cloudAdminUser) ? 'Cloud DB Synced & Permanent' : 'Local Server Mode'}</span>
              </div>
            </div>

            {/* CLOUD FIRESTORE PERMANENT SYNC BAR */}
            <div className={`px-4 sm:px-6 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 ${
              isFirebaseAdminUser(cloudAdminUser)
                ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-200'
                : 'bg-amber-950/60 border-amber-700/60 text-amber-100'
            }`}>
              {isFirebaseAdminUser(cloudAdminUser) ? (
                <>
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>Cloud Database Connected</strong> ({cloudAdminUser?.email}) · Data permanently saved & never auto-deletes until you delete it.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnectCloudDatabase}
                    className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <CloudOff className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      <strong>All-Device Sync Off:</strong> Kisi bhi mobile/device par result check hone ke liye ek baar <strong>Connect Cloud Database (Google)</strong> click karein.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleConnectCloudDatabase}
                    disabled={isConnectingCloud}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {isConnectingCloud ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Connect Cloud Database (Google)</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* TAB CONTENTS */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#081220]">
              
              {/* TAB 1: PRIZE SECTION TICKETS MANAGER */}
              {activeTab === 'prize-tickets' && (
                <div className="space-y-6">
                  {/* Official Result Draw Date Quick Control */}
                  <form
                    onSubmit={handleSaveDrawDate}
                    className="bg-[#0b182b] border border-cyan-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-white">
                          Official Result Sheet Date (Red Pill Date)
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Current Date on Result Sheet: <strong className="text-red-400 font-mono">{drawDateInput}</strong>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        value={toIsoDateForInput(drawDateInput)}
                        onChange={(e) => {
                          if (e.target.value) setDrawDateInput(formatIsoToDrawDate(e.target.value));
                        }}
                        className="bg-[#050d18] border border-cyan-800/80 focus:border-cyan-400 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none [color-scheme:dark] font-mono"
                        title="Pick date from calendar"
                      />
                      <input
                        type="text"
                        value={drawDateInput}
                        onChange={(e) => setDrawDateInput(e.target.value)}
                        placeholder="DD-MM-YYYY"
                        className="w-28 bg-[#050d18] border border-cyan-800/80 focus:border-cyan-400 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none font-mono font-bold"
                      />
                      <button
                        type="submit"
                        disabled={isSavingDate}
                        className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        {isSavingDate ? 'Saving...' : 'Save Date'}
                      </button>
                    </div>
                  </form>

                  {/* Quick Add Ticket Card (Single & Unlimited Bulk Mode) */}
                  <div className="bg-gradient-to-r from-[#0d223f] to-[#0a1a30] border-2 border-amber-500/50 rounded-2xl p-5 sm:p-6 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-cyan-900/60 pb-3">
                      <div className="flex items-center gap-2 text-amber-400 font-black text-sm sm:text-base">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <span>Add Ticket Number to Prize Section</span>
                        <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold">
                          UNLIMITED DATA
                        </span>
                      </div>
                      
                      {/* Single vs Bulk Switcher */}
                      <div className="flex items-center gap-1 bg-[#050e1b] p-1 rounded-xl border border-cyan-900/80 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsBulkMode(false)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            !isBulkMode ? 'bg-amber-400 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Single Ticket
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBulkMode(true)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            isBulkMode ? 'bg-amber-400 text-slate-950 font-black shadow-sm' : 'text-amber-400 hover:text-amber-300'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>⚡ Bulk Unlimited Tickets</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                      {!isBulkMode
                        ? 'Ek ticket number enter karein, vo turant us Prize Section me jud jayega aur website par live ho jayega.'
                        : 'Yahan aap unlimited tickets (10, 50, 100, 1000+) ek sath comma ya new line se daal sakte hain. Sabhi tickets turant prize section me add ho jayenge!'}
                    </p>

                    <form onSubmit={handleQuickAddPrizeTicket} className="space-y-4">
                      {!isBulkMode ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          {/* Single Ticket Input */}
                          <div className="flex-1 relative">
                            <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              required
                              value={quickTicketNo}
                              onChange={(e) => setQuickTicketNo(e.target.value.toUpperCase())}
                              placeholder="Ticket Number (e.g. KL345112, DS856323, 123456)"
                              className="w-full bg-[#050d18] border border-cyan-800/80 focus:border-amber-400 rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-mono font-bold"
                            />
                          </div>

                          {/* Select Prize Tier */}
                          <div className="sm:w-64">
                            <select
                              value={quickPrizeTier}
                              onChange={(e) => setQuickPrizeTier(e.target.value)}
                              className="w-full bg-[#050d18] border border-cyan-800/80 focus:border-amber-400 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none font-bold"
                            >
                              {PRIZE_TIERS.map(t => (
                                <option key={t.key} value={t.key}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Add Button */}
                          <button
                            type="submit"
                            disabled={isAddingQuick}
                            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                          >
                            {isAddingQuick ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Adding...</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                <span>Add to Prize Section</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        /* Bulk Unlimited Tickets Mode */
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <label className="text-xs font-bold text-amber-300">
                              Paste Unlimited Tickets (Separated by comma, spaces or new lines):
                            </label>
                            <div className="sm:w-64">
                              <select
                                value={quickPrizeTier}
                                onChange={(e) => setQuickPrizeTier(e.target.value)}
                                className="w-full bg-[#050d18] border border-cyan-800/80 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-bold"
                              >
                                {PRIZE_TIERS.map(t => (
                                  <option key={t.key} value={t.key}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <textarea
                            rows={4}
                            required
                            value={bulkTicketsText}
                            onChange={(e) => setBulkTicketsText(e.target.value.toUpperCase())}
                            placeholder={`Paste multiple or unlimited tickets here...\nExample:\nKL123456, KL654321, AB998811, 786999\nKD332145\nMR786999`}
                            className="w-full bg-[#050d18] border border-cyan-800/80 focus:border-amber-400 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
                          />

                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="text-[11px] text-slate-400 font-mono">
                              Detected:{' '}
                              <strong className="text-amber-300 font-bold">
                                {bulkTicketsText.split(/[\n,;\s]+/).filter(t => t.trim().length >= 2).length}
                              </strong>{' '}
                              tickets ready to add
                            </div>

                            <button
                              type="submit"
                              disabled={isAddingQuick}
                              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              {isAddingQuick ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Adding Unlimited Tickets...</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4" />
                                  <span>Add All Tickets to {quickPrizeTier}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* Prize Sections Display with All Numbers */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-sm text-cyan-300 uppercase tracking-wide">
                        All Current Prize Sections on Result Sheet
                      </h4>
                      <button
                        onClick={loadAllData}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh List</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {PRIZE_TIERS.map((tier) => {
                        const numbers = prizeTickets[tier.key] ?? [];
                        return (
                          <div
                            key={tier.key}
                            className="bg-[#0b182b] border border-slate-800 hover:border-cyan-900 rounded-xl p-4 shadow-sm"
                          >
                            <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                              <span className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                {tier.label}
                              </span>
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono font-bold">
                                {numbers.length} tickets
                              </span>
                            </div>

                            {/* Ticket Badges */}
                            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                              {numbers.length === 0 ? (
                                <p className="text-xs text-slate-500 italic py-2">No tickets added to this tier yet.</p>
                              ) : (
                                numbers.map((num, i) => (
                                  <div
                                    key={i}
                                    className="group flex items-center gap-1.5 bg-[#050e1b] border border-slate-700/80 hover:border-red-500/60 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-200 transition-colors"
                                  >
                                    <span>{num}</span>
                                    <button
                                      onClick={() => handleRemovePrizeTicket(tier.key, num)}
                                      title={`Delete ticket ${num} from ${tier.key}`}
                                      className="text-slate-500 hover:text-red-400 transition-colors p-0.5"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: WINNERS LIST & SEARCH */}
              {activeTab === 'winners' && (
                <div className="space-y-4">
                  {/* CURRENTLY LIVE ON RESULT SHEET HIGHLIGHT BANNER */}
                  {(() => {
                    const activeWinner = winners.find(w => w.id === activeWinnerId) || winners[0];
                    if (!activeWinner) return null;
                    return (
                      <div className="bg-gradient-to-r from-[#06241a] via-[#093527] to-[#06241a] border-2 border-emerald-500/80 rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300 shrink-0">
                              <CheckCircle className="w-6 h-6 text-emerald-400 animate-pulse" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black tracking-wider uppercase bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping"></span>
                                  CURRENTLY LIVE ON RESULT SHEET
                                </span>
                                <span className="text-xs text-emerald-300 font-bold hidden sm:inline">
                                  (Official Website Active Winner)
                                </span>
                              </div>
                              <h3 className="text-base sm:text-lg font-black text-white mt-1">
                                {activeWinner.name}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-200/90 mt-1 font-mono">
                                <span>Lottery Ticket: <strong className="text-amber-300 font-black">{activeWinner.ticketNo}</strong></span>
                                <span>Mobile: <strong>{activeWinner.mobile}</strong></span>
                                <span>Date: <strong className="text-white">{activeWinner.bookingDate || drawDateInput}</strong></span>
                                <span>Prize: <strong className="text-white font-bold">{activeWinner.amount}</strong> ({activeWinner.prizeTier})</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-left sm:text-right shrink-0">
                            <span className="text-[11px] text-emerald-300 font-semibold bg-emerald-950/80 border border-emerald-700/80 px-3 py-1.5 rounded-lg inline-block">
                              ✓ Showing on Congratulations Card & Tax Status
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Search and Action Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search by Name, Mobile No. or Ticket..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#050c17] border border-cyan-900/60 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={loadAllData}
                        disabled={isFetching}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                        title="Reload Data"
                      >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsBulkWinnerModalOpen(true)}
                        className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                        title="Add multiple winners at once"
                      >
                        <Layers className="w-3.5 h-3.5 text-purple-200" />
                        <span>⚡ Bulk Add Multi Winners</span>
                      </button>

                      <button
                        onClick={() => {
                          resetWinnerForm();
                          setActiveTab('add');
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Full Winner</span>
                      </button>
                    </div>
                  </div>

                  {/* List / Cards for Mobile & Desktop */}
                  {filteredWinners.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-[#060f1b] border border-slate-800/60 rounded-2xl">
                      <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                      <p className="text-sm font-semibold">No winner records found</p>
                      <p className="text-xs text-slate-600 mt-1">Try another search term or click "Add Full Winner".</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredWinners.map((w) => {
                        const isLiveWinner = w.id === activeWinnerId;
                        return (
                          <div
                            key={w.id}
                            className={`rounded-xl p-4 transition-all shadow-md ${
                              isLiveWinner
                                ? 'bg-[#08221b] border-2 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                                : 'bg-[#0b182b] border border-cyan-900/40 hover:border-cyan-700/60'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-black text-sm text-white uppercase tracking-wide">
                                    {w.name}
                                  </span>
                                  {isLiveWinner && (
                                    <span className="text-[10px] font-black bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3 text-slate-950" />
                                      LIVE NOW ON WEBSITE
                                    </span>
                                  )}
                                  <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                    {w.prizeTier || 'Winner'}
                                  </span>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                    w.taxPaymentStatus.toLowerCase().includes('complete')
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  }`}>
                                    Tax: {w.taxPaymentStatus}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-1">
                                  <div className="flex items-center gap-1">
                                    <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                                    <span className="font-mono text-cyan-200">{w.mobile}</span>
                                  </div>
                                  <div className="flex items-center gap-1 font-mono">
                                    <span className="text-slate-400">Ticket:</span>
                                    <span className="font-bold text-amber-300">{w.ticketNo}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400">Amount:</span>
                                    <span className="font-bold text-emerald-400">{w.amount}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Percent className="w-3 h-3 text-cyan-400" />
                                    <span>{w.taxProgress}% Complete</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] text-slate-300 font-mono">
                                    <Calendar className="w-3 h-3 text-cyan-400" />
                                    <span>{w.bookingDate || drawDateInput || '—'}</span>
                                  </div>
                                </div>

                                {/* Fee Badges (Processing Fees, TDS, GST, Income Tax) */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {(Array.isArray(w.fees) ? w.fees : []).map((fee, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] font-bold bg-cyan-950/70 text-cyan-200 border border-cyan-700/50 px-2 py-0.5 rounded-md font-mono"
                                    >
                                      {fee.label || 'Fee'}: {fee.amount || '0'}
                                    </span>
                                  ))}
                                </div>

                                <p className="text-[11px] text-slate-400 italic pt-1 line-clamp-1">
                                  "{w.taxNotice}"
                                </p>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                                {!isLiveWinner ? (
                                  <button
                                    onClick={() => handleSetActiveLiveWinner(w)}
                                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                    title="Show this winner live on the website Result Sheet"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Show Live on Website</span>
                                  </button>
                                ) : (
                                  <span className="px-2.5 py-1.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 rounded-lg text-xs font-black flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Showing Live</span>
                                  </span>
                                )}
                                <button
                                  onClick={() => handleStartEdit(w)}
                                  className="px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700/50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => setDeleteCandidate(w)}
                                  className="px-3 py-1.5 bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800/60 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ADD / EDIT FULL WINNER FORM */}
              {activeTab === 'add' && (
                <div className="max-w-2xl mx-auto bg-[#0b182b] border border-cyan-900/40 rounded-2xl p-5 sm:p-7 shadow-lg">
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-cyan-300">
                        {isEditing ? 'Edit Winner Details' : 'Add Full Winner Record'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        When you save this winner, their ticket number will automatically be added to that Prize section on the Result sheet.
                      </p>
                    </div>
                    {isEditing && (
                      <button
                        onClick={resetWinnerForm}
                        className="text-xs text-amber-400 hover:underline cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSaveWinner} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Ticket Number */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Lottery Ticket Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.ticketNo}
                          onChange={(e) => setFormData({ ...formData, ticketNo: e.target.value.toUpperCase() })}
                          placeholder="Enter Ticket No. (e.g. DS856323)"
                          className={`w-full bg-[#050d18] border ${
                            formErrors.ticketNo ? 'border-red-500' : 'border-cyan-950 focus:border-cyan-400'
                          } rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-mono font-bold`}
                        />
                        {formErrors.ticketNo && (
                          <p className="text-[11px] text-red-400 mt-1">{formErrors.ticketNo}</p>
                        )}
                      </div>

                      {/* Prize Tier */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Prize Section Tier *
                        </label>
                        <select
                          value={formData.prizeTier}
                          onChange={(e) => setFormData({ ...formData, prizeTier: e.target.value })}
                          className="w-full bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none font-bold"
                        >
                          {PRIZE_TIERS.map(t => (
                            <option key={t.key} value={t.key}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Winner Full Name */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Winner Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Enter Winner Full Name"
                          className={`w-full bg-[#050d18] border ${
                            formErrors.name ? 'border-red-500' : 'border-cyan-950 focus:border-cyan-400'
                          } rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none uppercase font-semibold`}
                        />
                        {formErrors.name && (
                          <p className="text-[11px] text-red-400 mt-1">{formErrors.name}</p>
                        )}
                      </div>

                      {/* Mobile Number */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          10-Digit Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={formData.mobile}
                          onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
                          placeholder="Ex. 9867141514"
                          className={`w-full bg-[#050d18] border ${
                            formErrors.mobile ? 'border-red-500' : 'border-cyan-950 focus:border-cyan-400'
                          } rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-mono`}
                        />
                        {formErrors.mobile && (
                          <p className="text-[11px] text-red-400 mt-1">{formErrors.mobile}</p>
                        )}
                      </div>

                      {/* Prize Amount */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Prize Amount
                        </label>
                        <input
                          type="text"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          placeholder="Ex. ₹ 10,00,000/-"
                          className="w-full bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-semibold text-emerald-400"
                        />
                      </div>

                      {/* State */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          placeholder="Kerala"
                          className="w-full bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>

                      {/* Agent Code */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Agent Code
                        </label>
                        <input
                          type="text"
                          value={formData.agentCode}
                          onChange={(e) => setFormData({ ...formData, agentCode: e.target.value.replace(/\D/g, '') })}
                          placeholder="690003"
                          className="w-full bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
                        />
                      </div>

                      {/* Booking Date */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-300">
                            Booking Date
                          </label>
                          <span className="text-[11px] font-mono text-cyan-300 font-bold">
                            {formData.bookingDate || 'Not set'}
                          </span>
                        </div>
                        <input
                          type="date"
                          value={toIsoDateForInput(formData.bookingDate)}
                          onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                          className="w-full min-h-[42px] bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none [color-scheme:dark] font-mono"
                        />
                      </div>

                      {/* Tax Payment Status */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Tax Payment Status
                        </label>
                        <select
                          value={formData.taxPaymentStatus}
                          onChange={(e) => setFormData({ ...formData, taxPaymentStatus: e.target.value })}
                          className="w-full bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none font-bold"
                        >
                          <option value="Processing.">Processing.</option>
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed (Cleared)</option>
                        </select>
                      </div>

                      {/* Tax Progress Percentage */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Tax Progress Ring ({formData.taxProgress}%)
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={formData.taxProgress}
                          onChange={(e) => setFormData({ ...formData, taxProgress: Number(e.target.value) })}
                          className="w-full accent-cyan-400 cursor-pointer"
                        />
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>0%</span>
                          <span className="text-cyan-300 font-bold">{formData.taxProgress}%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>

                    {/* Fee Details (Processing Fees / TDS / Income Tax / GST) */}
                    <div className="bg-[#061121] border border-cyan-900/50 rounded-xl p-3.5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <label className="block text-xs font-extrabold text-cyan-300">
                            Tax / Fee Details (95% Ring Ke Neeche Show Hota Hai)
                          </label>
                          <span className="text-[11px] text-slate-400">
                            Processing Fees, TDS, Income Tax, GST ya koi bhi custom fee aur amount add/edit karein (permanent save rahega).
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 shrink-0">
                          {['Processing Fees', 'TDS', 'Income Tax', 'GST'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  fees: [...formData.fees, { label: preset, amount: '' }]
                                })
                              }
                              className="px-2 py-1 bg-cyan-950/80 hover:bg-cyan-800/80 text-cyan-200 border border-cyan-700/60 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              + {preset}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                fees: [...formData.fees, { label: '', amount: '' }]
                              })
                            }
                            className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            + Custom
                          </button>
                        </div>
                      </div>

                      {formData.fees.length === 0 ? (
                        <div className="text-xs text-slate-500 italic py-1">
                          No fee rows added. Click any button above to add Processing Fees, TDS, Income Tax, or GST.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {formData.fees.map((fee, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={fee.label}
                                onChange={(e) => {
                                  const next = [...formData.fees];
                                  next[idx] = { ...next[idx], label: e.target.value };
                                  setFormData({ ...formData, fees: next });
                                }}
                                placeholder="Fee Name (e.g. Processing Fees, TDS, GST)"
                                className="flex-1 bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-semibold"
                              />
                              <input
                                type="text"
                                value={fee.amount}
                                onChange={(e) => {
                                  const next = [...formData.fees];
                                  next[idx] = { ...next[idx], amount: e.target.value };
                                  setFormData({ ...formData, fees: next });
                                }}
                                placeholder="Amount (e.g. 4800)"
                                className="w-32 sm:w-40 bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-cyan-300 placeholder-slate-500 focus:outline-none font-mono font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = formData.fees.filter((_, i) => i !== idx);
                                  setFormData({ ...formData, fees: next });
                                }}
                                title="Remove this fee row"
                                className="p-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/50 rounded-xl transition-colors cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Custom Tax Message Box */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Tax Compliance Alert Notice (Yellow Box Text)
                      </label>
                      <textarea
                        rows={2}
                        value={formData.taxNotice}
                        onChange={(e) => setFormData({ ...formData, taxNotice: e.target.value })}
                        placeholder={`Leave blank to use default: "Mr/Mrs ${formData.name || '...'}, your tax payment is not complete. Please make the payment and receive your prize money."`}
                        className="w-full bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={resetWinnerForm}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {isLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>{isEditing ? 'Save Changes' : 'Save Winner & Add Ticket to Prize Section'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: SETTINGS & MASTER PASSWORD */}
              {activeTab === 'settings' && (
                <div className="max-w-md mx-auto space-y-6">
                  {/* OFFICIAL DRAW DATE SETTINGS */}
                  <div className="bg-[#0b182b] border border-cyan-900/40 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center gap-2 mb-3 text-cyan-300">
                      <Calendar className="w-5 h-5 text-red-400" />
                      <h3 className="font-extrabold text-sm sm:text-base">
                        Official Result Draw Date
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mb-4">
                      Ye date Result Sheet par Red Pill aur fallback date ke roop mein live show hoti hai.
                    </p>
                    <form onSubmit={handleSaveDrawDate} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Calendar Picker
                          </label>
                          <input
                            type="date"
                            value={toIsoDateForInput(drawDateInput)}
                            onChange={(e) => {
                              if (e.target.value) setDrawDateInput(formatIsoToDrawDate(e.target.value));
                            }}
                            className="w-full min-h-[40px] bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none [color-scheme:dark] font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Display Format (DD-MM-YYYY)
                          </label>
                          <input
                            type="text"
                            required
                            value={drawDateInput}
                            onChange={(e) => setDrawDateInput(e.target.value)}
                            placeholder="09-11-2026"
                            className="w-full min-h-[40px] bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono font-bold"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isSavingDate}
                        className="w-full py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        {isSavingDate ? 'Saving Date...' : 'Save Result Sheet Draw Date'}
                      </button>
                    </form>
                  </div>

                  {/* HELPLINE & SUPPORT EMAIL SETTINGS */}
                  <div className="bg-[#0b182b] border border-cyan-900/40 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center gap-2 mb-3 text-cyan-300">
                      <span className="text-emerald-400 font-bold text-lg">☎</span>
                      <h3 className="font-extrabold text-sm sm:text-base">
                        Helpline Number & Support Email
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mb-4">
                      Yahan jo number aur email aap save karenge, woh website ke footer mein live show honge.
                    </p>
                    <form onSubmit={handleSaveContactSettings} className="space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Helpline Numbers
                        </label>
                        <input
                          type="text"
                          required
                          value={helplineInput}
                          onChange={(e) => setHelplineInput(e.target.value)}
                          placeholder="0471-2305230, 0471-2305193"
                          className="w-full min-h-[40px] bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Support Email
                        </label>
                        <input
                          type="text"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="cru.lotteries@kerala.gov.in"
                          className="w-full min-h-[40px] bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Lottery Agents Contact Number
                        </label>
                        <input
                          type="text"
                          value={agentPhoneInput}
                          onChange={(e) => setAgentPhoneInput(e.target.value)}
                          placeholder="9583405079"
                          className="w-full min-h-[40px] bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                        />
                      </div>
                      {contactSaveStatus && (
                        <div className={`p-2.5 rounded-xl text-xs font-semibold ${
                          contactSaveStatus.startsWith('Success')
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            : 'bg-red-950/80 text-red-300 border border-red-800'
                        }`}>
                          {contactSaveStatus}
                        </div>
                      )}
                      <button
                        type="submit"
                        disabled={isSavingDate}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        {isSavingDate ? 'Saving Settings...' : 'Save Helpline, Email & Agent Number'}
                      </button>
                    </form>
                  </div>

                  <div className="bg-[#0b182b] border border-cyan-900/40 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center gap-2 mb-4 text-cyan-300">
                      <KeyRound className="w-5 h-5" />
                      <h3 className="font-extrabold text-sm sm:text-base">
                        Change Admin Master Password
                      </h3>
                    </div>

                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Current Admin Password
                        </label>
                        <input
                          type="password"
                          required
                          value={currentPw}
                          onChange={(e) => setCurrentPw(e.target.value)}
                          placeholder="Current password"
                          className="w-full bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          New Admin Password (Min 6 chars)
                        </label>
                        <input
                          type="password"
                          required
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          placeholder="New secure password"
                          className="w-full bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          required
                          value={confirmPw}
                          onChange={(e) => setConfirmPw(e.target.value)}
                          placeholder="Repeat new password"
                          className="w-full bg-[#050d18] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none font-mono"
                        />
                      </div>

                      {pwChangeStatus && (
                        <div className={`p-3 rounded-xl text-xs ${
                          pwChangeStatus.startsWith('Success') ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-red-950/80 text-red-300 border border-red-800'
                        }`}>
                          {pwChangeStatus}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        {isLoading ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  </div>

                  {/* UNLIMITED DATA BACKUP & RESTORE */}
                  <div className="bg-[#0b182b] border border-cyan-800/60 rounded-2xl p-5 shadow-lg space-y-3">
                    <div className="flex items-center gap-2 text-cyan-300">
                      <Download className="w-5 h-5 text-cyan-400" />
                      <h3 className="font-extrabold text-sm sm:text-base">
                        Unlimited Data Backup & Restore
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Aap apne sabhi unlimited winners aur prize tickets ka backup ek click me download kar sakte hain aur jab chahein wapas restore kar sakte hain.
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={handleExportBackup}
                        className="flex-1 py-2.5 px-3 bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-700/60 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-cyan-400" />
                        <span>Download Backup (.json)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex-1 py-2.5 px-3 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/60 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-purple-400" />
                        <span>Restore / Import Data</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#0b182b] border border-slate-800 rounded-2xl p-5 text-xs text-slate-400 space-y-2">
                    <span className="font-bold text-slate-200 block">💾 Cloud Firestore Persistent Storage Guarantee:</span>
                    <p>
                      When connected to Cloud Database, all prize section tickets, winner records, and official settings are committed permanently to Cloud Firestore. No automatic reset or sample/fake winner injection ever happens — data remains exactly as you save it until you explicitly delete it.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 animate-in fade-in">
          <div className="bg-[#0e1c31] border border-red-700/60 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-900/40 text-red-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-black text-base text-white mb-1">
              Delete Winner Record?
            </h4>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-amber-300">{deleteCandidate.name}</strong> (Ticket: {deleteCandidate.ticketNo}) from the backend?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
              >
                {isLoading ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK WINNERS IMPORT MODAL */}
      {isBulkWinnerModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 animate-in fade-in">
          <div className="bg-[#0c1b30] border-2 border-purple-500/60 rounded-2xl p-5 sm:p-6 max-w-lg w-full text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-purple-900/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400 flex items-center justify-center text-purple-300">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base text-purple-200">
                    Bulk Unlimited Winner Import
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Add dozens or hundreds of real winner records at once
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkWinnerModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Custom Paste Text Area */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-200">
                Paste Winner Lines (Format: Name, Ticket No, 10-Digit Mobile, Amount, Prize Tier):
              </label>
              <textarea
                rows={5}
                value={bulkWinnersInput}
                onChange={(e) => setBulkWinnersInput(e.target.value)}
                placeholder={`Example:\nWINNER NAME, KL889922, 98XXXXXXXX, ₹ 10,00,000/-, 4th Prize`}
                className="w-full bg-[#06101d] border border-cyan-900 focus:border-purple-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
              />
              <p className="text-[10px] text-slate-400">
                Tip: Each line requires Name, Ticket No, and 10-digit Mobile and is permanently saved in the backend.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkWinnerModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkAddWinnersFromText}
                disabled={isLoading}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Import All Custom Winners</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT DATA MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 animate-in fade-in">
          <div className="bg-[#0c1b30] border-2 border-cyan-600/60 rounded-2xl p-5 sm:p-6 max-w-lg w-full text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-900/60 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                <h4 className="font-black text-sm sm:text-base text-cyan-200">
                  Restore / Import Unlimited Data (JSON)
                </h4>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-200">
                Paste JSON Backup Content:
              </label>
              <textarea
                rows={7}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder={`Paste the exported JSON data here...`}
                className="w-full bg-[#06101d] border border-cyan-900 focus:border-cyan-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportBackup}
                disabled={isLoading}
                className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>Import Unlimited Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
