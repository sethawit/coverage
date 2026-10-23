import { Suspense } from 'react';
import { allProducts, INSURERS } from '../src/web/catalog.ts';
import { Discovery } from './discovery.tsx';

export default function Home() {
  return (
    <>
      <header className="page-head hero">
        <div>
          <p className="eyebrow">ประกันชีวิตและออมทรัพย์ในไทย</p>
          <h1>รู้ก่อนซื้อ ว่าเงินที่จ่ายไปจะกลับมาเท่าไร</h1>
          <p className="lead">
            ดูว่าแต่ละแบบให้อะไร ถ้าเสียชีวิตครอบครัวได้เท่าไร และถ้าหยุดจ่ายเบี้ยกลางทางจะได้เงินคืนหรือขาดทุนเท่าไร
            ตัวเลขมาจากเอกสารของบริษัทประกันเท่านั้น
          </p>
        </div>
        <dl className="facts">
          <div>
            <dt>ทำงานยังไง</dt>
            <dd>จ่ายเงินให้บริษัทประกันทุกปีช่วงหนึ่ง แล้วได้เงินคืนเป็นก้อนเมื่อครบสัญญา บางแบบมีเงินคืนระหว่างทางด้วย</dd>
          </div>
          <div>
            <dt>ได้อะไรมากกว่าฝากธนาคาร</dt>
            <dd>ถ้าเสียชีวิตระหว่างสัญญา ครอบครัวได้เงินก้อน และเบี้ยลดหย่อนภาษีได้ ถ้าสัญญายาว 10 ปีขึ้นไป</dd>
          </div>
          <div>
            <dt>ข้อควรรู้</dt>
            <dd>เลิกกลางทางมักได้คืนน้อยกว่าที่จ่าย โดยเฉพาะปีแรก ๆ ใช้เงินที่มั่นใจว่าไม่ต้องใช้จนครบสัญญา</dd>
          </div>
          <div>
            <dt>ลดภาษีได้เท่าไร</dt>
            <dd>
              <a href="/tax">ไปหน้าวางแผนภาษี</a> กรอกรายได้ทีละขั้น แล้วดูว่าซื้อประกันเพิ่มแล้วภาษีลดลงกี่บาท
            </dd>
          </div>
        </dl>
      </header>
      <Suspense>
        <Discovery products={allProducts()} insurers={INSURERS} />
      </Suspense>
    </>
  );
}
