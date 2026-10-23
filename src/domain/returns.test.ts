import { describe, expect, it } from 'vitest';
import { baht } from './product.ts';
import { quote } from './quote.ts';
import { cashflows, irr, returns } from './returns.ts';
import { illustrationInput, product } from './test-support.ts';

function tableOf(
  opts: { paymentYears: number; sumAssured?: number } & Parameters<typeof illustrationInput>[0],
) {
  const p = product({ paymentYears: opts.paymentYears, illustrations: [illustrationInput(opts)] });
  return quote(p, { age: 35, gender: 'M', sumAssured: baht(opts.sumAssured ?? 1000) }).table;
}

const blank = (n: number) => Array.from({ length: n }, () => ({}));

describe('irr', () => {
  it('pay 1,000 now, receive 1,102.50 in two years => 5% (1.05^2 = 1.1025)', () => {
    expect(irr([{ t: 0, amount: -1000 }, { t: 2, amount: 1102.5 }])).toBeCloseTo(0.05, 10);
  });

  it('pay 100 at t0 and t1, receive 231 at t2 => 10% (100*1.21 + 100*1.1 = 231)', () => {
    const flows = [
      { t: 0, amount: -100 },
      { t: 1, amount: -100 },
      { t: 2, amount: 231 },
    ];
    expect(irr(flows)).toBeCloseTo(0.1, 10);
  });

  it('getting back exactly what you paid => 0%', () => {
    expect(irr([{ t: 0, amount: -500 }, { t: 3, amount: 500 }])).toBeCloseTo(0, 10);
  });

  it('getting back half => negative return (0.5^(1/1) - 1 = -50%)', () => {
    expect(irr([{ t: 0, amount: -1000 }, { t: 1, amount: 500 }])).toBeCloseTo(-0.5, 10);
  });

  it('is null when cashflows never change sign', () => {
    expect(irr([{ t: 0, amount: -100 }, { t: 1, amount: -100 }])).toBeNull();
    expect(irr([{ t: 0, amount: 100 }])).toBeNull();
    expect(irr([])).toBeNull();
  });
});

describe('returns', () => {
  // Premium 1,000 at t0, maturity 1,102.50 at t2 => 5%. Dividend 107.50 at t2 lifts it to 1,210 => 10%.
  const twoYear = tableOf({
    paymentYears: 1,
    annualPremium: 1000,
    maturityBenefit: 1102.5,
    rows: [{}, { illustratedDividend: 107.5 }],
  });

  it('guaranteed IRR ignores illustrated dividends', () => {
    expect(returns(twoYear, 0).guaranteed).toBeCloseTo(0.05, 10);
  });

  it('dividend IRR adds them (1,210 / 1,000 = 1.1^2 => 10%)', () => {
    expect(returns(twoYear, 0).withDividends).toBeCloseTo(0.1, 10);
  });

  it('a policy that returns exactly its premiums has 0% guaranteed IRR', () => {
    const flat = tableOf({ paymentYears: 1, annualPremium: 1000, maturityBenefit: 1000, rows: blank(10) });
    expect(returns(flat, 0).guaranteed).toBeCloseTo(0, 10);
  });

  it('places premiums at year start and cash back, dividends and maturity at year end', () => {
    const t = tableOf({
      paymentYears: 2,
      annualPremium: 100,
      maturityBenefit: 150,
      rows: [{ guaranteedCashBack: 10, illustratedDividend: 1 }, { guaranteedCashBack: 20 }],
    });
    const expected = [
      { t: 0, kind: 'premium', amount: -100 },
      { t: 1, kind: 'premium', amount: -100 },
      { t: 1, kind: 'cashBack', amount: 10 },
      { t: 1, kind: 'dividend', amount: 1 },
      { t: 2, kind: 'cashBack', amount: 20 },
      { t: 2, kind: 'maturity', amount: 150 },
    ];
    const flows = cashflows(t, { kind: 'withDividends' });
    expect(flows).toHaveLength(expected.length);
    expect(flows).toEqual(expect.arrayContaining(expected));
  });

  describe('after tax', () => {
    // 10-year cover, one premium of 1,000; 10% bracket refunds 100 at t1.
    // Cross-checked by independent bisection: -1000 + 100/1.010475 + 1000/1.010475^10 ~= 0.
    const tenYear = tableOf({ paymentYears: 1, annualPremium: 1000, maturityBenefit: 1000, rows: blank(10) });

    it('adds the refund at the end of each premium year', () => {
      expect(cashflows(tenYear, { kind: 'afterTax', bracket: 0.1 })).toContainEqual({
        t: 1,
        kind: 'taxRefund',
        amount: 100,
      });
      expect(returns(tenYear, 0.1).afterTax).toEqual({
        kind: 'eligible',
        irr: expect.closeTo(0.010475, 6),
      });
    });

    it('caps the deductible premium at 100,000 baht a year', () => {
      // 500 per 1,000 on 1,000,000 => 500,000 premium; refund = 100,000 * 0.35 = 35,000, not 175,000.
      const big = tableOf({
        paymentYears: 1,
        sumAssured: 1_000_000,
        annualPremium: 500,
        maturityBenefit: 600,
        rows: blank(10),
      });
      const refunds = cashflows(big, { kind: 'afterTax', bracket: 0.35 }).filter(
        (f) => f.kind === 'taxRefund',
      );
      expect(refunds).toEqual([{ t: 1, kind: 'taxRefund', amount: 35_000 }]);
    });

    it('is ineligible when coverage is under 10 years', () => {
      const nine = tableOf({ paymentYears: 1, annualPremium: 1000, maturityBenefit: 1100, rows: blank(9) });
      expect(returns(nine, 0.3).afterTax).toEqual({ kind: 'ineligible' });
      expect(cashflows(nine, { kind: 'afterTax', bracket: 0.3 }).some((f) => f.kind === 'taxRefund')).toBe(
        false,
      );
    });

    it('a 0% bracket gives the guaranteed IRR', () => {
      const r = returns(tenYear, 0);
      expect(r.afterTax).toEqual({ kind: 'eligible', irr: r.guaranteed });
    });

    it('only accepts Thai personal income tax brackets', () => {
      // @ts-expect-error 0.12 is not a PIT bracket
      returns(tenYear, 0.12);
    });
  });
});
