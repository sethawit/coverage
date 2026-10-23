// Thai personal income tax for tax year 2569 (income earned in 2026, filed in 2027).
// Rates: https://rd.go.th/59670.html. Expense deduction: https://www.rd.go.th/27966.html.
// Allowance caps: https://www.finnomena.com/finnomenafunds/tax-deduction-guide/ (tax year 2569),
// cross-checked against https://www.krungsri.com/th/krungsri-the-coach/taxes/tax-knowledge/tax-deduction-guide.

const RATE_TABLE: readonly { upTo: number; rate: number }[] = [
  { upTo: 150_000, rate: 0 },
  { upTo: 300_000, rate: 0.05 },
  { upTo: 500_000, rate: 0.1 },
  { upTo: 750_000, rate: 0.15 },
  { upTo: 1_000_000, rate: 0.2 },
  { upTo: 2_000_000, rate: 0.25 },
  { upTo: 5_000_000, rate: 0.3 },
  { upTo: Infinity, rate: 0.35 },
];

export function incomeTax(netIncome: number): number {
  let tax = 0;
  let lower = 0;
  for (const { upTo, rate } of RATE_TABLE) {
    if (netIncome <= lower) break;
    tax += (Math.min(netIncome, upTo) - lower) * rate;
    lower = upTo;
  }
  return Math.round(tax);
}

export const topRate = (netIncome: number) => RATE_TABLE.find((b) => netIncome <= b.upTo)!.rate;

export const PERSONAL_ALLOWANCE = 60_000;
const EXPENSE_RATE = 0.5;
const EXPENSE_CAP = 100_000;
export const LIFE_HEALTH_CAP = 100_000;
export const RETIREMENT_CAP = 500_000;
const DONATION_SHARE = 0.1;

export type Section = 'family' | 'insurance' | 'retirement' | 'invest' | 'home' | 'donation';

export const SECTIONS: Record<Section, { title: string; note?: string }> = {
  family: { title: 'ตัวเองและครอบครัว', note: `ลดหย่อนส่วนตัว ${PERSONAL_ALLOWANCE.toLocaleString('th-TH')} บาท ได้ทุกคนอัตโนมัติ` },
  insurance: {
    title: 'ประกันและประกันสังคม',
    note: 'ประกันชีวิตกับประกันสุขภาพตัวเองรวมกันไม่เกิน 100,000 บาท',
  },
  retirement: {
    title: 'กองทุนและประกันเพื่อเกษียณ',
    note: 'ประกันบำนาญ PVD กบข. กองทุนครูเอกชน กอช. และ RMF รวมกันไม่เกิน 500,000 บาท',
  },
  invest: { title: 'กองทุนลดหย่อนอื่น' },
  home: { title: 'บ้านและที่อยู่อาศัย' },
  donation: { title: 'เงินบริจาค', note: 'คิดเป็นขั้นสุดท้าย หลังหักลดหย่อนอื่นทั้งหมดแล้ว' },
};

type Ctx = { assessable: number; wages: number };

export type Deduction = {
  id: string;
  section: Section;
  label: string;
  hint?: string;
  /** Money paid, or a number of people for allowances granted per person. */
  unit: 'baht' | 'people';
  capText: string;
  /** Largest amount this item allows on its own, before any shared cap. For 'people', the amount per person. */
  cap: (c: Ctx) => number;
  maxPeople?: number;
  /** Something the person can still choose to pay into this year to lower tax. */
  plannable?: boolean;
};

const pct = (share: number, of: number, max: number) => Math.min(share * of, max);

export const DEDUCTIONS: readonly Deduction[] = [
  { id: 'spouse', section: 'family', label: 'คู่สมรสที่ไม่มีเงินได้', unit: 'people', maxPeople: 1, capText: '60,000 บาท', cap: () => 60_000, hint: 'จดทะเบียนสมรส และคู่สมรสไม่มีรายได้ทั้งปี' },
  { id: 'child', section: 'family', label: 'บุตรคนแรก หรือบุตรที่เกิดก่อนปี 2561', unit: 'people', capText: 'คนละ 30,000 บาท', cap: () => 30_000, hint: 'อายุไม่เกิน 20 ปี หรือไม่เกิน 25 ปีและยังเรียนอยู่' },
  { id: 'child2', section: 'family', label: 'บุตรคนที่ 2 ขึ้นไป ที่เกิดตั้งแต่ปี 2561', unit: 'people', capText: 'คนละ 60,000 บาท', cap: () => 60_000 },
  { id: 'adopted', section: 'family', label: 'บุตรบุญธรรม', unit: 'people', maxPeople: 3, capText: 'คนละ 30,000 บาท ไม่เกิน 3 คน', cap: () => 30_000 },
  { id: 'parents', section: 'family', label: 'พ่อแม่ของตัวเองและคู่สมรส', unit: 'people', maxPeople: 4, capText: 'คนละ 30,000 บาท ไม่เกิน 4 คน', cap: () => 30_000, hint: 'อายุ 60 ปีขึ้นไป รายได้ไม่เกิน 30,000 บาทต่อปี' },
  { id: 'disabled', section: 'family', label: 'ผู้พิการหรือทุพพลภาพที่อุปการะ', unit: 'people', capText: 'คนละ 60,000 บาท', cap: () => 60_000, hint: 'มีบัตรคนพิการ รายได้ไม่เกิน 30,000 บาทต่อปี' },
  { id: 'birth', section: 'family', label: 'ค่าฝากครรภ์และคลอดบุตร', unit: 'baht', capText: 'ตามจริง ไม่เกิน 60,000 บาทต่อครรภ์', cap: () => 60_000 },

  { id: 'sso', section: 'insurance', label: 'เงินสมทบประกันสังคม', unit: 'baht', capText: 'ตามจริง ไม่เกิน 10,500 บาท', cap: () => 10_500, hint: 'ปี 2569 หักสูงสุดเดือนละ 875 บาท' },
  { id: 'life', section: 'insurance', label: 'เบี้ยประกันชีวิตและออมทรัพย์', unit: 'baht', capText: 'ไม่เกิน 100,000 บาท', cap: () => LIFE_HEALTH_CAP, plannable: true, hint: 'สัญญา 10 ปีขึ้นไป กับบริษัทในไทย' },
  { id: 'health', section: 'insurance', label: 'เบี้ยประกันสุขภาพตัวเอง', unit: 'baht', capText: 'ไม่เกิน 25,000 บาท (รวมกับประกันชีวิตไม่เกิน 100,000)', cap: () => 25_000, plannable: true },
  { id: 'parentHealth', section: 'insurance', label: 'เบี้ยประกันสุขภาพพ่อแม่', unit: 'baht', capText: 'ไม่เกิน 15,000 บาท', cap: () => 15_000, plannable: true },

  { id: 'pension', section: 'retirement', label: 'เบี้ยประกันบำนาญ', unit: 'baht', capText: '15% ของเงินได้ ไม่เกิน 200,000 บาท', cap: (c) => pct(0.15, c.assessable, 200_000), plannable: true, hint: 'ถ้าสิทธิ์ประกันชีวิต 100,000 ยังเหลือ ส่วนแรกจะไปใช้สิทธิ์ประกันชีวิตก่อน' },
  { id: 'pvd', section: 'retirement', label: 'กองทุนสำรองเลี้ยงชีพ (PVD) ส่วนของคุณ', unit: 'baht', capText: '15% ของเงินเดือน ไม่เกิน 500,000 บาท', cap: (c) => pct(0.15, c.wages, RETIREMENT_CAP), plannable: true },
  { id: 'gpf', section: 'retirement', label: 'กบข.', unit: 'baht', capText: '30% ของเงินเดือน ไม่เกิน 500,000 บาท', cap: (c) => pct(0.3, c.wages, RETIREMENT_CAP) },
  { id: 'teacher', section: 'retirement', label: 'กองทุนสงเคราะห์ครูโรงเรียนเอกชน', unit: 'baht', capText: '15% ของเงินเดือน ไม่เกิน 500,000 บาท', cap: (c) => pct(0.15, c.wages, RETIREMENT_CAP) },
  { id: 'nsf', section: 'retirement', label: 'กองทุนการออมแห่งชาติ (กอช.)', unit: 'baht', capText: 'ไม่เกิน 30,000 บาท', cap: () => 30_000, plannable: true },
  { id: 'rmf', section: 'retirement', label: 'RMF', unit: 'baht', capText: '30% ของเงินได้ ไม่เกิน 500,000 บาท', cap: (c) => pct(0.3, c.assessable, RETIREMENT_CAP), plannable: true, hint: 'ถือ 5 ปีขึ้นไป และขายได้เมื่ออายุ 55 ปี' },

  { id: 'esg', section: 'invest', label: 'Thai ESG และ Thai ESGX', unit: 'baht', capText: '30% ของเงินได้ ไม่เกิน 300,000 บาท (แยกจากกลุ่มเกษียณ)', cap: (c) => pct(0.3, c.assessable, 300_000), plannable: true, hint: 'ปี 2569 สองกองนี้ใช้วงเงินร่วมกัน ถือ 5 ปี' },

  { id: 'homeLoan', section: 'home', label: 'ดอกเบี้ยเงินกู้ซื้อบ้าน', unit: 'baht', capText: 'ตามจริง ไม่เกิน 100,000 บาท', cap: () => 100_000 },
  { id: 'solar', section: 'home', label: 'ติดโซลาร์รูฟบ้าน', unit: 'baht', capText: 'ตามจริง ไม่เกิน 200,000 บาท', cap: () => 200_000, hint: 'มาตรการปี 2569 ถึง 2571 ต้องมีใบกำกับภาษีอิเล็กทรอนิกส์' },

  { id: 'party', section: 'donation', label: 'บริจาคพรรคการเมือง', unit: 'baht', capText: 'ไม่เกิน 10,000 บาท', cap: () => 10_000 },
  { id: 'donateDouble', section: 'donation', label: 'บริจาคการศึกษา กีฬา โรงพยาบาลรัฐ', unit: 'baht', capText: 'หักได้ 2 เท่า ไม่เกิน 10% ของเงินได้หลังหักลดหย่อน', cap: () => Infinity },
  { id: 'donate', section: 'donation', label: 'บริจาคทั่วไป', unit: 'baht', capText: 'ไม่เกิน 10% ของเงินได้หลังหักลดหย่อน', cap: () => Infinity },
];

export type TaxInput = {
  /** Salary for the whole year. */
  salary: number;
  bonus: number;
  /** Other 40(2) income such as fees and commissions; shares the employment expense deduction. */
  otherWages: number;
  /** Tax already withheld by employers and payers this year. */
  withheld: number;
  amounts: Record<string, number>;
};

export type TaxResult = {
  assessable: number;
  expense: number;
  /** What each item actually takes off income after its own cap and any shared cap. */
  allowed: Record<string, number>;
  totalAllowances: number;
  netIncome: number;
  tax: number;
  topRate: number;
  withheld: number;
  /** Positive is a refund, negative is tax still to pay. */
  balance: number;
};

const amount = (i: TaxInput, id: string) => Math.max(0, i.amounts[id] ?? 0);

export function computeTax(i: TaxInput): TaxResult {
  const assessable = i.salary + i.bonus + i.otherWages;
  const ctx: Ctx = { assessable, wages: i.salary + i.bonus };
  const expense = Math.min(assessable * EXPENSE_RATE, EXPENSE_CAP);

  const allowed: Record<string, number> = {};
  for (const d of DEDUCTIONS) {
    if (d.section === 'donation') continue;
    const n = amount(i, d.id);
    allowed[d.id] =
      d.unit === 'people' ? Math.min(Math.floor(n), d.maxPeople ?? Infinity) * d.cap(ctx) : Math.min(n, d.cap(ctx));
  }

  // Life and own health share one cap; pension premium may fill what that cap leaves before using its own.
  allowed.life = Math.min(allowed.life!, LIFE_HEALTH_CAP - allowed.health!);
  const pensionPaid = amount(i, 'pension');
  const spill = Math.min(pensionPaid, LIFE_HEALTH_CAP - allowed.life - allowed.health!);
  const pensionOwn = Math.min(pensionPaid - spill, DEDUCTIONS.find((d) => d.id === 'pension')!.cap(ctx));

  let retirementLeft = RETIREMENT_CAP;
  const takeRetirement = (want: number) => {
    const got = Math.min(want, retirementLeft);
    retirementLeft -= got;
    return got;
  };
  allowed.pension = spill + takeRetirement(pensionOwn);
  for (const id of ['pvd', 'gpf', 'teacher', 'nsf', 'rmf']) allowed[id] = takeRetirement(allowed[id]!);

  const beforeDonations = Math.max(
    0,
    assessable - expense - PERSONAL_ALLOWANCE - Object.values(allowed).reduce((s, v) => s + v, 0),
  );
  allowed.party = Math.min(amount(i, 'party'), 10_000);
  const donationBase = Math.max(0, beforeDonations - allowed.party);
  allowed.donateDouble = Math.min(2 * amount(i, 'donateDouble'), DONATION_SHARE * donationBase);
  allowed.donate = Math.min(amount(i, 'donate'), DONATION_SHARE * (donationBase - allowed.donateDouble));

  const totalAllowances = PERSONAL_ALLOWANCE + Object.values(allowed).reduce((s, v) => s + v, 0);
  const netIncome = Math.max(0, assessable - expense - totalAllowances);
  const tax = incomeTax(netIncome);
  return {
    assessable,
    expense,
    allowed,
    totalAllowances,
    netIncome,
    tax,
    topRate: topRate(netIncome),
    withheld: i.withheld,
    balance: i.withheld - tax,
  };
}

const withExtra = (i: TaxInput, id: string, extra: number): TaxInput => ({
  ...i,
  amounts: { ...i.amounts, [id]: amount(i, id) + extra },
});

/** How much more can go into this item this year and still lower tax, and the tax that would save. */
export function headroom(i: TaxInput, id: string): { more: number; taxSaved: number } {
  const now = computeTax(i);
  const filled = computeTax(withExtra(i, id, 1e12));
  const more = Math.round(filled.totalAllowances - now.totalAllowances);
  return { more, taxSaved: now.tax - computeTax(withExtra(i, id, more)).tax };
}

/** Tax saved by paying `extra` more into one item. */
export const taxSavedBy = (i: TaxInput, id: string, extra: number) =>
  computeTax(i).tax - computeTax(withExtra(i, id, extra)).tax;

export type PlanItem = { deduction: string; amount: number };

/**
 * Applies planned purchases one after another. Each row is credited with what it adds on top of the rows before it,
 * so items that share a cap (life and health, the retirement group) show how much of the cap they really get.
 */
export function planEffect(i: TaxInput, plan: readonly PlanItem[]) {
  const before = computeTax(i);
  let input = i;
  let prev = before;
  const rows = plan.map((p) => {
    input = withExtra(input, p.deduction, p.amount);
    const r = computeTax(input);
    const row = { deducted: r.totalAllowances - prev.totalAllowances, taxSaved: prev.tax - r.tax };
    prev = r;
    return row;
  });
  return { before, after: prev, rows };
}
