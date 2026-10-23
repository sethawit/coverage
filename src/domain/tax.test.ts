import { describe, expect, it } from 'vitest';
import { computeTax, headroom, incomeTax, planEffect, type TaxInput } from './tax.ts';

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

const person = (amounts: Record<string, number> = {}, salary = 1_000_000): TaxInput => ({
  salary,
  bonus: 0,
  otherWages: 0,
  withheld: 0,
  amounts,
});

describe('computeTax', () => {
  it('takes the expense deduction, personal allowance and items off income', () => {
    const r = computeTax(person({ sso: 10_500, parents: 2 }));
    expect(r.netIncome).toBe(1_000_000 - 100_000 - 60_000 - 10_500 - 60_000);
    expect(r.tax).toBe(115_000 - 230_500 * 0.2);
  });

  it('caps life plus own health at 100,000', () => {
    const r = computeTax(person({ life: 90_000, health: 25_000 }));
    expect(r.allowed.life! + r.allowed.health!).toBe(100_000);
  });

  it('lets pension premium fill unused life room before its own 15% cap', () => {
    const r = computeTax(person({ life: 40_000, pension: 260_000 }));
    expect(r.allowed.pension).toBe(60_000 + 150_000);
  });

  it('caps the retirement group at 500,000 together', () => {
    const r = computeTax(person({ pvd: 300_000, rmf: 600_000 }, 2_000_000));
    expect(r.allowed.pvd! + r.allowed.rmf!).toBe(500_000);
  });

  it('counts education donations twice, within 10% of income after allowances', () => {
    const r = computeTax(person({ donateDouble: 100_000 }));
    expect(r.allowed.donateDouble).toBe(0.1 * (1_000_000 - 100_000 - 60_000));
  });

  it('reports a refund when more was withheld than owed', () => {
    const r = computeTax({ ...person(), withheld: 200_000 });
    expect(r.balance).toBe(200_000 - r.tax);
  });
});

describe('headroom', () => {
  it('shrinks life insurance room by health premium already paid', () => {
    expect(headroom(person({ health: 25_000 }), 'life').more).toBe(75_000);
  });

  it('gives RMF only what the 500,000 group has left', () => {
    expect(headroom(person({ pvd: 450_000 }, 5_000_000), 'rmf').more).toBe(50_000);
  });

  it('prices the room at the bands it crosses', () => {
    expect(headroom(person({}, 1_100_000), 'life').taxSaved).toBe(100_000 * 0.2);
    // Net 840,000 drops to 740,000, so 90,000 is saved at 20% and 10,000 at 15%.
    expect(headroom(person(), 'life').taxSaved).toBe(90_000 * 0.2 + 10_000 * 0.15);
  });
});

describe('planEffect', () => {
  it('credits each purchase with only the shared cap it really gets', () => {
    const { before, after, rows } = planEffect(person({ life: 30_000 }), [
      { deduction: 'life', amount: 50_000 },
      { deduction: 'health', amount: 25_000 },
    ]);
    expect(rows[0]).toEqual({ deducted: 50_000, taxSaved: 10_000 });
    // The second purchase pulls net income below 750,000, so part of it saves at 15% instead of 20%.
    expect(rows[1]).toEqual({ deducted: 20_000, taxSaved: 10_000 * 0.2 + 10_000 * 0.15 });
    expect(before.netIncome - after.netIncome).toBe(70_000);
  });

  it('leaves the result unchanged for an empty plan', () => {
    const { before, after } = planEffect(person(), []);
    expect(after).toEqual(before);
  });
});
