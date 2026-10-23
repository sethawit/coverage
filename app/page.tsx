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
      <section className="panel plain">
        <h2>ประกันออมทรัพย์คืออะไร</h2>
        <dl>
          <div>
            <dt>ทำงานยังไง</dt>
            <dd>คุณจ่ายเงินให้บริษัทประกันทุกปีช่วงหนึ่ง แล้วได้เงินคืนเป็นก้อนเมื่อครบสัญญา บางแบบมีเงินคืนระหว่างทางด้วย</dd>
          </div>
          <div>
            <dt>ได้อะไรมากกว่าฝากธนาคาร</dt>
            <dd>ถ้าเสียชีวิตระหว่างสัญญา ครอบครัวได้เงินก้อน และเบี้ยที่จ่ายลดหย่อนภาษีได้ ถ้าสัญญายาว 10 ปีขึ้นไป</dd>
          </div>
          <div>
            <dt>ข้อควรรู้</dt>
            <dd>เลิกกลางทางมักได้คืนน้อยกว่าที่จ่าย โดยเฉพาะช่วงปีแรก ๆ ใช้เงินที่มั่นใจว่าไม่ต้องใช้จนครบสัญญา</dd>
          </div>
        </dl>
      </section>
      <Suspense>
        <Discovery products={allProducts()} insurers={INSURERS} />
      </Suspense>
    </>
  );
}
