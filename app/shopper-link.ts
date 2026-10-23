import type { Shopper, Summary } from '../src/web/discovery.ts';

/** The product page takes a sum assured, so pass the one the shopper's budget buys. */
export function productHref(x: Summary, s: Shopper): string {
  const params = new URLSearchParams({
    age: String(s.age),
    sex: s.gender,
    sa: String(Math.round(x.sumAssured)),
    tax: String(Math.round(s.bracket * 100)),
  });
  return `/products/${x.product.id}?${params}`;
}
