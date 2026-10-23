import {
  baht,
  type Baht,
  type Gender,
  type Illustration,
  type IllustrationRow,
  type PerThousand,
  type Product,
} from './product.ts';

export type Profile = { age: number; gender: Gender; sumAssured: Baht };

export type QuotedRow = {
  year: number;
  deathBenefit: Baht;
  guaranteedCashBack: Baht;
  illustratedDividend: Baht;
  cashValue: Baht;
  paidUpSumAssured?: Baht;
  extendedTerm?: { years: number; days: number; maturityAmount: Baht };
};

export type QuotedTable = {
  paymentYears: number;
  coverageYears: number;
  annualPremium: Baht;
  maturityBenefit: Baht;
  rows: QuotedRow[];
};

export type Quote =
  | { kind: 'exact'; table: QuotedTable }
  | { kind: 'sample'; sampleAge: number; sampleGender: Gender; table: QuotedTable };

export function quote(product: Product, profile: Profile): Quote {
  const exact = product.illustrations.find(
    (ill) => ill.age === profile.age && ill.gender === profile.gender,
  );
  if (exact) return { kind: 'exact', table: scale(product, exact, profile.sumAssured) };

  const sample =
    product.illustrations.find((ill) => ill.basis === 'brochureSample') ?? product.illustrations[0];
  return {
    kind: 'sample',
    sampleAge: sample.age,
    sampleGender: sample.gender,
    table: scale(product, sample, profile.sumAssured),
  };
}

function scale(product: Product, ill: Illustration, sumAssured: Baht): QuotedTable {
  const k = sumAssured / 1000;
  const toBaht = (amount: PerThousand): Baht => baht(amount * k);
  return {
    paymentYears: product.paymentYears,
    coverageYears: product.coverageYears,
    annualPremium: toBaht(ill.annualPremium),
    maturityBenefit: toBaht(ill.maturityBenefit),
    rows: ill.rows.map((row) => scaleRow(row, toBaht)),
  };
}

function scaleRow(row: IllustrationRow, toBaht: (a: PerThousand) => Baht): QuotedRow {
  return {
    year: row.year,
    deathBenefit: toBaht(row.deathBenefit),
    guaranteedCashBack: toBaht(row.guaranteedCashBack),
    illustratedDividend: toBaht(row.illustratedDividend),
    cashValue: toBaht(row.cashValue),
    ...(row.paidUpSumAssured !== undefined && { paidUpSumAssured: toBaht(row.paidUpSumAssured) }),
    ...(row.extendedTerm && {
      extendedTerm: {
        years: row.extendedTerm.years,
        days: row.extendedTerm.days,
        maturityAmount: toBaht(row.extendedTerm.maturityAmount),
      },
    }),
  };
}
