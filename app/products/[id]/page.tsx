import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { allProducts, INSURERS, productById } from '../../../src/web/catalog.ts';
import { PolicyExplorer } from './policy-explorer.tsx';

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
      <p className="muted">{INSURERS[product.insurerId] ?? product.insurerId}</p>
      <h1>{product.nameTh}</h1>
      <p className="lead">
        จ่ายเบี้ย {product.paymentYears} ปี · คุ้มครอง {product.coverageYears} ปี
      </p>
      <Suspense>
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
