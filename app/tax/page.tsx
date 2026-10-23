import type { Metadata } from 'next';
import { Suspense } from 'react';
import { allProducts, INSURERS } from '../../src/web/catalog.ts';
import { TaxPlanner } from './tax-planner.tsx';
import { PageSkeleton } from '../page-skeleton.tsx';

export const metadata: Metadata = { title: 'วางแผนภาษี · Coverage' };

export default function TaxPage() {
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">ภาษีเงินได้บุคคลธรรมดา ปีภาษี 2569</p>
        <h1>คำนวณและวางแผนภาษี</h1>
        <p className="lead">
          กรอกทีละขั้น ใช้เวลาไม่กี่นาที แต่ละช่องบอกเพดานสูงสุดและหักได้จริงเท่าไร ด้านข้างบอกทันทีว่าจะได้ภาษีคืนหรือต้องจ่ายเพิ่ม
        </p>
      </header>
      <Suspense fallback={<PageSkeleton aside={false} />}>
        <TaxPlanner products={allProducts()} insurers={INSURERS} />
      </Suspense>
      <p className="source">
        อัตราภาษีจาก<a href="https://rd.go.th/59670.html">กรมสรรพากร</a> ค่าใช้จ่ายและลดหย่อนส่วนตัวจาก
        <a href="https://www.rd.go.th/27966.html">กรมสรรพากร</a> เพดานลดหย่อนปี 2569 จาก
        <a href="https://www.finnomena.com/finnomenafunds/tax-deduction-guide/">FINNOMENA</a>{' '}
        <a href="https://www.krungsri.com/th/krungsri-the-coach/taxes/tax-knowledge/tax-deduction-guide">กรุงศรี</a> และ
        <a href="https://www.scb.co.th/th/personal-banking/stories/salary-man/tax-planning-2026">SCB</a> ประกันสังคมจาก
        <a href="https://flowaccount.com/blog/new-social-security-ceiling-2026/">FlowAccount</a> เงื่อนไขเบี้ยประกันจาก
        <a href="https://www.chubb.com/th-th/personal/tax-deduction-benefit.html">ชับบ์ ไลฟ์</a> ยังไม่รวม SSF ค่าลดหย่อนเฉพาะกิจอื่น
        และเงินได้ประเภทอื่นนอกจาก 40(1) 40(2) ตัวเลขเป็นการประมาณ ไม่ใช่คำแนะนำทางภาษี ยืนยันกับกรมสรรพากร (สายด่วน 1161)
        ก่อนยื่นจริง
      </p>
    </>
  );
}
