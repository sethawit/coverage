import { describe, expect, it } from 'vitest';
import { ProductSchema } from './product.ts';
import { illustrationInput, productInput } from './test-support.ts';

const threeYearRows = [{ cashValue: 0 }, { cashValue: 50 }, { cashValue: 120 }];

function validInput() {
  return productInput({
    paymentYears: 2,
    illustrations: [illustrationInput({ rows: threeYearRows })],
  });
}

describe('ProductSchema', () => {
  it('accepts a well-formed product', () => {
    const parsed = ProductSchema.parse(validInput());
    expect(parsed.illustrations[0]?.rows.map((r) => r.year)).toEqual([1, 2, 3]);
  });

  it('rejects an illustration whose row count differs from coverageYears', () => {
    const input = { ...validInput(), coverageYears: 4 };
    expect(ProductSchema.safeParse(input).success).toBe(false);
  });

  it('rejects policy years that are not contiguous from 1', () => {
    const input = validInput();
    const rows = input.illustrations[0]!.rows;
    rows[1] = { ...rows[1]!, year: 3 };
    rows[2] = { ...rows[2]!, year: 2 };
    expect(ProductSchema.safeParse(input).success).toBe(false);
  });

  it('rejects a negative cash value', () => {
    const input = productInput({
      paymentYears: 2,
      illustrations: [illustrationInput({ rows: [{}, { cashValue: -1 }, {}] })],
    });
    expect(ProductSchema.safeParse(input).success).toBe(false);
  });

  it('rejects non-finite money', () => {
    const input = productInput({
      paymentYears: 2,
      illustrations: [illustrationInput({ annualPremium: Infinity, rows: threeYearRows })],
    });
    expect(ProductSchema.safeParse(input).success).toBe(false);
  });

  it('rejects paymentYears greater than coverageYears', () => {
    const input = { ...validInput(), paymentYears: 4 };
    expect(ProductSchema.safeParse(input).success).toBe(false);
  });

  it('rejects a product with no illustrations', () => {
    const input = { ...validInput(), illustrations: [] };
    expect(ProductSchema.safeParse(input).success).toBe(false);
  });

  it('rejects two illustrations for the same age and gender', () => {
    const one = illustrationInput({ rows: threeYearRows });
    const input = productInput({ paymentYears: 2, illustrations: [one, one] });
    expect(ProductSchema.safeParse(input).success).toBe(false);
  });

  it('rejects a verified status without a verifier', () => {
    const input = { ...validInput(), status: { kind: 'verified', verifiedOn: '2026-10-23' } };
    expect(ProductSchema.safeParse(input).success).toBe(false);
  });
});
