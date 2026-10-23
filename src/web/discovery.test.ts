import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ProductSchema } from '../domain/product.ts';
import { discover, parseShopper, serializeShopper, summarize } from './discovery.ts';

const dir = new URL('../../fixtures/', import.meta.url);
const products = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ProductSchema.parse(JSON.parse(readFileSync(new URL(f, dir), 'utf8'))));
const byId = (id: string) => products.find((p) => p.id === id)!;
const shopper = (query: string) => parseShopper(new URLSearchParams(query));

describe('shopper in the URL', () => {
  it('defaults, and a goal picks its sort unless the URL names one', () => {
    expect(shopper('')).toMatchObject({ age: 35, gender: 'M', budget: 50_000, goal: null, sort: 'irr', compare: [] });
    expect(shopper('goal=protect').sort).toBe('death');
    expect(shopper('goal=protect&sort=payYears').sort).toBe('payYears');
  });

  it('round-trips and drops junk', () => {
    const s = shopper('age=28&sex=F&budget=99900&tax=20&goal=tax&pay=7&within=15&sort=breakeven&cmp=a,b,a,c,d');
    expect(s.compare).toEqual(['a', 'b', 'c']);
    expect(parseShopper(new URLSearchParams(serializeShopper(s)))).toEqual(s);
    expect(shopper('goal=rich&sort=x&pay=0&budget=5')).toMatchObject({ goal: null, sort: 'irr', maxPayYears: null, budget: 50_000 });
  });
});

describe('discovery', () => {
  it('prices every product at the same yearly budget', () => {
    // Happy Saving 15/7 is 999 baht per 1,000 sum assured, so 99,900 a year buys exactly the page's 100,000.
    const s = summarize(byId('bla-happy-saving-15-7'), shopper('budget=99900'));
    expect(s.sumAssured).toBeCloseTo(100_000, 6);
    expect(s.annualPremium).toBeCloseTo(99_900, 6);
    expect(s.guaranteedTotal).toBeCloseTo(825_000, 6);
    expect(s.quoteKind).toBe('exact');
  });

  it('filters by how long the shopper will pay and when they need the money', () => {
    const ids = discover(products, shopper('pay=5&within=10')).map((x) => x.product.id).sort();
    expect(ids).toEqual(['bla-prestige-saving-10-4', 'bla-tax-saver-10-5', 'ktaxa-super-save-10-3']);
  });

  it('sorts by the chosen metric', () => {
    const payYears = discover(products, shopper('sort=payYears')).map((x) => x.product.paymentYears);
    expect(payYears).toEqual([...payYears].sort((a, b) => a - b));
    const irrs = discover(products, shopper('sort=irr')).map((x) => x.returns.guaranteed ?? -1);
    expect(irrs).toEqual([...irrs].sort((a, b) => b - a));
    const kinds = discover(products, shopper('sort=breakeven')).map((x) => x.breakeven);
    const years = kinds.flatMap((b) => (b.kind === 'year' ? [b.year] : []));
    expect(years).toEqual([...years].sort((a, b) => a - b));
    // Products with published surrender values come before those without.
    expect(kinds.map((b) => b.kind).join(',')).toMatch(/^(year,)*(unknown,?)*(never,?)*$/);
  });
});
