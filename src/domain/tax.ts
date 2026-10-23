// Thai personal income tax, from the Revenue Department's rate table and allowances in effect since tax year 2560:
// https://rd.go.th/59670.html (rates), https://www.rd.go.th/27966.html (expense deduction and personal allowance).
// Life premium caps from https://www.chubb.com/th-th/personal/tax-deduction-benefit.html.

/** Upper bound of each net-income band and its rate; the first 150,000 is exempt. */
const RATE_TABLE: readonly { upTo: number; rate: number }[] = [
  { upTo: 150_000, rate: 0 },
  { upTo: 300_000, rate: 0.05 },
  { upTo: 500_000, rate: 0.1 },
  { upTo: 750_000, rate: 0.15 },
  { upTo: 1_000_000, rate: 0.2 },
  { upTo: 2_000_000, rate: 0.25 },
  { upTo: 5_000_000, rate: 0.3 },
  { upTo: Infinity, rate: 0.35 },
];

const EXPENSE_RATE = 0.5;
const EXPENSE_CAP = 100_000;
export const PERSONAL_ALLOWANCE = 60_000;
export const LIFE_PREMIUM_CAP = 100_000;

export function incomeTax(netIncome: number): number {
  let tax = 0;
  let lower = 0;
  for (const { upTo, rate } of RATE_TABLE) {
    if (netIncome <= lower) break;
    tax += (Math.min(netIncome, upTo) - lower) * rate;
    lower = upTo;
  }
  return Math.round(tax);
}

export function topRate(netIncome: number): number {
  return RATE_TABLE.find((b) => netIncome <= b.upTo)!.rate;
}

export type TaxInput = {
  /** Salary and bonus for the whole year, before anything is taken off. */
  income: number;
  /** Allowances the person already claims besides life insurance: social security, funds, children, parents. */
  otherAllowances: number;
  /** Life and health premiums already paid this year. */
  premiumsAlready: number;
};

export type TaxPlan = {
  expenseDeduction: number;
  netIncome: number;
  tax: number;
  topRate: number;
  /** How much more life premium this year still lowers tax. */
  room: number;
};

const netIncome = (i: TaxInput, premiums: number) =>
  Math.max(
    0,
    i.income -
      Math.min(i.income * EXPENSE_RATE, EXPENSE_CAP) -
      PERSONAL_ALLOWANCE -
      i.otherAllowances -
      Math.min(premiums, LIFE_PREMIUM_CAP),
  );

export function planTax(i: TaxInput): TaxPlan {
  const net = netIncome(i, i.premiumsAlready);
  return {
    expenseDeduction: Math.min(i.income * EXPENSE_RATE, EXPENSE_CAP),
    netIncome: net,
    tax: incomeTax(net),
    topRate: topRate(net),
    room: Math.max(0, LIFE_PREMIUM_CAP - i.premiumsAlready),
  };
}

/** Tax saved in a year by paying `extraPremium` more in deductible life premium. */
export function taxSaved(i: TaxInput, extraPremium: number): number {
  return incomeTax(netIncome(i, i.premiumsAlready)) - incomeTax(netIncome(i, i.premiumsAlready + extraPremium));
}
