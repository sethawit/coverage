'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Product } from '../../src/domain/product.ts';
import { parseShopper, serializeShopper, summarize, type Summary } from '../../src/web/discovery.ts';
import { breakevenLabel, formatBaht, formatPercent, genderLabel, UNPUBLISHED } from '../../src/web/format.ts';
import { productHref } from '../shopper-link.ts';
import { NetChart } from './net-chart.tsx';

type Row = { label: string; value: (x: Summary) => string; note?: string };

const ROWS: Row[] = [
  { label: 'จ่ายกี่ปี / ได้คืนครบในกี่ปี', value: (x) => `${x.product.paymentYears} / ${x.product.coverageYears} ปี` },
  { label: 'ทุนประกันที่ได้ (ตัวเลขตั้งต้น)', value: (x) => formatBaht(x.sumAssured) },
  { label: 'จ่ายรวม', value: (x) => formatBaht(x.totalPremiums) },
  { label: 'ได้คืนรวมแน่นอน', value: (x) => formatBaht(x.guaranteedTotal) },
  { label: 'กำไรที่ได้แน่นอน', value: (x) => formatBaht(x.guaranteedTotal - x.totalPremiums) },
  { label: 'เท่ากับฝากได้ดอกเบี้ยปีละ', value: (x) => formatPercent(x.returns.guaranteed) },
  {
    label: 'ถ้าได้เงินปันผลตามตัวอย่าง',
    note: 'ไม่รับประกัน อาจไม่ได้',
    value: (x) => formatPercent(x.returns.withDividends),
  },
  {
    label: 'รวมภาษีที่ได้คืน',
    value: (x) => (x.returns.afterTax.kind === 'eligible' ? formatPercent(x.returns.afterTax.irr) : 'ไม่เข้าเงื่อนไข'),
  },
  {
    label: 'เลิกได้โดยไม่ขาดทุน',
    value: (x) => breakevenLabel(x.breakeven, x.product.coverageYears),
  },
  {
    label: 'ถ้าเลิกหลังจ่ายปีแรก',
    value: (x) => {
      const first = x.positions[0];
      if (!first) return '-';
      if (first.moneyOut === null) return UNPUBLISHED;
      const net = first.moneyOut - first.premiumsPaid;
      return `${net < 0 ? 'ขาดทุน' : 'กำไร'} ${formatBaht(Math.abs(net))}`;
    },
  },
  { label: 'ครอบครัวได้สูงสุดถ้าเสียชีวิต', value: (x) => formatBaht(x.peakDeath) },
  { label: 'ที่มาของตัวเลข', value: (x) => (x.quoteKind === 'exact' ? 'ตรงอายุและเพศคุณ' : 'ตัวอย่างของบริษัท') },
];

export function CompareView({ products, insurers }: { products: Product[]; insurers: Record<string, string> }) {
  const shopper = parseShopper(new URLSearchParams(useSearchParams().toString()));
  const picked = shopper.compare
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => p !== undefined)
    .map((p) => summarize(p, shopper));

  return (
    <div className="explorer">
      <p className="lead">
        {genderLabel[shopper.gender]} อายุ {shopper.age} ปี เบี้ย {formatBaht(shopper.budget)} ต่อปี เสียภาษีขั้น{' '}
        {Math.round(shopper.bracket * 100)}% · <Link href={`/?${serializeShopper(shopper)}`}>แก้ไขหรือเลือกแบบอื่น</Link>
      </p>
      {picked.length < 2 ? (
        <p className="panel">
          เลือกอย่างน้อย 2 แบบเพื่อเปรียบเทียบ <Link href={`/?${serializeShopper(shopper)}`}>กลับไปเลือก</Link>
        </p>
      ) : (
        <>
          <section className="panel">
            <h2>ถ้าเลิกแต่ละปี กำไรหรือขาดทุนเท่าไร</h2>
            <p className="muted small">
              เงินทั้งหมดที่ได้คืนถ้าเลิกปีนั้น ลบเงินที่จ่ายไป
              ใต้เส้นศูนย์คือขาดทุน
            </p>
            <NetChart series={picked} />
          </section>
          <section className="panel table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th />
                  {picked.map((x, i) => (
                    <th key={x.product.id}>
                      <i className={`swatch s${i + 1}`} />
                      <span className="muted small">{insurers[x.product.insurerId] ?? x.product.insurerId}</span>
                      <br />
                      <Link href={productHref(x, shopper)}>{x.product.nameTh}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">
                      {row.label}
                      {row.note && <span className="muted small"> ({row.note})</span>}
                    </th>
                    {picked.map((x) => (
                      <td key={x.product.id}>{row.value(x)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
