export interface LotteryScheme {
  id: string;
  name: string;
  code: string;
  drawDay: string;
  ticketPrice: number;
  firstPrize: string;
  secondPrize: string;
  thirdPrize: string;
  consolationPrize: string;
  status: 'Latest' | 'Upcoming' | 'Drawn';
  drawDate: string;
  drawNumber: string;
  firstPrizeTicket: string;
  secondPrizeTicket: string;
  consolationTickets: string[];
  winningNumbers: {
    prize: string;
    amount: string;
    numbers: string[];
  }[];
}

export interface LotteryOrder {
  orderId: string;
  customerName: string;
  phone: string;
  schemeName: string;
  schemeCode: string;
  ticketCount: number;
  ticketNumbers: string[];
  totalAmount: number;
  bookingDate: string;
  drawDate: string;
  status: 'Booked' | 'Verified' | 'Scanned' | 'Dispatched' | 'Delivered';
  agentName: string;
  agentCode: string;
  postalTracking?: string;
  courier: string;
  deliveryAddress: string;
  history: {
    status: string;
    time: string;
    description: string;
  }[];
}

export interface LotteryAgent {
  id: string;
  code: string;
  agencyName: string;
  agentName: string;
  district: string;
  address: string;
  phone: string;
  licenseNumber: string;
  status: 'Active Authorized' | 'Verified';
  rating: number;
}

export interface NewsNotice {
  id: string;
  dateDay: string;
  dateMonth: string;
  title: string;
  category: string;
  subtitle: string;
  fullDate: string;
  gazetteNumber: string;
  summary: string;
  content: string[];
}

export const LOTTERY_SCHEMES: LotteryScheme[] = [
  {
    id: 'ff-118',
    name: 'Fifty-Fifty',
    code: 'FF-118',
    drawDay: 'Wednesday',
    ticketPrice: 50,
    firstPrize: '₹ 1,00,00,000 (1 Crore)',
    secondPrize: '₹ 10,00,000 (10 Lakhs)',
    thirdPrize: '₹ 5,000',
    consolationPrize: '₹ 8,000',
    status: 'Latest',
    drawDate: '2026-11-11',
    drawNumber: 'FF-118',
    firstPrizeTicket: 'FW 482910',
    secondPrizeTicket: 'FX 918234',
    consolationTickets: ['FA 482910', 'FB 482910', 'FC 482910', 'FD 482910', 'FE 482910'],
    winningNumbers: [
      { prize: '1st Prize (₹1,00,00,000)', amount: '₹1 Crore', numbers: ['FW 482910'] },
      { prize: 'Consolation Prize (₹8,000)', amount: '₹8,000', numbers: ['FA 482910', 'FB 482910', 'FC 482910', 'FD 482910', 'FE 482910', 'FF 482910', 'FG 482910', 'FH 482910', 'FJ 482910', 'FK 482910'] },
      { prize: '2nd Prize (₹10,00,000)', amount: '₹10 Lakhs', numbers: ['FX 918234'] },
      { prize: '3rd Prize (₹5,000)', amount: '₹5,000', numbers: ['0148', '1923', '2841', '3910', '4821', '5902', '6712', '7841', '8912', '9341'] },
      { prize: '4th Prize (₹2,000)', amount: '₹2,000', numbers: ['0832', '1421', '2309', '3890', '4120', '5812', '6290', '7109', '8401', '9102'] },
      { prize: '5th Prize (₹1,000)', amount: '₹1,000', numbers: ['0291', '1032', '2194', '3021', '4912', '5120', '6891', '7231', '8129', '9403'] },
      { prize: '6th Prize (₹500)', amount: '₹500', numbers: ['012', '194', '281', '390', '482', '591', '684', '719', '820', '931'] },
      { prize: '7th Prize (₹100)', amount: '₹100', numbers: ['08', '19', '24', '35', '41', '58', '62', '77', '83', '95'] }
    ]
  },
  {
    id: 'kn-520',
    name: 'Karunya Plus',
    code: 'KN-520',
    drawDay: 'Thursday',
    ticketPrice: 40,
    firstPrize: '₹ 80,00,000 (80 Lakhs)',
    secondPrize: '₹ 10,00,000 (10 Lakhs)',
    thirdPrize: '₹ 1,00,000',
    consolationPrize: '₹ 8,000',
    status: 'Upcoming',
    drawDate: '2026-11-12',
    drawNumber: 'KN-520',
    firstPrizeTicket: 'PW 319402',
    secondPrizeTicket: 'PX 782014',
    consolationTickets: ['PA 319402', 'PB 319402', 'PC 319402', 'PD 319402'],
    winningNumbers: [
      { prize: '1st Prize (₹80,00,000)', amount: '₹80 Lakhs', numbers: ['PW 319402'] },
      { prize: 'Consolation Prize (₹8,000)', amount: '₹8,000', numbers: ['PA 319402', 'PB 319402', 'PC 319402', 'PD 319402', 'PE 319402'] },
      { prize: '2nd Prize (₹10,00,000)', amount: '₹10 Lakhs', numbers: ['PX 782014'] },
      { prize: '3rd Prize (₹1,00,000)', amount: '₹1 Lakh', numbers: ['0912', '1823', '2734', '3841', '4910', '5802', '6791', '7812', '8920', '9412'] }
    ]
  },
  {
    id: 'nr-380',
    name: 'Nirmal',
    code: 'NR-380',
    drawDay: 'Friday',
    ticketPrice: 40,
    firstPrize: '₹ 70,00,000 (70 Lakhs)',
    secondPrize: '₹ 10,00,000 (10 Lakhs)',
    thirdPrize: '₹ 1,00,000',
    consolationPrize: '₹ 8,000',
    status: 'Upcoming',
    drawDate: '2026-11-13',
    drawNumber: 'NR-380',
    firstPrizeTicket: 'NR 591240',
    secondPrizeTicket: 'NR 104829',
    consolationTickets: ['NA 591240', 'NB 591240', 'NC 591240'],
    winningNumbers: [
      { prize: '1st Prize (₹70,00,000)', amount: '₹70 Lakhs', numbers: ['NR 591240'] },
      { prize: 'Consolation Prize (₹8,000)', amount: '₹8,000', numbers: ['NA 591240', 'NB 591240', 'NC 591240', 'ND 591240'] },
      { prize: '2nd Prize (₹10,00,000)', amount: '₹10 Lakhs', numbers: ['NR 104829'] }
    ]
  },
  {
    id: 'w-790',
    name: 'Win-Win',
    code: 'W-790',
    drawDay: 'Monday',
    ticketPrice: 40,
    firstPrize: '₹ 75,00,000 (75 Lakhs)',
    secondPrize: '₹ 5,00,000 (5 Lakhs)',
    thirdPrize: '₹ 1,00,000',
    consolationPrize: '₹ 8,000',
    status: 'Drawn',
    drawDate: '2026-11-09',
    drawNumber: 'W-790',
    firstPrizeTicket: 'WN 672019',
    secondPrizeTicket: 'WP 481920',
    consolationTickets: ['WA 672019', 'WB 672019', 'WC 672019', 'WD 672019'],
    winningNumbers: [
      { prize: '1st Prize (₹75,00,000)', amount: '₹75 Lakhs', numbers: ['WN 672019'] },
      { prize: '2nd Prize (₹5,00,000)', amount: '₹5 Lakhs', numbers: ['WP 481920'] },
      { prize: 'Consolation Prize (₹8,000)', amount: '₹8,000', numbers: ['WA 672019', 'WB 672019', 'WC 672019'] }
    ]
  },
  {
    id: 'bumper-br99',
    name: 'Summer Bumper 2026',
    code: 'BR-99',
    drawDay: 'Mega Draw',
    ticketPrice: 250,
    firstPrize: '₹ 10,00,00,000 (10 Crore)',
    secondPrize: '₹ 50,00,000 (50 Lakhs)',
    thirdPrize: '₹ 5,00,000',
    consolationPrize: '₹ 1,00,000',
    status: 'Upcoming',
    drawDate: '2026-12-05',
    drawNumber: 'BR-99',
    firstPrizeTicket: 'SB 294012',
    secondPrizeTicket: 'SC 849102',
    consolationTickets: ['SA 294012', 'SC 294012', 'SD 294012'],
    winningNumbers: [
      { prize: '1st Prize (₹10 Crore)', amount: '₹10 Crore', numbers: ['SB 294012'] },
      { prize: '2nd Prize (₹50 Lakhs)', amount: '₹50 Lakhs', numbers: ['SC 849102'] }
    ]
  }
];

export const INITIAL_ORDERS: LotteryOrder[] = [
  {
    orderId: 'KL-2026-92841',
    customerName: 'Rahul Madhavan',
    phone: '+91 98471 23456',
    schemeName: 'Karunya Plus',
    schemeCode: 'KN-520',
    ticketCount: 3,
    ticketNumbers: ['PA 482911', 'PB 482912', 'PC 482913'],
    totalAmount: 120,
    bookingDate: '10 Nov 2026, 04:30 PM',
    drawDate: '12 Nov 2026 (Thursday 3:00 PM)',
    status: 'Dispatched',
    agentName: 'Sree Padmanabha Agencies',
    agentCode: 'TVM-AGT-1042',
    postalTracking: 'EK892341209IN (Speed Post)',
    courier: 'India Post Speed Post',
    deliveryAddress: 'Flat 4B, Emerald Heights, Sasthamangalam, Thiruvananthapuram - 695010',
    history: [
      { status: 'Order Placed', time: '10 Nov, 04:30 PM', description: 'Counter reservation successful. Ticket serial reserved.' },
      { status: 'Agent Verified', time: '10 Nov, 05:15 PM', description: 'Authorized agent confirmed genuine physical stamp & seal.' },
      { status: 'Barcode Scanned', time: '10 Nov, 06:00 PM', description: 'Physical paper ticket high-res scan uploaded to digital locker.' },
      { status: 'Dispatched', time: '11 Nov, 10:20 AM', description: 'Handed over to India Post Speed Post. Consignment: EK892341209IN' }
    ]
  },
  {
    orderId: 'KL-2026-44102',
    customerName: 'Ananya S. Pillai',
    phone: '+91 94470 88219',
    schemeName: 'Fifty-Fifty',
    schemeCode: 'FF-118',
    ticketCount: 2,
    ticketNumbers: ['FA 912304', 'FB 912305'],
    totalAmount: 100,
    bookingDate: '11 Nov 2026, 09:15 AM',
    drawDate: '11 Nov 2026 (Today 3:00 PM)',
    status: 'Scanned',
    agentName: 'Kochi Central Lottery Distributors',
    agentCode: 'EKM-AGT-4401',
    postalTracking: 'Pending Dispatch',
    courier: 'Express Courier',
    deliveryAddress: 'House No. 12/480, Panampilly Nagar, Kochi, Ernakulam - 682036',
    history: [
      { status: 'Order Placed', time: '11 Nov, 09:15 AM', description: 'Ticket series reserved.' },
      { status: 'Agent Verified', time: '11 Nov, 09:40 AM', description: 'Agent verified and allotted physical tickets.' },
      { status: 'Barcode Scanned', time: '11 Nov, 10:05 AM', description: 'High-res QR & Barcode stored in user locker.' }
    ]
  },
  {
    orderId: 'KL-2026-11893',
    customerName: 'K. Vinod Kumar',
    phone: '+91 98950 41238',
    schemeName: 'Summer Bumper 2026',
    schemeCode: 'BR-99',
    ticketCount: 1,
    ticketNumbers: ['SA 771209'],
    totalAmount: 250,
    bookingDate: '08 Nov 2026, 02:00 PM',
    drawDate: '05 Dec 2026 (Saturday 2:00 PM)',
    status: 'Delivered',
    agentName: 'Malabar Lucky Centre',
    agentCode: 'KKD-AGT-2089',
    postalTracking: 'EK771029481IN',
    courier: 'India Post Speed Post',
    deliveryAddress: 'Near Town Hall, Mananchira, Kozhikode - 673001',
    history: [
      { status: 'Order Placed', time: '08 Nov, 02:00 PM', description: 'Bumper ticket registered.' },
      { status: 'Agent Verified', time: '08 Nov, 03:00 PM', description: 'Physical ticket checked by Kozhikode district office.' },
      { status: 'Barcode Scanned', time: '08 Nov, 04:30 PM', description: 'Digital scan copy registered.' },
      { status: 'Dispatched', time: '09 Nov, 11:00 AM', description: 'Dispatched via Speed Post.' },
      { status: 'Delivered', time: '10 Nov, 03:45 PM', description: 'Physical ticket safely delivered to recipient.' }
    ]
  }
];

export const LOTTERY_AGENTS: LotteryAgent[] = [
  {
    id: 'agt-1',
    code: 'TVM-01',
    agencyName: 'Sree Padmanabha Lucky Centre',
    agentName: 'G. Sivankutty Nair',
    district: 'Thiruvananthapuram',
    address: 'Opp. Ayurveda College, MG Road, Thiruvananthapuram - 695001',
    phone: '9583405079',
    licenseNumber: 'KSLD/TVM/2012/A-4482',
    status: 'Active Authorized',
    rating: 4.9
  },
  {
    id: 'agt-2',
    code: 'EKM-04',
    agencyName: 'Kochi Central Lottery Agency',
    agentName: 'Mathew Varghese',
    district: 'Ernakulam',
    address: 'Menaka Junction, Shanmugham Road, Marine Drive, Kochi - 682031',
    phone: '9583405079',
    licenseNumber: 'KSLD/EKM/2015/A-8812',
    status: 'Active Authorized',
    rating: 4.8
  },
  {
    id: 'agt-3',
    code: 'KKD-11',
    agencyName: 'Malabar Fortune Distributors',
    agentName: 'C. K. Balakrishnan',
    district: 'Kozhikode',
    address: 'Near Moffusil Bus Stand, Rajaji Road, Kozhikode - 673004',
    phone: '9583405079',
    licenseNumber: 'KSLD/KKD/2010/A-1190',
    status: 'Active Authorized',
    rating: 4.9
  },
  {
    id: 'agt-4',
    code: 'TCR-08',
    agencyName: 'Thrissur Pooram Lottery Stall',
    agentName: 'V. Ramanathan',
    district: 'Thrissur',
    address: 'Round South, Near Kuruppam Road, Thrissur - 680001',
    phone: '9583405079',
    licenseNumber: 'KSLD/TCR/2018/A-5591',
    status: 'Active Authorized',
    rating: 4.7
  },
  {
    id: 'agt-5',
    code: 'KLM-03',
    agencyName: 'Ashtamudi Lottery Traders',
    agentName: 'K. R. Mohanan',
    district: 'Kollam',
    address: 'Chinnakada, Clock Tower Complex, Kollam - 691001',
    phone: '9583405079',
    licenseNumber: 'KSLD/KLM/2014/A-3329',
    status: 'Active Authorized',
    rating: 4.8
  },
  {
    id: 'agt-6',
    code: 'KTM-07',
    agencyName: 'Vembanad Lucky Agency',
    agentName: 'Jose Kurian',
    district: 'Kottayam',
    address: 'Baker Junction, MC Road, Kottayam - 686001',
    phone: '9583405079',
    licenseNumber: 'KSLD/KTM/2016/A-7741',
    status: 'Active Authorized',
    rating: 4.8
  },
  {
    id: 'agt-7',
    code: 'PLK-09',
    agencyName: 'Palakkad Fort Lotteries',
    agentName: 'M. Sundaram',
    district: 'Palakkad',
    address: 'TB Road, Near KSRTC Stand, Palakkad - 678014',
    phone: '9583405079',
    licenseNumber: 'KSLD/PLK/2013/A-2294',
    status: 'Active Authorized',
    rating: 4.7
  },
  {
    id: 'agt-8',
    code: 'KNR-14',
    agencyName: 'Theyyam Lottery Agency',
    agentName: 'P. Pavithran',
    district: 'Kannur',
    address: 'Fort Road, Near Railway Station, Kannur - 670001',
    phone: '9583405079',
    licenseNumber: 'KSLD/KNR/2017/A-6602',
    status: 'Active Authorized',
    rating: 4.9
  }
];

export const NEWS_NOTICES: NewsNotice[] = [
  {
    id: 'notice-1',
    dateDay: '22',
    dateMonth: 'NOV',
    title: 'Draw day rescheduled',
    subtitle: 'view details...',
    category: 'Official Gazette Circular',
    fullDate: '22 November 2026',
    gazetteNumber: 'GOK/SLD/CIR-2026/8912',
    summary: 'Draw timing and venue rescheduling for Fifty-Fifty (FF-118) draw at Gorky Bhavan, Thiruvananthapuram.',
    content: [
      'The Directorate of Kerala State Lotteries hereby informs the general public, registered ticket agents, and participants that the weekly draw of Fifty-Fifty (FF-118) has been rescheduled due to government administrative observances.',
      'The draw will now be held at Gorky Bhavan Hall, Near Bakery Junction, Thiruvananthapuram starting at 3:00 PM on 22 November 2026.',
      'Live draw streaming will be accessible through the official portal and authorized Doordarshan Malayalam broadcast. All tickets previously sold with original printed dates remain fully valid for this draw.'
    ]
  },
  {
    id: 'notice-2',
    dateDay: '02',
    dateMonth: 'DEC',
    title: 'Public Notice',
    subtitle: 'View Public Notice...',
    category: 'Statutory Warning & Advisory',
    fullDate: '02 December 2026',
    gazetteNumber: 'GOK/SLD/SEC-ADV/2026/410',
    summary: 'Public advisory on counterfeit tickets, authentic barcode verification, and authorized sale points.',
    content: [
      'The Government of Kerala strictly warns against counterfeit paper lotteries and unauthorized online gambling applications pretending to represent Kerala State Lotteries.',
      'Authentic Kerala State Lottery tickets possess four high-security features: 1) Special tactile watermarked paper, 2) Guilloche security patterns, 3) 2D QR Code verifiable at authorized counters, and 4) Micro-lettered Government seal.',
      'Prizes above ₹1 Lakh must be claimed through nationalized banks or directly submitted to the Directorate of State Lotteries with original ticket and valid KYC documents (Aadhaar/PAN card).'
    ]
  },
  {
    id: 'notice-3',
    dateDay: '01',
    dateMonth: 'DEC',
    title: 'Prize Winners',
    subtitle: 'View Details of Prize Winners...',
    category: 'Winner Felicitations & Payouts',
    fullDate: '01 December 2026',
    gazetteNumber: 'GOK/SLD/WIN-DEC-2026/01',
    summary: 'Official list of First and Second prize winners for the recent weekly draws.',
    content: [
      'The Directorate of Kerala State Lotteries is pleased to publish the verified list of top prize recipients for Draw No. KN-519 and Draw No. W-789.',
      '1st Prize of ₹1 Crore (Draw KN-519): Ticket No. PW-319402 purchased from Sree Padmanabha Lucky Centre, Thiruvananthapuram. The winner has completed initial verification.',
      '2nd Prize of ₹10 Lakhs: Ticket No. PX-782014 purchased from Kochi Central Agency, Ernakulam.',
      'Prize claimants are advised that TDS (Tax Deducted at Source) at 30% plus applicable surcharge will be deducted as per Section 194B of the Income Tax Act.'
    ]
  }
];

export const DISTRICTS = [
  'All Districts',
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod'
];
