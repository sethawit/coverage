import { baht, type Baht } from './product.ts';
import type { QuotedRow, QuotedTable } from './quote.ts';

export type Scenarios = {
  death: { payout: Baht };
  surrender: { cash: Baht; totalPremiumsPaid: Baht; net: Baht };
  paidUp: { kind: 'available'; sumAssured: Baht } | { kind: 'unavailable' };
  extendedTerm:
    | { kind: 'available'; years: number; days: number; maturityAmount: Baht }
    | { kind: 'unavailable' };
};

export function scenarios(table: QuotedTable, stopYear: number): Scenarios {
  if (!Number.isInteger(stopYear) || stopYear < 1 || stopYear > table.paymentYears) {
    throw new RangeError(`stopYear must be an integer in 1..${table.paymentYears}, got ${stopYear}`);
  }
  const row = rowAt(table, stopYear);
  const totalPremiumsPaid = premiumsPaidThrough(table, stopYear);
  const cashBack = cashBackThrough(table, stopYear);
  return {
    death: { payout: row.deathBenefit },
    surrender: {
      cash: row.cashValue,
      totalPremiumsPaid: baht(totalPremiumsPaid),
      net: baht(row.cashValue + cashBack - totalPremiumsPaid),
    },
    paidUp:
      row.paidUpSumAssured === undefined
        ? { kind: 'unavailable' }
        : { kind: 'available', sumAssured: row.paidUpSumAssured },
    extendedTerm: row.extendedTerm
      ? { kind: 'available', ...row.extendedTerm }
      : { kind: 'unavailable' },
  };
}

export function breakevenYear(table: QuotedTable): number | null {
  for (let year = 1; year <= table.coverageYears; year++) {
    // At maturity the policyholder receives the maturity benefit; the final-year cash value is not payable.
    const exitValue =
      year === table.coverageYears ? table.maturityBenefit : rowAt(table, year).cashValue;
    if (cashBackThrough(table, year) + exitValue >= premiumsPaidThrough(table, year)) return year;
  }
  return null;
}

export function lossZone(table: QuotedTable): number[] {
  const end = breakevenYear(table) ?? table.coverageYears + 1;
  return Array.from({ length: end - 1 }, (_, i) => i + 1);
}

function rowAt(table: QuotedTable, year: number): QuotedRow {
  const row = table.rows[year - 1];
  if (!row) throw new RangeError(`no row for policy year ${year}`);
  return row;
}

function premiumsPaidThrough(table: QuotedTable, year: number): number {
  return table.annualPremium * Math.min(year, table.paymentYears);
}

function cashBackThrough(table: QuotedTable, year: number): number {
  return table.rows.slice(0, year).reduce((sum, r) => sum + r.guaranteedCashBack, 0);
}
