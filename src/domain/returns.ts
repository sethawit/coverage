import type { QuotedTable } from './quote.ts';

export const TAX_BRACKETS = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35] as const;
export type TaxBracket = (typeof TAX_BRACKETS)[number];

const DEDUCTIBLE_PREMIUM_CAP = 100_000;
const MIN_DEDUCTIBLE_COVERAGE_YEARS = 10;

export type CashflowKind = 'premium' | 'cashBack' | 'dividend' | 'maturity' | 'taxRefund';
export type Cashflow = { t: number; kind: CashflowKind; amount: number };

export type ReturnVariant =
  | { kind: 'guaranteed' }
  | { kind: 'withDividends' }
  | { kind: 'afterTax'; bracket: TaxBracket };

export type Returns = {
  guaranteed: number | null;
  withDividends: number | null;
  afterTax: { kind: 'eligible'; irr: number | null } | { kind: 'ineligible' };
};

export function returns(table: QuotedTable, bracket: TaxBracket): Returns {
  return {
    guaranteed: irr(cashflows(table, { kind: 'guaranteed' })),
    withDividends: irr(cashflows(table, { kind: 'withDividends' })),
    afterTax: isTaxDeductible(table)
      ? { kind: 'eligible', irr: irr(cashflows(table, { kind: 'afterTax', bracket })) }
      : { kind: 'ineligible' },
  };
}

export function cashflows(table: QuotedTable, variant: ReturnVariant): Cashflow[] {
  const flows: Cashflow[] = [];
  const refund =
    variant.kind === 'afterTax' && isTaxDeductible(table)
      ? Math.min(table.annualPremium, DEDUCTIBLE_PREMIUM_CAP) * variant.bracket
      : 0;
  for (const row of table.rows) {
    const t = row.year;
    if (t <= table.paymentYears) {
      flows.push({ t: t - 1, kind: 'premium', amount: -table.annualPremium });
    }
    if (row.guaranteedCashBack > 0) {
      flows.push({ t, kind: 'cashBack', amount: row.guaranteedCashBack });
    }
    if (variant.kind === 'withDividends' && row.illustratedDividend > 0) {
      flows.push({ t, kind: 'dividend', amount: row.illustratedDividend });
    }
    if (refund > 0 && t <= table.paymentYears) {
      flows.push({ t, kind: 'taxRefund', amount: refund });
    }
  }
  flows.push({ t: table.coverageYears, kind: 'maturity', amount: table.maturityBenefit });
  return flows.sort((a, b) => a.t - b.t);
}

function isTaxDeductible(table: QuotedTable): boolean {
  return table.coverageYears >= MIN_DEDUCTIBLE_COVERAGE_YEARS;
}

const npv = (flows: readonly { t: number; amount: number }[], rate: number) =>
  flows.reduce((sum, f) => sum + f.amount / (1 + rate) ** f.t, 0);

// Coarse grid first so bisection starts from a real bracket; -99% is as low as a rate can meaningfully go.
const RATE_GRID = [-0.99, -0.5, -0.2, -0.1, -0.05, 0, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];

export function irr(flows: readonly { t: number; amount: number }[]): number | null {
  for (let i = 0; i < RATE_GRID.length - 1; i++) {
    let lo = RATE_GRID[i]!;
    let hi = RATE_GRID[i + 1]!;
    let fLo = npv(flows, lo);
    const fHi = npv(flows, hi);
    if (fLo === 0 && flows.length > 0) return lo;
    if (Math.sign(fLo) === Math.sign(fHi)) continue;
    for (let iter = 0; iter < 200 && hi - lo > 1e-14; iter++) {
      const mid = (lo + hi) / 2;
      const fMid = npv(flows, mid);
      if (fMid === 0) return mid;
      if (Math.sign(fMid) === Math.sign(fLo)) {
        lo = mid;
        fLo = fMid;
      } else {
        hi = mid;
      }
    }
    return (lo + hi) / 2;
  }
  return null;
}
