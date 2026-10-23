import { Suspense } from 'react';
import { allProducts, INSURERS } from '../src/web/catalog.ts';
import { Discovery } from './discovery.tsx';

export default function Home() {
  return (
    <>
      <h1>ประกันชีวิตและออมทรัพย์</h1>
      <p className="lead">
        ดูว่าแต่ละแบบให้อะไร ถ้าเสียชีวิตได้เท่าไร และถ้าหยุดจ่ายเบี้ยกลางทางจะได้เงินคืนหรือขาดทุนเท่าไร
      </p>
      <Suspense>
        <Discovery products={allProducts()} insurers={INSURERS} />
      </Suspense>
    </>
  );
}
