import { baht, type Baht } from './product.ts';
import type { QuotedRow, QuotedTable } from './quote.ts';

export type Scenarios = {
  death: { payout: Baht };
  surrender:
    | { kind: 'available'; cash: Baht; totalPremiumsPaid: Baht; net: Baht }
    | { kind: 'unpublished'; totalPremiumsPaid: Baht };
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
    surrender:
      row.cashValue === null
        ? { kind: 'unpublished', totalPremiumsPaid: baht(totalPremiumsPaid) }
        : {
            kind: 'available',
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

/** moneyOut is null for a year whose surrender value the source does not publish. */
export type YearPosition = { year: number; premiumsPaid: Baht; moneyOut: Baht | null };

/** Per policy year: premiums paid so far vs. everything the holder has or gets by leaving at the end of that year. */
export function yearlyPositions(table: QuotedTable): YearPosition[] {
  return table.rows.map(({ year, cashValue }) => {
    // At maturity the policyholder receives the maturity benefit; the final-year cash value is not payable.
    const exitValue = year === table.coverageYears ? table.maturityBenefit : cashValue;
    return {
      year,
      premiumsPaid: baht(premiumsPaidThrough(table, year)),
      moneyOut: exitValue === null ? null : baht(cashBackThrough(table, year) + exitValue),
    };
  });
}

/**
 * The first year leaving recovers every premium. When an earlier year's surrender value is unpublished,
 * the true year is unknown; `byYear` is the latest it can be.
 */
export type Breakeven =
  | { kind: 'year'; year: number }
  | { kind: 'never' }
  | { kind: 'unknown'; byYear: number | null };

export function breakeven(table: QuotedTable): Breakeven {
  const positions = yearlyPositions(table);
  const first = positions.find((p) => p.moneyOut !== null && p.moneyOut >= p.premiumsPaid);
  const unknownBefore = positions.some((p) => p.moneyOut === null && (!first || p.year < first.year));
  if (unknownBefore) return { kind: 'unknown', byYear: first?.year ?? null };
  return first ? { kind: 'year', year: first.year } : { kind: 'never' };
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
