import { describe, expect, it } from 'vitest';
import { incomeTax, planTax, taxSaved } from './tax.ts';

describe('incomeTax', () => {
  it('matches the cumulative column of the Revenue Department table', () => {
    expect(incomeTax(150_000)).toBe(0);
    expect(incomeTax(300_000)).toBe(7_500);
    expect(incomeTax(500_000)).toBe(27_500);
    expect(incomeTax(750_000)).toBe(65_000);
    expect(incomeTax(1_000_000)).toBe(115_000);
    expect(incomeTax(2_000_000)).toBe(365_000);
    expect(incomeTax(5_000_000)).toBe(1_265_000);
  });
});

describe('planTax', () => {
  const salaried = { income: 700_000, otherAllowances: 9_000, premiumsAlready: 0 };

  it('takes the expense deduction and personal allowance off salary', () => {
    const p = planTax(salaried);
    expect(p.netIncome).toBe(700_000 - 100_000 - 60_000 - 9_000);
    expect(p.tax).toBe(27_500 + 31_000 * 0.15);
    expect(p.topRate).toBe(0.15);
    expect(p.room).toBe(100_000);
  });

  it('saves tax across a band boundary at each band rate', () => {
    expect(taxSaved(salaried, 100_000)).toBe(31_000 * 0.15 + 69_000 * 0.1);
  });

  it('gives nothing for premium beyond the 100,000 cap', () => {
    expect(taxSaved({ ...salaried, premiumsAlready: 80_000 }, 50_000)).toBe(taxSaved({ ...salaried, premiumsAlready: 80_000 }, 20_000));
    expect(planTax({ ...salaried, premiumsAlready: 120_000 }).room).toBe(0);
  });

  it('saves nothing when income is already below tax', () => {
    expect(taxSaved({ income: 300_000, otherAllowances: 0, premiumsAlready: 0 }, 50_000)).toBe(0);
  });
});
