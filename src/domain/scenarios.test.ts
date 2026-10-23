import { describe, expect, it } from 'vitest';
import { baht } from './product.ts';
import { quote } from './quote.ts';
import { breakeven, scenarios } from './scenarios.ts';
import { illustrationInput, product } from './test-support.ts';

// Sum assured 1,000 makes Baht equal to the per-1,000 figures, so the arithmetic reads directly.
function tableOf(rows: Parameters<typeof illustrationInput>[0]['rows'], maturityBenefit: number) {
  const p = product({
    paymentYears: 3,
    illustrations: [illustrationInput({ annualPremium: 100, maturityBenefit, rows })],
  });
  return quote(p, { age: 35, gender: 'M', sumAssured: baht(1000) }).table;
}

const table = tableOf(
  [
    {
      deathBenefit: 1000,
      guaranteedCashBack: 10,
      cashValue: 50,
      paidUpSumAssured: 200,
      extendedTerm: { years: 2, days: 30, maturityAmount: 0 },
    },
    { deathBenefit: 1000, guaranteedCashBack: 10, cashValue: 150 },
    { deathBenefit: 1200, guaranteedCashBack: 10, cashValue: 270 },
    { deathBenefit: 1200, guaranteedCashBack: 0, cashValue: 300 },
  ],
  330,
);

describe('scenarios', () => {
  it('stopping after year 1 offers paid-up and extended term from the table', () => {
    expect(scenarios(table, 1)).toEqual({
      death: { payout: 1000 },
      // net = cash 50 + cash back 10 - premiums 100 = -40
      surrender: { kind: 'available', cash: 50, totalPremiumsPaid: 100, net: -40 },
      paidUp: { kind: 'available', sumAssured: 200 },
      extendedTerm: { kind: 'available', years: 2, days: 30, maturityAmount: 0 },
    });
  });

  it('marks paid-up and extended term unavailable when the table lacks them', () => {
    const s = scenarios(table, 2);
    expect(s.paidUp).toEqual({ kind: 'unavailable' });
    expect(s.extendedTerm).toEqual({ kind: 'unavailable' });
  });

  it('counts every premium and cash back up to the stop year', () => {
    // premiums 3 x 100 = 300; cash back 10 + 10 + 10 = 30; net = 270 + 30 - 300 = 0
    expect(scenarios(table, 3).surrender).toEqual({ kind: 'available', cash: 270, totalPremiumsPaid: 300, net: 0 });
    expect(scenarios(table, 3).death).toEqual({ payout: 1200 });
  });

  it('rejects a stop year outside 1..paymentYears', () => {
    expect(() => scenarios(table, 0)).toThrow(RangeError);
    expect(() => scenarios(table, 4)).toThrow(RangeError);
    expect(() => scenarios(table, 1.5)).toThrow(RangeError);
  });
});

describe('breakeven', () => {
  it('finds the first year cash back plus cash value covers premiums', () => {
    // y1: 10+50=60 < 100; y2: 20+150=170 < 200; y3: 30+270=300 >= 300
    expect(breakeven(table)).toEqual({ kind: 'year', year: 3 });
  });

  it('uses the maturity benefit, not the cash value, in the final year', () => {
    // y4: cash value 100 + 0 cash back < 300, but maturity 400 >= 300
    const t = tableOf([{ cashValue: 10 }, { cashValue: 20 }, { cashValue: 30 }, { cashValue: 100 }], 400);
    expect(breakeven(t)).toEqual({ kind: 'year', year: 4 });
  });

  it('is never when premiums are not recovered even at maturity', () => {
    // final year: maturity 250 < premiums 300
    const t = tableOf([{ cashValue: 10 }, { cashValue: 20 }, { cashValue: 30 }, { cashValue: 40 }], 250);
    expect(breakeven(t)).toEqual({ kind: 'never' });
  });

  it('is year 1 when year 1 already breaks even', () => {
    const t = tableOf([{ cashValue: 100 }, { cashValue: 200 }, { cashValue: 300 }, { cashValue: 300 }], 300);
    expect(breakeven(t)).toEqual({ kind: 'year', year: 1 });
  });

  it('is unknown, at maturity at the latest, when earlier surrender values are unpublished', () => {
    const t = tableOf([{ cashValue: null }, { cashValue: null }, { cashValue: null }, { cashValue: null }], 400);
    expect(breakeven(t)).toEqual({ kind: 'unknown', byYear: 4 });
    expect(scenarios(t, 2).surrender).toEqual({ kind: 'unpublished', totalPremiumsPaid: 200 });
  });

  it('ignores unpublished years after a known breakeven', () => {
    const t = tableOf([{ cashValue: 100 }, { cashValue: null }, { cashValue: null }, { cashValue: null }], 400);
    expect(breakeven(t)).toEqual({ kind: 'year', year: 1 });
  });
});
