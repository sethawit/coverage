import { baht, type Baht, type Gender } from '../domain/product.ts';
import { TAX_BRACKETS, type TaxBracket } from '../domain/returns.ts';

export type ViewState = {
  age: number;
  gender: Gender;
  sumAssured: Baht;
  bracket: TaxBracket;
  stopYear: number;
};

type Defaults = { age: number; gender: Gender; sumAssured: number; paymentYears: number };

export const int = (raw: string | null, min: number, max: number): number | undefined => {
  if (raw === null || !/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  return n >= min && n <= max ? n : undefined;
};

export function parseViewState(params: URLSearchParams, d: Defaults): ViewState {
  const sex = params.get('sex');
  const taxPercent = int(params.get('tax'), 0, 35);
  const bracket = TAX_BRACKETS.find((b) => Math.round(b * 100) === taxPercent) ?? 0;
  return {
    age: int(params.get('age'), 0, 99) ?? d.age,
    gender: sex === 'M' || sex === 'F' ? sex : d.gender,
    sumAssured: baht(int(params.get('sa'), 1_000, 100_000_000) ?? d.sumAssured),
    bracket,
    stopYear: int(params.get('stop'), 1, d.paymentYears) ?? d.paymentYears,
  };
}

export function serializeViewState(s: ViewState): string {
  return new URLSearchParams({
    age: String(s.age),
    sex: s.gender,
    sa: String(s.sumAssured),
    tax: String(Math.round(s.bracket * 100)),
    stop: String(s.stopYear),
  }).toString();
}
