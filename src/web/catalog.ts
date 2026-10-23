import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProductSchema, type Product } from '../domain/product.ts';

const productsDir = join(process.cwd(), 'fixtures');

export const INSURERS: Record<string, string> = {
  'bangkok-life': 'กรุงเทพประกันชีวิต',
  'krungthai-axa': 'กรุงไทย-แอกซ่า ประกันชีวิต',
  'chubb-life': 'ชับบ์ ไลฟ์ ประกันชีวิต',
  'ocean-life': 'ไทยสมุทรประกันชีวิต',
};

export function allProducts(): Product[] {
  return readdirSync(productsDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const result = ProductSchema.safeParse(JSON.parse(readFileSync(join(productsDir, f), 'utf8')));
      if (!result.success) throw new Error(`${f} fails the product schema: ${result.error.message}`);
      return result.data;
    });
}

export function productById(id: string): Product | undefined {
  return allProducts().find((p) => p.id === id);
}
