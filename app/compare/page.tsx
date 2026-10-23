import type { Metadata } from 'next';
import { Suspense } from 'react';
import { allProducts, INSURERS } from '../../src/web/catalog.ts';
import { CompareView } from './compare-view.tsx';

export const metadata: Metadata = { title: 'เปรียบเทียบ | Coverage' };

export default function ComparePage() {
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">วางคู่กัน ดูทีละเรื่อง</p>
        <h1>เปรียบเทียบ</h1>
      </header>
      <Suspense>
        <CompareView products={allProducts()} insurers={INSURERS} />
      </Suspense>
      <footer className="source">
        ตัวเลขทั้งหมดมาจากตัวอย่างในหน้าผลิตภัณฑ์ของแต่ละบริษัท ปรับตามงบเบี้ยของคุณ เป็นข้อมูลเพื่อความเข้าใจ
        ไม่ใช่ใบเสนอราคา และไม่ใช่คำแนะนำว่าแบบไหนเหมาะกับคุณ
      </footer>
    </>
  );
}
