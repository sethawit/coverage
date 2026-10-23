import { ProductSchema, type Product } from './product.ts';

type RowInput = {
  deathBenefit?: number;
  guaranteedCashBack?: number;
  illustratedDividend?: number;
  cashValue?: number | null;
  paidUpSumAssured?: number;
  extendedTerm?: { years: number; days: number; maturityAmount: number };
};

type IllustrationInput = {
  age?: number;
  gender?: 'M' | 'F';
  basis?: 'contractTable' | 'brochureSample';
  annualPremium?: number;
  maturityBenefit?: number;
  rows: RowInput[];
};

export function illustrationInput({
  age = 35,
  gender = 'M',
  basis = 'contractTable',
  annualPremium = 100,
  maturityBenefit = 1000,
  rows,
}: IllustrationInput) {
  return {
    age,
    gender,
    basis,
    annualPremium,
    maturityBenefit,
    rows: rows.map((r, i) => ({
      year: i + 1,
      deathBenefit: 1000,
      guaranteedCashBack: 0,
      illustratedDividend: 0,
      cashValue: 0,
      ...r,
    })),
  };
}

export function productInput({
  paymentYears,
  illustrations,
}: {
  paymentYears: number;
  illustrations: ReturnType<typeof illustrationInput>[];
}) {
  return {
    id: 'test-product',
    insurerId: 'test-insurer',
    nameTh: 'ทดสอบ',
    kind: 'endowment',
    paymentYears,
    coverageYears: illustrations[0]?.rows.length ?? 0,
    source: {
      url: 'https://example.com/brochure.pdf',
      documentTitle: 'Test brochure',
      retrievedOn: '2026-10-23',
    },
    status: { kind: 'draft' },
    illustrations,
  };
}

export function product(args: Parameters<typeof productInput>[0]): Product {
  return ProductSchema.parse(productInput(args));
}
