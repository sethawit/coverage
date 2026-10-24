import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { allProducts, INSURERS, productById } from '../../../src/web/catalog.ts';
import { PolicyExplorer } from './policy-explorer.tsx';
import { PageSkeleton } from '../../page-skeleton.tsx';
import { formatBaht } from '../../../src/web/format.ts';
import type { AccidentalDeath } from '../../../src/domain/product.ts';

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return allProducts().map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = productById((await params).id);
  return product ? { title: `${product.nameTh} | Coverage` } : {};
}

export default async function ProductPage({ params }: Props) {
  const product = productById((await params).id);
  if (!product) notFound();
  const verified =
    product.status.kind === 'verified'
      ? `ตรวจสอบแล้วเมื่อ ${product.status.verifiedOn}`
      : 'ยังไม่ได้ตรวจสอบซ้ำโดยทีมงาน';

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">{INSURERS[product.insurerId] ?? product.insurerId}</p>
        <h1>{product.nameTh}</h1>
        <p className="lead">
          จ่ายเบี้ย {product.paymentYears} ปี · คุ้มครอง {product.coverageYears} ปี
        </p>
        {product.accidentalDeath && <p className="lead">{accidentText(product.accidentalDeath)}</p>}
      </header>
      <Suspense fallback={<PageSkeleton />}>
        <PolicyExplorer product={product} />
      </Suspense>
      <footer className="source">
        ข้อมูล ณ วันที่ {product.source.retrievedOn} ({verified}) ที่มา:{' '}
        <a href={product.source.url} target="_blank" rel="noreferrer">
          {product.source.documentTitle}
        </a>
        . ตัวเลขทั้งหมดเป็นข้อมูลเพื่อความเข้าใจ ไม่ใช่ใบเสนอราคา กรุณายืนยันกับบริษัทประกันก่อนตัดสินใจ
      </footer>
    </>
  );
}

function accidentText(a: AccidentalDeath) {
  const of = a.basis === 'sumAssured' ? 'ของทุนประกัน' : 'ของทุนสัญญาเพิ่มเติม';
  const cap = a.capBaht === null ? '' : ` สูงสุด ${formatBaht(a.capBaht)}`;
  return `เสียชีวิตจากอุบัติเหตุ ได้เพิ่มอีก ${a.extraPercentOfSumAssured}% ${of}${cap} (${a.condition}) ยังไม่รวมในตารางด้านล่าง`;
}
