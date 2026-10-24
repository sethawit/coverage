import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { baht, ProductSchema, type Product } from './product.ts';
import { quote } from './quote.ts';
import { cashflows, returns } from './returns.ts';
import { breakeven, scenarios } from './scenarios.ts';

const fixturesDir = new URL('../../fixtures/', import.meta.url);
const load = (file: string): unknown => JSON.parse(readFileSync(new URL(file, fixturesDir), 'utf8'));

describe('fixtures', () => {
  it.each(readdirSync(fixturesDir).filter((f) => f.endsWith('.json')))('%s passes the schema', (file) => {
    const result = ProductSchema.safeParse(load(file));
    expect(result.error?.issues ?? []).toEqual([]);
  });
});

// Every expected figure below is printed on https://www.bangkoklife.com/th/products/detail/262
// for a 35-year-old man, sum assured 100,000 baht, 20% tax bracket.
describe('Bangkok Life Tax Saver 10/5 brochure example', () => {
  const product: Product = ProductSchema.parse(load('bla-tax-saver-10-5.json'));
  const q = quote(product, { age: 35, gender: 'M', sumAssured: baht(100_000) });
  const { table } = q;
  const sum = (xs: { amount: number }[]) => xs.reduce((s, f) => s + f.amount, 0);

  it('quotes the brochure example as exact for its own age and gender', () => {
    expect(q.kind).toBe('exact');
    expect(table.annualPremium).toBeCloseTo(93_300, 6);
  });

  it('5 years of premiums total 466,500 (เบี้ยประกันภัยที่ชำระทั้งหมด 5 ปี)', () => {
    expect(scenarios(table, 5).surrender.totalPremiumsPaid).toBeCloseTo(466_500, 6);
  });

  it('surrendering after year 5 returns cash value 365,000; with cash back so far, 382,000', () => {
    const { surrender, death } = scenarios(table, 5);
    // brochure "รวมเงินขอคืนตามสิทธิ์" 382,000 minus 466,500 premiums
    expect(surrender).toEqual({
      kind: 'available',
      cash: expect.closeTo(365_000, 6),
      totalPremiumsPaid: expect.closeTo(466_500, 6),
      net: expect.closeTo(382_000 - 466_500, 6),
    });
    expect(death.payout).toBeCloseTo(500_000, 6);
  });

  it('guaranteed benefits total 515,000: 36,000 cash back plus 479,000 at maturity', () => {
    const inflows = cashflows(table, { kind: 'guaranteed' }).filter((f) => f.amount > 0);
    expect(sum(inflows)).toBeCloseTo(515_000, 6);
    expect(sum(inflows) - 466_500).toBeCloseTo(48_500, 6);
  });

  it('benefits with the 3% dividend illustration total 520,170', () => {
    const inflows = cashflows(table, { kind: 'withDividends' }).filter((f) => f.amount > 0);
    expect(sum(inflows)).toBeCloseTo(520_170, 6);
  });

  it('the 20% bracket refunds 18,660 a year, 93,300 over 5 years', () => {
    const refunds = cashflows(table, { kind: 'afterTax', bracket: 0.2 }).filter(
      (f) => f.kind === 'taxRefund',
    );
    expect(refunds.map((f) => f.amount)).toEqual(Array(5).fill(expect.closeTo(18_660, 6)));
    expect(sum(refunds)).toBeCloseTo(93_300, 6);
  });

  it('breaks even only at maturity: year 9 holds 36,000 + 358,900 = 394,900 < 466,500', () => {
    expect(breakeven(table)).toEqual({ kind: 'year', year: 10 });
  });

  // The page states no IRR. These come from an independent Python bisection over the same printed cashflows.
  it('IRR: about 1.30% guaranteed, 1.43% with 3% dividends, 4.14% after 20% tax', () => {
    const r = returns(table, 0.2);
    expect(r.guaranteed).toBeCloseTo(0.012951, 5);
    expect(r.withDividends).toBeCloseTo(0.014262, 5);
    expect(r.afterTax).toEqual({ kind: 'eligible', irr: expect.closeTo(0.041444, 5) });
  });
});

// Figures printed in each product page's worked example (https://www.bangkoklife.com/th/products/detail/<page>).
// "withdrawable" is the page's รวมเงินขอคืนตามสิทธิ์: cash back received so far plus surrender value.
const pageExamples = [
  { file: 'bla-happy-saving-15-7.json', age: 35, gender: 'M', sumAssured: 100_000, premiums: 699_300,
    guaranteed: 825_000, withDividends: 825_000, stop: 7, cash: 501_100, withdrawable: 550_100, death: 700_000,
    // The page prints 19,780 per year but totals 139,860, which is 7 × 19,980 (20% of 99,900); the total is used.
    taxRefunds: 139_860 },
  { file: 'bla-prestige-saving-12-6.json', age: 35, gender: 'F', sumAssured: 500_000, premiums: 2_874_000,
    guaranteed: 3_430_000, withDividends: 3_430_000, stop: 6, cash: 2_107_000, withdrawable: 2_287_000,
    death: 3_000_000, taxRefunds: 120_000 },
  { file: 'bla-prestige-saving-10-4.json', age: 35, gender: 'M', sumAssured: 1_000_000, premiums: 3_996_000,
    guaranteed: 4_600_000, withDividends: 4_600_000, stop: 4, cash: 2_889_000, withdrawable: 3_049_000,
    death: 4_000_000, taxRefunds: 80_000 },
  { file: 'bla-happy-saving-14-7.json', age: 40, gender: 'M', sumAssured: 100_000, premiums: 691_600,
    guaranteed: 762_000, withDividends: 838_390, stop: 7, cash: 590_400, withdrawable: 608_400, death: 700_000,
    taxRefunds: 138_320 },
] as const;

describe.each(pageExamples)('$file page example', (ex) => {
  const product = ProductSchema.parse(load(ex.file));
  const q = quote(product, { age: ex.age, gender: ex.gender, sumAssured: baht(ex.sumAssured) });
  const sum = (xs: { amount: number }[]) => xs.reduce((s, f) => s + f.amount, 0);
  const inflows = (variant: Parameters<typeof cashflows>[1]) =>
    sum(cashflows(q.table, variant).filter((f) => f.amount > 0 && f.kind !== 'taxRefund'));

  it('is exact for its own age and gender', () => expect(q.kind).toBe('exact'));

  it('surrender after the last premium matches the printed row', () => {
    const s = scenarios(q.table, ex.stop);
    expect(s.surrender).toEqual({
      kind: 'available',
      cash: expect.closeTo(ex.cash, 6),
      totalPremiumsPaid: expect.closeTo(ex.premiums, 6),
      net: expect.closeTo(ex.withdrawable - ex.premiums, 6),
    });
    expect(s.death.payout).toBeCloseTo(ex.death, 6);
  });

  it('benefit totals match the printed summary', () => {
    expect(inflows({ kind: 'guaranteed' })).toBeCloseTo(ex.guaranteed, 6);
    expect(inflows({ kind: 'withDividends' })).toBeCloseTo(ex.withDividends, 6);
  });

  it('20% bracket tax refunds match the printed total', () => {
    const refunds = cashflows(q.table, { kind: 'afterTax', bracket: 0.2 }).filter((f) => f.kind === 'taxRefund');
    expect(sum(refunds)).toBeCloseTo(ex.taxRefunds, 6);
  });
});

// Figures stated on https://krungthai.com/th/personal/insurance/life-insurance/saving-life/742 and /558.
// Premium equals sum assured at every age in range; the pages print no surrender values.
describe.each([
  { file: 'ktaxa-super-save-10-3.json', totalPercent: 339, maxAge: 65, peakDeathPercent: 315 },
  { file: 'ktaxa-life-super-save-14-5.json', totalPercent: 608, maxAge: 60, peakDeathPercent: 525 },
])('$file product page', (ex) => {
  const product = ProductSchema.parse(load(ex.file));
  const at = (age: number) => quote(product, { age, gender: 'F', sumAssured: baht(100_000) });
  const { table } = at(ex.maxAge);

  it('is exact at any eligible age and either gender, a sample outside the range', () => {
    expect(at(20).kind).toBe('exact');
    expect(at(ex.maxAge).kind).toBe('exact');
    expect(at(ex.maxAge + 1).kind).toBe('sample');
    expect(table.annualPremium).toBeCloseTo(100_000, 6);
  });

  it('total benefits match the page percentage of sum assured', () => {
    const inflows = cashflows(table, { kind: 'guaranteed' }).filter((f) => f.amount > 0);
    expect(inflows.reduce((s, f) => s + f.amount, 0)).toBeCloseTo(ex.totalPercent * 1_000, 6);
    expect(Math.max(...table.rows.map((r) => r.deathBenefit))).toBeCloseTo(ex.peakDeathPercent * 1_000, 6);
  });

  it('marks surrender as unpublished and breakeven as maturity at the latest', () => {
    expect(scenarios(table, product.paymentYears).surrender.kind).toBe('unpublished');
    expect(breakeven(table)).toEqual({ kind: 'unknown', byYear: product.coverageYears });
  });
});

it('Super Save 10/3 guaranteed IRR matches the page’s "IRR ประมาณ 1.39%"', () => {
  const product = ProductSchema.parse(load('ktaxa-super-save-10-3.json'));
  const { table } = quote(product, { age: 35, gender: 'M', sumAssured: baht(100_000) });
  expect(returns(table, 0).guaranteed).toBeCloseTo(0.0139, 4);
});

// Both pages print one rate, 999 baht per 1,000 sum assured, for every age and both genders.
describe.each([
  { file: 'bla-happy-saving-15-7.json', maxAge: 84 },
  { file: 'bla-prestige-saving-10-4.json', maxAge: 80 },
])('$file flat rate table', ({ file, maxAge }) => {
  const product = ProductSchema.parse(load(file));

  it('quotes exactly for any age in range without borrowing the example’s surrender values', () => {
    const q = quote(product, { age: maxAge, gender: 'F', sumAssured: baht(100_000) });
    expect(q.kind).toBe('exact');
    expect(q.table.annualPremium).toBe(99_900);
    expect(q.table.rows.every((r) => r.cashValue === null)).toBe(true);
  });

  it('keeps the worked example, with its surrender values, for the example’s own age', () => {
    const q = quote(product, { age: 35, gender: 'M', sumAssured: baht(100_000) });
    expect(q.kind).toBe('exact');
    expect(q.table.rows[0]?.cashValue).not.toBeNull();
  });

  it('falls back to the sample past the insurable age', () => {
    expect(quote(product, { age: maxAge + 1, gender: 'F', sumAssured: baht(100_000) }).kind).toBe('sample');
  });
});

// Figures printed on page 2 of the Ocean Life First Love 18/10 brochure PDF.
it.each([
  { age: 20, gender: 'M' as const, premium: 12_814 },
  { age: 40, gender: 'F' as const, premium: 12_800 },
])('First Love 18/10 quotes the brochure rate exactly for age $age $gender', ({ age, gender, premium }) => {
  const product = ProductSchema.parse(load('ocean-first-love-18-10.json'));
  const q = quote(product, { age, gender, sumAssured: baht(100_000) });
  expect(q.kind).toBe('exact');
  expect(q.table.annualPremium).toBeCloseTo(premium, 6);
});

// Worked example on the Ocean Life First Love 18/10 brochure: female 35, premium 15,000, sum assured 117,739.
it('First Love 18/10 sample reproduces the brochure death and surrender values', () => {
  const product = ProductSchema.parse(load('ocean-first-love-18-10.json'));
  const q = quote(product, { age: 35, gender: 'F', sumAssured: baht(117_739) });
  expect(q.table.rows[0]?.deathBenefit).toBeCloseTo(176_726.24, 0);
  expect(q.table.rows[9]?.deathBenefit).toBeCloseTo(178_374.59, 0);
  expect(q.table.rows[0]?.cashValue).toBeCloseTo(706.43, 0);
  expect(q.table.rows[17]?.cashValue).toBeCloseTo(176_608.5, 0);
  expect(product.accidentalDeath?.extraPercentOfSumAssured).toBe(300);
});
