import { baht, type Baht, type Gender, type Product } from '../domain/product.ts';
import { quote } from '../domain/quote.ts';
import { cashflows, returns, TAX_BRACKETS, type Returns, type TaxBracket } from '../domain/returns.ts';
import { breakevenYear, yearlyPositions, type YearPosition } from '../domain/scenarios.ts';
import { int } from './profile-params.ts';

export const GOALS = {
  save: { label: 'ออมเงินให้งอกเงย', sort: 'irr' },
  tax: { label: 'ลดหย่อนภาษี', sort: 'afterTax' },
  exit: { label: 'อยากถอนออกได้โดยไม่ขาดทุนเร็ว', sort: 'breakeven' },
  protect: { label: 'คุ้มครองครอบครัว', sort: 'death' },
} as const satisfies Record<string, { label: string; sort: SortKey }>;
export type Goal = keyof typeof GOALS;

export const SORTS = {
  irr: 'ผลตอบแทนรับประกัน สูงไปต่ำ',
  afterTax: 'ผลตอบแทนรวมภาษีที่ประหยัดได้ สูงไปต่ำ',
  breakeven: 'คืนทุนเร็วไปช้า',
  total: 'เงินที่ได้คืนรวม สูงไปต่ำ',
  death: 'ความคุ้มครองชีวิตสูงสุด มากไปน้อย',
  payYears: 'จ่ายเบี้ยสั้นไปยาว',
} as const;
export type SortKey = keyof typeof SORTS;

/** Everything the shopper tells us, as carried in the URL. Products are compared at the same yearly budget. */
export type Shopper = {
  age: number;
  gender: Gender;
  budget: Baht;
  bracket: TaxBracket;
  goal: Goal | null;
  maxPayYears: number | null;
  horizon: number | null;
  sort: SortKey;
  compare: string[];
};

export const MAX_COMPARE = 3;

const isKey = <T extends object>(obj: T, k: string | null): k is Extract<keyof T, string> =>
  k !== null && Object.hasOwn(obj, k);

export function parseShopper(params: URLSearchParams): Shopper {
  const sex = params.get('sex');
  const goal = params.get('goal');
  const sort = params.get('sort');
  const taxPercent = int(params.get('tax'), 0, 35);
  const validGoal = isKey(GOALS, goal) ? goal : null;
  return {
    age: int(params.get('age'), 0, 99) ?? 35,
    gender: sex === 'M' || sex === 'F' ? sex : 'M',
    budget: baht(int(params.get('budget'), 1_000, 10_000_000) ?? 50_000),
    bracket: TAX_BRACKETS.find((b) => Math.round(b * 100) === taxPercent) ?? 0,
    goal: validGoal,
    maxPayYears: int(params.get('pay'), 1, 99) ?? null,
    horizon: int(params.get('within'), 1, 99) ?? null,
    sort: isKey(SORTS, sort) ? sort : validGoal ? GOALS[validGoal].sort : 'irr',
    compare: [...new Set((params.get('cmp') ?? '').split(',').filter(Boolean))].slice(0, MAX_COMPARE),
  };
}

export function serializeShopper(s: Shopper): string {
  const params = new URLSearchParams({
    age: String(s.age),
    sex: s.gender,
    budget: String(s.budget),
    tax: String(Math.round(s.bracket * 100)),
    sort: s.sort,
  });
  if (s.goal) params.set('goal', s.goal);
  if (s.maxPayYears !== null) params.set('pay', String(s.maxPayYears));
  if (s.horizon !== null) params.set('within', String(s.horizon));
  if (s.compare.length > 0) params.set('cmp', s.compare.join(','));
  return params.toString();
}

export type Summary = {
  product: Product;
  quoteKind: 'exact' | 'sample';
  sumAssured: Baht;
  annualPremium: Baht;
  totalPremiums: Baht;
  guaranteedTotal: Baht;
  returns: Returns;
  breakeven: number | null;
  peakDeath: Baht;
  positions: YearPosition[];
};

/** Prices the product at the sum assured the shopper's yearly budget buys. */
export function summarize(product: Product, s: Shopper): Summary {
  const perThousand = quote(product, { age: s.age, gender: s.gender, sumAssured: baht(1_000) }).table.annualPremium;
  const sumAssured = baht((s.budget / perThousand) * 1_000);
  const q = quote(product, { age: s.age, gender: s.gender, sumAssured });
  const { table } = q;
  return {
    product,
    quoteKind: q.kind,
    sumAssured,
    annualPremium: table.annualPremium,
    totalPremiums: baht(table.annualPremium * table.paymentYears),
    guaranteedTotal: baht(
      cashflows(table, { kind: 'guaranteed' }).reduce((sum, f) => sum + Math.max(f.amount, 0), 0),
    ),
    returns: returns(table, s.bracket),
    breakeven: breakevenYear(table),
    peakDeath: baht(Math.max(...table.rows.map((r) => r.deathBenefit))),
    positions: yearlyPositions(table),
  };
}

const afterTaxIrr = (r: Returns) => (r.afterTax.kind === 'eligible' ? r.afterTax.irr : r.guaranteed);

// Each comparator puts the larger-is-listed-first value first; nulls (no IRR, never breaks even) sink.
const descending = (f: (x: Summary) => number | null) => (a: Summary, b: Summary) =>
  (f(b) ?? -Infinity) - (f(a) ?? -Infinity);
const ascending = (f: (x: Summary) => number | null) => (a: Summary, b: Summary) =>
  (f(a) ?? Infinity) - (f(b) ?? Infinity);

const COMPARATORS: Record<SortKey, (a: Summary, b: Summary) => number> = {
  irr: descending((x) => x.returns.guaranteed),
  afterTax: descending((x) => afterTaxIrr(x.returns)),
  breakeven: ascending((x) => x.breakeven),
  total: descending((x) => x.guaranteedTotal),
  death: descending((x) => x.peakDeath),
  payYears: ascending((x) => x.product.paymentYears),
};

export function discover(products: readonly Product[], s: Shopper): Summary[] {
  return products
    .filter((p) => p.status.kind !== 'discontinued')
    .filter((p) => s.maxPayYears === null || p.paymentYears <= s.maxPayYears)
    .filter((p) => s.horizon === null || p.coverageYears <= s.horizon)
    .map((p) => summarize(p, s))
    .sort((a, b) => COMPARATORS[s.sort](a, b) || a.product.nameTh.localeCompare(b.product.nameTh, 'th'));
}
