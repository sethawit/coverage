import Link from 'next/link';
import { allProducts, INSURERS } from '../src/web/catalog.ts';

const kindLabel = { endowment: 'สะสมทรัพย์', wholeLife: 'ตลอดชีพ', term: 'ชั่วระยะเวลา' } as const;

export default function Home() {
  const products = allProducts();
  return (
    <>
      <h1>ประกันชีวิตและออมทรัพย์</h1>
      <p className="lead">
        ดูว่าแต่ละแบบให้อะไร ถ้าเสียชีวิตได้เท่าไร และถ้าหยุดจ่ายเบี้ยกลางทางจะได้เงินคืนหรือขาดทุนเท่าไร
      </p>
      <ul className="product-list">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/products/${p.id}`} className="product-card">
              <span className="muted">{INSURERS[p.insurerId] ?? p.insurerId}</span>
              <strong>{p.nameTh}</strong>
              <span className="muted">
                {kindLabel[p.kind]} · จ่ายเบี้ย {p.paymentYears} ปี · คุ้มครอง {p.coverageYears} ปี
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
