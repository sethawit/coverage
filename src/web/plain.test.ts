import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { baht, ProductSchema } from '../domain/product.ts';
import { quote } from '../domain/quote.ts';
import { returns } from '../domain/returns.ts';
import { breakeven } from '../domain/scenarios.ts';
import { plainStory } from './plain.ts';

const load = (file: string) =>
  ProductSchema.parse(JSON.parse(readFileSync(new URL(`../../fixtures/${file}`, import.meta.url), 'utf8')));

describe('plainStory', () => {
  // Figures from https://www.bangkoklife.com/th/products/detail/262: 35-year-old man, 100,000 sum assured.
  const { table } = quote(load('bla-tax-saver-10-5.json'), { age: 35, gender: 'M', sumAssured: baht(100_000) });
  const story = plainStory(table, breakeven(table), returns(table, 0).guaranteed);
  const text = (title: string) => story.find((p) => p.title === title)?.text ?? '';

  it('says what is paid and what comes back in baht', () => {
    expect(text('คุณจ่าย')).toBe('ปีละ 93,300 บาท ติดกัน 5 ปี รวม 466,500 บาท');
    expect(text('คุณได้คืน')).toContain('รวมทั้งหมด 515,000 บาท');
    expect(text('ถ้าถือจนครบ')).toMatch(/^ได้มากกว่าที่จ่าย 48,500 บาท เท่ากับเอาเงินไปฝาก/);
  });

  it('mentions tax only when coverage is at least 10 years', () => {
    expect(story.some((p) => p.title === 'ภาษี')).toBe(true);
    const short = { ...table, coverageYears: 9 };
    expect(plainStory(short, breakeven(table), null).some((p) => p.title === 'ภาษี')).toBe(false);
  });

  it('says a loss plainly when total back is below total paid', () => {
    const lossy = { ...table, maturityBenefit: baht(0) };
    expect(plainStory(lossy, { kind: 'never' }, null).find((p) => p.title === 'ถ้าถือจนครบ')?.text).toMatch(
      /^ได้คืนน้อยกว่าที่จ่าย/,
    );
  });
});
