'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Product } from '../../src/domain/product.ts';
import { parseShopper, serializeShopper, summarize, type Summary } from '../../src/web/discovery.ts';
import { formatBaht, formatPercent, genderLabel } from '../../src/web/format.ts';
import { productHref } from '../shopper-link.ts';
import { NetChart } from './net-chart.tsx';

type Row = { label: string; value: (x: Summary) => string; note?: string };

const ROWS: Row[] = [
  { label: 'จ่ายเบี้ย / คุ้มครอง', value: (x) => `${x.product.paymentYears} / ${x.product.coverageYears} ปี` },
  { label: 'ทุนประกันที่ได้', value: (x) => formatBaht(x.sumAssured) },
  { label: 'เบี้ยรวม', value: (x) => formatBaht(x.totalPremiums) },
  { label: 'ได้คืนรวม (รับประกัน)', value: (x) => formatBaht(x.guaranteedTotal) },
  { label: 'กำไรรับประกัน', value: (x) => formatBaht(x.guaranteedTotal - x.totalPremiums) },
  { label: 'ผลตอบแทนรับประกัน', value: (x) => formatPercent(x.returns.guaranteed) },
  {
    label: 'รวมเงินปันผลตามตัวอย่าง',
    note: 'ไม่รับประกัน',
    value: (x) => formatPercent(x.returns.withDividends),
  },
  {
    label: 'รวมภาษีที่ประหยัดได้',
    value: (x) => (x.returns.afterTax.kind === 'eligible' ? formatPercent(x.returns.afterTax.irr) : 'ไม่เข้าเงื่อนไข'),
  },
  {
    label: 'ออกได้ไม่ขาดทุน',
    value: (x) =>
      x.breakeven === null
        ? 'ไม่คืนทุน'
        : x.breakeven === x.product.coverageYears
          ? `ครบสัญญาปีที่ ${x.breakeven}`
          : `ตั้งแต่ปีที่ ${x.breakeven}`,
  },
  {
    label: 'ถ้าออกหลังปีที่ 1',
    value: (x) => {
      const first = x.positions[0];
      if (!first) return '-';
      const net = first.moneyOut - first.premiumsPaid;
      return `${net < 0 ? 'ขาดทุน' : 'กำไร'} ${formatBaht(Math.abs(net))}`;
    },
  },
  { label: 'คุ้มครองชีวิตสูงสุด', value: (x) => formatBaht(x.peakDeath) },
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
        {genderLabel[shopper.gender]} อายุ {shopper.age} ปี · เบี้ย {formatBaht(shopper.budget)} ต่อปี · ฐานภาษี{' '}
        {Math.round(shopper.bracket * 100)}% · <Link href={`/?${serializeShopper(shopper)}`}>แก้ไขหรือเลือกแบบอื่น</Link>
      </p>
      {picked.length < 2 ? (
        <p className="panel">
          เลือกอย่างน้อย 2 แบบเพื่อเปรียบเทียบ <Link href={`/?${serializeShopper(shopper)}`}>กลับไปเลือก</Link>
        </p>
      ) : (
        <>
          <section className="panel">
            <h2>ถ้าออกตอนสิ้นปี ได้กำไรหรือขาดทุนเท่าไร</h2>
            <p className="muted small">
              เงินที่ได้คืนทั้งหมด (เงินคืนที่รับแล้ว + มูลค่าเวนคืน หรือเงินครบสัญญา) ลบเบี้ยที่จ่ายไป
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
