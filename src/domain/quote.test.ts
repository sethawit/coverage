import { describe, expect, it } from 'vitest';
import { baht } from './product.ts';
import { quote } from './quote.ts';
import { illustrationInput, product } from './test-support.ts';

const male35 = illustrationInput({
  age: 35,
  gender: 'M',
  annualPremium: 300,
  maturityBenefit: 1100,
  rows: [
    { deathBenefit: 1000, guaranteedCashBack: 20, cashValue: 150, paidUpSumAssured: 400 },
    {
      deathBenefit: 1000,
      guaranteedCashBack: 20,
      illustratedDividend: 5,
      cashValue: 450,
      extendedTerm: { years: 1, days: 120, maturityAmount: 900 },
    },
  ],
});

const female40Sample = illustrationInput({
  age: 40,
  gender: 'F',
  basis: 'brochureSample',
  annualPremium: 310,
  maturityBenefit: 1100,
  rows: [{ cashValue: 140 }, { cashValue: 440 }],
});

const p = product({ paymentYears: 2, illustrations: [male35, female40Sample] });

describe('quote', () => {
  it('returns the exact table when age and gender match, scaled per 1,000', () => {
    const q = quote(p, { age: 35, gender: 'M', sumAssured: baht(500_000) });
    expect(q.kind).toBe('exact');
    // 500,000 / 1,000 = 500x: premium 300 -> 150,000; cash value year 2: 450 -> 225,000
    expect(q.table.annualPremium).toBe(150_000);
    expect(q.table.maturityBenefit).toBe(550_000);
    expect(q.table.rows[1]).toEqual({
      year: 2,
      deathBenefit: 500_000,
      guaranteedCashBack: 10_000,
      illustratedDividend: 2_500,
      cashValue: 225_000,
      extendedTerm: { years: 1, days: 120, maturityAmount: 450_000 },
    });
    expect(q.table.rows[0]?.paidUpSumAssured).toBe(200_000);
  });

  it('doubles every amount when sum assured goes from 500k to 1M', () => {
    const half = quote(p, { age: 35, gender: 'M', sumAssured: baht(500_000) }).table;
    const full = quote(p, { age: 35, gender: 'M', sumAssured: baht(1_000_000) }).table;
    expect(full.annualPremium).toBe(half.annualPremium * 2);
    expect(full.maturityBenefit).toBe(half.maturityBenefit * 2);
    full.rows.forEach((row, i) => {
      const h = half.rows[i]!;
      expect(row.deathBenefit).toBe(h.deathBenefit * 2);
      expect(row.cashValue).toBe(h.cashValue * 2);
      expect(row.guaranteedCashBack).toBe(h.guaranteedCashBack * 2);
    });
  });

  it('falls back to the brochure sample, unadjusted, when age differs', () => {
    const q = quote(p, { age: 50, gender: 'M', sumAssured: baht(100_000) });
    expect(q).toMatchObject({ kind: 'sample', sampleAge: 40, sampleGender: 'F' });
    // No age adjustment: the 40F premium 310/1,000 times 100 is shown as is.
    expect(q.table.annualPremium).toBe(31_000);
  });

  it('falls back to a sample when only gender differs', () => {
    const q = quote(p, { age: 35, gender: 'F', sumAssured: baht(100_000) });
    expect(q.kind).toBe('sample');
  });

  it('falls back to the first illustration when no brochure sample exists', () => {
    const onlyTable = product({ paymentYears: 2, illustrations: [male35] });
    const q = quote(onlyTable, { age: 20, gender: 'F', sumAssured: baht(1_000) });
    expect(q).toMatchObject({ kind: 'sample', sampleAge: 35, sampleGender: 'M' });
    expect(q.table.annualPremium).toBe(300);
  });

  it('carries payment and coverage years onto the quoted table', () => {
    const { table } = quote(p, { age: 35, gender: 'M', sumAssured: baht(1_000) });
    expect(table).toMatchObject({ paymentYears: 2, coverageYears: 2 });
  });
});
